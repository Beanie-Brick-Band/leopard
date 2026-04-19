#!/usr/bin/env bash
# backup.sh - Full backup of the leopard k8s cluster before tearing it down.
#
# What it backs up:
#   - All namespaced objects as YAML (deployments, statefulsets, services, ingresses,
#     configmaps, secrets, PVCs, serviceaccounts, roles, rolebindings, jobs, cronjobs,
#     certificates, issuers, ...), per namespace.
#   - All cluster-scoped objects (nodes, namespaces, PVs, clusterroles, clusterrolebindings,
#     clusterissuers, storageclasses, ingressclasses, customresourcedefinitions).
#   - PostgreSQL logical dump (pg_dumpall) from the `postgresql` StatefulSet in the coder ns.
#   - MinIO bucket mirror (all objects) from the `minio` ns via an in-cluster `mc` Job.
#   - Helm release manifests + values (helm get all) for every release, if `helm` is present.
#   - The raw kubeconfig used to take the backup.
#
# Output: ./backups/leopard-<timestamp>/ plus a leopard-<timestamp>.tar.gz archive.
#
# Requirements on your local machine:
#   - kubectl (pointed at the leopard cluster, or set KUBECONFIG=...)
#   - helm            (optional - only used if installed)
#   - tar, gzip, date, mktemp
#
# Usage:
#   cd infra/k8s
#   KUBECONFIG=/path/to/leopard-kubeconfig.yaml ./backup.sh
#
# Safety: this script is read-only against your cluster (aside from creating one
# short-lived backup Job in the `minio` namespace, which it cleans up on exit).

set -euo pipefail

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_BASE="${OUT_BASE:-$(pwd)/backups}"
OUT_DIR="${OUT_BASE}/leopard-${TS}"
ARCHIVE="${OUT_BASE}/leopard-${TS}.tar.gz"

mkdir -p "${OUT_DIR}"

log()  { printf '\033[1;36m[backup]\033[0m %s\n' "$*" >&2; }
warn() { printf '\033[1;33m[backup]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[backup]\033[0m %s\n' "$*" >&2; exit 1; }

command -v kubectl >/dev/null || die "kubectl not found on PATH"
kubectl cluster-info >/dev/null 2>&1 || die "kubectl cannot reach the cluster - check KUBECONFIG"

log "Backing up cluster to ${OUT_DIR}"
log "Server: $(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')"

# ---------------------------------------------------------------------------
# 0. Metadata
# ---------------------------------------------------------------------------
{
  echo "timestamp_utc: ${TS}"
  echo "kubectl_version: $(kubectl version --client=true 2>/dev/null | head -1)"
  echo "server_version: $(kubectl version 2>/dev/null | grep -i server || true)"
  echo "current_context: $(kubectl config current-context)"
  echo "server: $(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')"
} > "${OUT_DIR}/METADATA.yaml"

# Save a copy of the kubeconfig actually used (includes CA + client cert).
kubectl config view --raw --minify > "${OUT_DIR}/kubeconfig.yaml"
chmod 600 "${OUT_DIR}/kubeconfig.yaml"

# ---------------------------------------------------------------------------
# 1. Cluster-scoped resources
# ---------------------------------------------------------------------------
log "Dumping cluster-scoped resources"
mkdir -p "${OUT_DIR}/cluster"

cluster_kinds=(
  nodes
  namespaces
  persistentvolumes
  storageclasses.storage.k8s.io
  ingressclasses.networking.k8s.io
  customresourcedefinitions.apiextensions.k8s.io
  clusterroles.rbac.authorization.k8s.io
  clusterrolebindings.rbac.authorization.k8s.io
  clusterissuers.cert-manager.io
  apiservices.apiregistration.k8s.io
  mutatingwebhookconfigurations.admissionregistration.k8s.io
  validatingwebhookconfigurations.admissionregistration.k8s.io
)
for kind in "${cluster_kinds[@]}"; do
  if kubectl get "${kind}" >/dev/null 2>&1; then
    kubectl get "${kind}" -o yaml > "${OUT_DIR}/cluster/${kind%%.*}.yaml" 2>/dev/null \
      || warn "skip cluster kind ${kind}"
  fi
done

# ---------------------------------------------------------------------------
# 2. Per-namespace dump of every resource kind that has instances
# ---------------------------------------------------------------------------
log "Enumerating namespaces"
mapfile -t NAMESPACES < <(kubectl get ns -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | sort)

# Get every namespaced api-resource that supports 'get'.
mapfile -t NS_KINDS < <(
  kubectl api-resources --verbs=list --namespaced -o name 2>/dev/null \
    | grep -vE '^(events\.events\.k8s\.io|events)$' \
    | sort -u
)

for ns in "${NAMESPACES[@]}"; do
  log "  namespace: ${ns}"
  nsdir="${OUT_DIR}/namespaces/${ns}"
  mkdir -p "${nsdir}"

  # Per-resource dump. Skip kinds that return nothing to keep the tree small.
  for kind in "${NS_KINDS[@]}"; do
    out="${nsdir}/${kind//\//_}.yaml"
    if kubectl -n "${ns}" get "${kind}" --ignore-not-found -o yaml 2>/dev/null \
         | grep -q '^kind: List'; then
      # A List always has kind: List even when empty; check items length
      if kubectl -n "${ns}" get "${kind}" --ignore-not-found -o jsonpath='{.items[*].metadata.name}' 2>/dev/null \
           | grep -q .; then
        kubectl -n "${ns}" get "${kind}" -o yaml > "${out}" 2>/dev/null || true
      fi
    fi
  done

  # Decoded secrets (convenience - originals are already in secrets.yaml as base64).
  if kubectl -n "${ns}" get secrets -o name >/dev/null 2>&1; then
    mkdir -p "${nsdir}/_decoded-secrets"
    while IFS= read -r sec; do
      name="${sec#secret/}"
      kubectl -n "${ns}" get "${sec}" -o json 2>/dev/null | \
        python3 -c '
import json, sys, os, base64, pathlib
obj = json.load(sys.stdin)
out = pathlib.Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
for k, v in (obj.get("data") or {}).items():
    try:
        (out / k).write_bytes(base64.b64decode(v))
    except Exception as e:
        (out / (k + ".b64")).write_text(v)
' "${nsdir}/_decoded-secrets/${name}" 2>/dev/null || true
    done < <(kubectl -n "${ns}" get secrets -o name 2>/dev/null)
  fi
done

# ---------------------------------------------------------------------------
# 3. Helm releases
# ---------------------------------------------------------------------------
if command -v helm >/dev/null 2>&1; then
  log "Dumping Helm releases"
  mkdir -p "${OUT_DIR}/helm"
  helm ls -A -o json > "${OUT_DIR}/helm/releases.json" 2>/dev/null || true
  # helm ls prints a header on plain output; use json + python if available, otherwise parse columns.
  while IFS=$'\t' read -r name ns rev _; do
    [ -z "${name}" ] && continue
    rdir="${OUT_DIR}/helm/${ns}__${name}"
    mkdir -p "${rdir}"
    helm -n "${ns}" get values    "${name}" -a -o yaml > "${rdir}/values.yaml"      2>/dev/null || true
    helm -n "${ns}" get manifest  "${name}"            > "${rdir}/manifest.yaml"    2>/dev/null || true
    helm -n "${ns}" get notes     "${name}"            > "${rdir}/notes.txt"        2>/dev/null || true
    helm -n "${ns}" get hooks     "${name}"            > "${rdir}/hooks.yaml"       2>/dev/null || true
    helm -n "${ns}" get metadata  "${name}" -o yaml   > "${rdir}/metadata.yaml"    2>/dev/null || true
  done < <(helm ls -A --no-headers 2>/dev/null | awk -F'\t' '{print $1"\t"$2"\t"$3}')
else
  warn "helm not installed - skipping helm-release dump (manifests still captured via step 2)"
fi

# ---------------------------------------------------------------------------
# 4. PostgreSQL logical dump (coder database)
# ---------------------------------------------------------------------------
log "Dumping PostgreSQL from coder/postgresql"
pgdir="${OUT_DIR}/databases/postgresql"
mkdir -p "${pgdir}"

if kubectl -n coder get statefulset postgresql >/dev/null 2>&1; then
  PG_POD="$(kubectl -n coder get pod -l app.kubernetes.io/name=postgresql -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
  [ -z "${PG_POD:-}" ] && PG_POD="postgresql-0"

  PG_PW="$(kubectl -n coder get secret postgresql -o jsonpath='{.data.postgres-password}' 2>/dev/null | base64 -d || true)"
  if [ -z "${PG_PW}" ]; then
    PG_PW="$(kubectl -n coder get secret postgresql -o jsonpath='{.data.password}' 2>/dev/null | base64 -d || true)"
  fi

  if [ -z "${PG_PW}" ]; then
    warn "could not retrieve postgres password from secret coder/postgresql - trying without env"
  fi

  # pg_dumpall ensures we get roles + every db (includes 'coder' db).
  log "  pg_dumpall -> pg_dumpall.sql.gz"
  kubectl -n coder exec "${PG_POD}" -- bash -lc \
    "PGPASSWORD='${PG_PW}' pg_dumpall -U postgres --clean --if-exists" \
    | gzip -9 > "${pgdir}/pg_dumpall.sql.gz" || warn "pg_dumpall failed"

  # Also take a focused, clean dump of the coder db in custom format (easier to restore selectively).
  log "  pg_dump coder (custom format) -> coder.dump"
  kubectl -n coder exec "${PG_POD}" -- bash -lc \
    "PGPASSWORD='${PG_PW}' pg_dump -U coder -d coder -Fc --no-owner --no-privileges" \
    > "${pgdir}/coder.dump" || warn "pg_dump coder (custom) failed"

  # And a plain-SQL version for readability.
  log "  pg_dump coder (plain SQL) -> coder.sql.gz"
  kubectl -n coder exec "${PG_POD}" -- bash -lc \
    "PGPASSWORD='${PG_PW}' pg_dump -U coder -d coder --no-owner --no-privileges" \
    | gzip -9 > "${pgdir}/coder.sql.gz" || warn "pg_dump coder (plain) failed"
else
  warn "coder/postgresql statefulset not found - skipping PG dump"
fi

# ---------------------------------------------------------------------------
# 5. MinIO bucket mirror (starter-codes)
# ---------------------------------------------------------------------------
log "Mirroring MinIO buckets from ns=minio"
miniodir="${OUT_DIR}/object-storage/minio"
mkdir -p "${miniodir}"

if kubectl get ns minio >/dev/null 2>&1; then
  # Read credentials from the existingSecret referenced in minio-values.yml
  MIN_SEC="$(kubectl -n minio get secret minio-credentials -o json 2>/dev/null || true)"
  if [ -n "${MIN_SEC}" ]; then
    MIN_USER="$(echo "${MIN_SEC}" | python3 -c 'import json,sys,base64;d=json.load(sys.stdin)["data"];print(base64.b64decode(d.get("rootUser") or d.get("accesskey") or d.get("MINIO_ROOT_USER") or "").decode())')"
    MIN_PASS="$(echo "${MIN_SEC}" | python3 -c 'import json,sys,base64;d=json.load(sys.stdin)["data"];print(base64.b64decode(d.get("rootPassword") or d.get("secretkey") or d.get("MINIO_ROOT_PASSWORD") or "").decode())')"
  else
    warn "secret minio/minio-credentials not found - MinIO mirror will be skipped unless MIN_USER/MIN_PASS are exported"
    MIN_USER="${MIN_USER:-}"
    MIN_PASS="${MIN_PASS:-}"
  fi

  # Method A: port-forward + local `mc` (preferred - no in-cluster resources created).
  if command -v mc >/dev/null 2>&1 && [ -n "${MIN_USER}" ] && [ -n "${MIN_PASS}" ]; then
    log "  using local 'mc' via kubectl port-forward"
    kubectl -n minio port-forward svc/minio 9123:9000 >/dev/null 2>&1 &
    PF_PID=$!
    trap 'kill ${PF_PID} 2>/dev/null || true' EXIT
    sleep 3
    mc alias set leopard-backup http://127.0.0.1:9123 "${MIN_USER}" "${MIN_PASS}" >/dev/null
    # Mirror every bucket
    while IFS= read -r bucket; do
      [ -z "${bucket}" ] && continue
      bucket_name="${bucket##*/}"
      log "    mirror bucket: ${bucket_name}"
      mkdir -p "${miniodir}/${bucket_name}"
      mc mirror --quiet "leopard-backup/${bucket_name}" "${miniodir}/${bucket_name}" || warn "mirror ${bucket_name} failed"
    done < <(mc ls leopard-backup 2>/dev/null | awk '{print $NF}')
    mc alias remove leopard-backup >/dev/null 2>&1 || true
    kill ${PF_PID} 2>/dev/null || true
    trap - EXIT
  else
    # Method B: spin up a one-shot Job inside the cluster that runs `mc mirror` and tars output,
    # then `kubectl cp` the tarball out. Slower but needs no local tools.
    warn "  local 'mc' not available - running in-cluster backup Job (requires internet access for the job's image pull)"
    JOB_NAME="leopard-minio-backup-${TS,,}"
    cat <<EOF | kubectl -n minio apply -f - >/dev/null
apiVersion: batch/v1
kind: Job
metadata:
  name: ${JOB_NAME}
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: mc
          image: minio/mc:latest
          env:
            - name: MC_HOST_leopard
              value: "http://${MIN_USER}:${MIN_PASS}@minio.minio.svc.cluster.local:9000"
          command:
            - sh
            - -c
            - |
              set -e
              mkdir -p /out
              for b in \$(mc ls leopard | awk '{print \$NF}' | tr -d /); do
                echo "mirror \$b"
                mkdir -p "/out/\$b"
                mc mirror --quiet "leopard/\$b" "/out/\$b" || true
              done
              cd /out && tar -cf /tmp/minio-backup.tar . && sleep 3600
EOF
    log "  waiting for Job pod ..."
    kubectl -n minio wait --for=condition=Ready pod -l job-name="${JOB_NAME}" --timeout=180s || true
    POD="$(kubectl -n minio get pod -l job-name="${JOB_NAME}" -o jsonpath='{.items[0].metadata.name}')"
    # Wait for the tarball to exist
    for _ in $(seq 1 60); do
      if kubectl -n minio exec "${POD}" -- test -f /tmp/minio-backup.tar 2>/dev/null; then
        break
      fi
      sleep 5
    done
    kubectl -n minio cp "${POD}:/tmp/minio-backup.tar" "${miniodir}/minio-backup.tar" || warn "kubectl cp failed"
    kubectl -n minio delete job "${JOB_NAME}" --wait=false >/dev/null 2>&1 || true
    if [ -f "${miniodir}/minio-backup.tar" ]; then
      ( cd "${miniodir}" && tar -xf minio-backup.tar && rm -f minio-backup.tar )
    fi
  fi
else
  warn "namespace 'minio' not found - skipping MinIO mirror"
fi

# ---------------------------------------------------------------------------
# 6. Persistent volume metadata & mount info (does NOT copy raw PV data -
#    those blocks live on the Civo CSI disks. The PG + MinIO logical dumps
#    above are the actually-useful data snapshots. This section just records
#    what the PVs were, so if you later spin up a new cluster + restore the
#    dumps the storage shapes are known.)
# ---------------------------------------------------------------------------
log "Recording PV/PVC shapes"
mkdir -p "${OUT_DIR}/storage"
kubectl get pv -o yaml  > "${OUT_DIR}/storage/persistentvolumes.yaml"  2>/dev/null || true
kubectl get pvc -A -o yaml > "${OUT_DIR}/storage/persistentvolumeclaims.yaml" 2>/dev/null || true
kubectl get sc -o yaml  > "${OUT_DIR}/storage/storageclasses.yaml"   2>/dev/null || true

# ---------------------------------------------------------------------------
# 7. Final archive
# ---------------------------------------------------------------------------
log "Creating archive ${ARCHIVE}"
( cd "${OUT_BASE}" && tar -czf "leopard-${TS}.tar.gz" "leopard-${TS}" )

log "Done."
log "  Tree:    ${OUT_DIR}"
log "  Archive: ${ARCHIVE}"
log ""
log "Archive size: $(du -h "${ARCHIVE}" | cut -f1)"
log ""
log "Next: move ${ARCHIVE} somewhere durable (another disk / S3 / Drive) before"
log "deleting the Civo cluster. See infra/k8s/RESTORE.md for how to re-deploy."
