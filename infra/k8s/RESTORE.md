# Leopard cluster: backup & restore

This directory contains everything needed to capture the running Civo cluster
(hostname `leopard`, API `https://212.2.242.15:6443`) before tearing it down,
and to bring an equivalent cluster back later.

## What lives on the cluster

Four logical workloads (from `helmfile.k3s.yml`):

| Namespace      | Workload          | Stateful? | What's in it |
| -------------- | ----------------- | --------- | --- |
| `cert-manager` | cert-manager      | no        | Let's Encrypt ACME account keys are in secrets - worth backing up to avoid rate-limit on re-issue. |
| `coder`        | PostgreSQL (bitnami StatefulSet) | **yes** | All Coder state: users, templates, workspaces, tokens, audit log. |
| `coder`        | Coder v2.28.0     | no        | Stateless app - config is in ConfigMaps/Secrets (`coder-db-url`). |
| `minio`        | MinIO standalone  | **yes**   | `starter-codes` bucket - starter code uploads for assignments. |
| `workspaces`   | (ephemeral)       | no        | Per-student workspace Pods/PVCs. Short-lived; not worth backing up. |

All ingress traffic lands on Traefik (k3s built-in) and is TLS-terminated via
cert-manager + Let's Encrypt (`letsencrypt-prod` ClusterIssuer).

## Take a backup

```sh
export KUBECONFIG=/path/to/leopard-kubeconfig.yaml
cd infra/k8s
./backup.sh
```

Output:

```
infra/k8s/backups/leopard-<timestamp>/
  METADATA.yaml
  kubeconfig.yaml                       # the exact kubeconfig used
  cluster/                              # cluster-scoped resources (PVs, CRDs, CIs, ...)
  namespaces/<ns>/<kind>.yaml           # every namespaced kind, per namespace
  namespaces/<ns>/_decoded-secrets/     # base64-decoded secret values (handy for reuse)
  helm/<ns>__<release>/                 # helm get values/manifest/notes/hooks/metadata
  databases/postgresql/
    pg_dumpall.sql.gz                   # full cluster dump (roles + all DBs)
    coder.dump                          # pg_dump -Fc of the coder DB
    coder.sql.gz                        # same, plain SQL
  object-storage/minio/<bucket>/...     # mirrored bucket contents (starter-codes)
  storage/persistentvolumes.yaml        # PV/PVC/StorageClass shapes
infra/k8s/backups/leopard-<timestamp>.tar.gz
```

The script is **read-only** against your cluster apart from (optionally) a
short-lived `minio/leopard-minio-backup-*` Job it cleans up, used only if you
don't have `mc` installed locally (with `mc` present it just port-forwards).

**Before deleting the cluster, move `leopard-<timestamp>.tar.gz` somewhere
durable** (another disk, S3, Google Drive, etc.). The `_decoded-secrets`
directory contains plaintext secrets - protect the archive accordingly.

## Tear the cluster down

Once you have the archive saved off-cluster:

1. On the Civo dashboard → Kubernetes → `leopard` → Delete cluster.
2. Delete the associated firewall and any unused volumes.
3. (Optional) Release the reserved IP `212.2.242.15` if it's reserved.

## Restore into a new cluster

### 1. Bring up a new k3s-compatible cluster

Re-create a cluster of similar shape (Civo k3s, DigitalOcean, a fresh k3s on
your own box, etc.). Point your DNS records:

```
A  coder.tryleopard.dev      → <new cluster IP>
A  *.coder.tryleopard.dev    → <new cluster IP>
A  minio.tryleopard.dev      → <new cluster IP>
A  minio-console.tryleopard.dev → <new cluster IP>
```

### 2. Install the stack fresh

```sh
export KUBECONFIG=/path/to/new-kubeconfig.yaml
cd infra/k8s
./deploy-k3s.sh
```

This runs the same Helmfile (`helmfile.k3s.yml`) that produced the original
cluster: cert-manager + PostgreSQL + Coder + MinIO.

### 3. Restore PostgreSQL (the important part)

```sh
BACKUP=infra/k8s/backups/leopard-<timestamp>
PG_POD=$(kubectl -n coder get pod -l app.kubernetes.io/name=postgresql -o jsonpath='{.items[0].metadata.name}')

# Stop coder so no writes happen while we restore
kubectl -n coder scale deploy/coder --replicas=0

# Drop & recreate the coder DB
PG_PW=$(kubectl -n coder get secret postgresql -o jsonpath='{.data.postgres-password}' | base64 -d)
kubectl -n coder exec -i "$PG_POD" -- env PGPASSWORD="$PG_PW" \
  psql -U postgres -c "DROP DATABASE IF EXISTS coder;" -c "CREATE DATABASE coder OWNER coder;"

# Restore from the custom-format dump
kubectl -n coder exec -i "$PG_POD" -- env PGPASSWORD="$PG_PW" \
  pg_restore -U postgres -d coder --clean --if-exists --no-owner --no-privileges \
  < "$BACKUP/databases/postgresql/coder.dump"

# Bring coder back up
kubectl -n coder scale deploy/coder --replicas=1
kubectl -n coder rollout status deploy/coder
```

If you prefer the plain-SQL dump:

```sh
gunzip -c "$BACKUP/databases/postgresql/coder.sql.gz" | \
  kubectl -n coder exec -i "$PG_POD" -- env PGPASSWORD="$PG_PW" \
  psql -U coder -d coder
```

### 4. Restore MinIO bucket contents

```sh
kubectl -n minio port-forward svc/minio 9123:9000 &
PF=$!; sleep 3

MIN_USER=$(kubectl -n minio get secret minio-credentials -o jsonpath='{.data.rootUser}' | base64 -d)
MIN_PASS=$(kubectl -n minio get secret minio-credentials -o jsonpath='{.data.rootPassword}' | base64 -d)
mc alias set leopard-new http://127.0.0.1:9123 "$MIN_USER" "$MIN_PASS"

# Ensure bucket exists (helmfile already creates 'starter-codes' but make mirror idempotent)
mc mb --ignore-existing leopard-new/starter-codes

mc mirror "$BACKUP/object-storage/minio/starter-codes" leopard-new/starter-codes

kill $PF
```

### 5. Re-attach secrets you want verbatim (optional)

If you want to re-use the *exact* Let's Encrypt account key (to avoid
re-issuing and hitting ACME rate limits), apply just that one secret from the
backup before cert-manager starts issuing new certs:

```sh
kubectl apply -f "$BACKUP/namespaces/cert-manager/secrets.yaml"
```

Coder's own DB connection secret (`coder-db-url`) is re-created by
`deploy-k3s.sh`, so you do not need to restore it.

## Sanity checks after restore

```sh
kubectl -n coder get pods
kubectl -n coder logs deploy/coder --tail=50
kubectl -n coder exec -it deploy/coder -- coder users list      # should show prior users
kubectl -n minio exec -it deploy/minio -- mc ls local/starter-codes  # should show uploads
```

## Notes

- The workspace Pods/PVCs in the `workspaces` namespace are deliberately not
  backed up - they're recreated on demand by Coder from the templates in
  `infra/coder-templates/`.
- The original Civo kubeconfig is saved into the backup at `kubeconfig.yaml`
  for reference, but after the cluster is deleted the embedded certs are
  useless. Treat the archive as sensitive regardless.
- The GKE deployment in `gke-deployment.yml` is an older/alternate target and
  is not what's running on Civo; the Helmfile path is authoritative.
