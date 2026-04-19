# Leopard K8s Backup — 2026-04-19

Cluster: `leopard` on Civo. Backed up before teardown.

## Contents

- `db/coder.sql` — plain SQL pg_dump of Coder database (86 tables, 52M)
- `db/coder.dump` — custom-format pg_dump (6.7M, smaller for restore)
- `minio/starter-codes/` — mirror of MinIO bucket (51 objects, 1.3M)
- `helm-values-live/` — `helm get values` output for each live release (source of truth)
- `manifests/` — secrets, ingresses, clusterissuers, RBAC, namespaces as YAML

## Source of truth for redeploy

The repo's `infra/k8s/values.yml` has drift from live. Use `helm-values-live/coder.yaml` as the authoritative reference. Notable live-only settings:
- `CODER_WILDCARD_ACCESS_URL=*.coder.tryleopard.dev`
- `CODER_MAX_TOKEN_LIFETIME=8760h`
- `CODER_MAX_ADMIN_TOKEN_LIFETIME=8760h`
- `ingress.wildcardHost=*.coder.tryleopard.dev`

Repo file also wraps values under a `coder:` key that the chart doesn't expect — the live values are flat.

## DNS

Pointed at Civo LB `d99ed1d5-f08b-4d79-8349-9ad72a29954f.k8s.civo.com`:
- coder.tryleopard.dev
- *.coder.tryleopard.dev (wildcard)
- minio.tryleopard.dev
- minio-console.tryleopard.dev

You'll need to repoint DNS at the new LB after redeploy.

## Restore outline

1. Provision new cluster, install helmfile deps, apply `infra/k8s/` with live values merged in.
2. Wait for postgresql pod ready, then:
   ```
   kubectl cp db/coder.dump coder/postgresql-0:/tmp/coder.dump
   kubectl exec -n coder postgresql-0 -- bash -c 'PGPASSWORD=$POSTGRES_PASSWORD pg_restore -U postgres -d coder --clean --if-exists /tmp/coder.dump'
   ```
3. Mirror MinIO back:
   ```
   kubectl port-forward -n minio svc/minio 19000:9000 &
   mc alias set restore http://localhost:19000 <rootUser> <rootPassword>
   mc mb restore/starter-codes
   mc mirror minio/starter-codes restore/starter-codes
   ```
4. Restart coder deployment so it picks up restored DB state.

## Secrets (DO NOT COMMIT)

`manifests/*.yaml` contains live secret values (base64). Credentials are also present in `helm-values-live/`. This whole directory stays local — never push to GitHub.
