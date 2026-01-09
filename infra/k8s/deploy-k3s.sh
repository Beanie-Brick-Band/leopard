#!/bin/bash
set -e

# Coder deployment script for k3s
# Deploys Coder with PostgreSQL and cert-manager on a k3s cluster
# Idempotent - safe to run multiple times

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
CODER_NAMESPACE="coder"
WORKSPACES_NAMESPACE="workspaces"
CERT_MANAGER_NAMESPACE="cert-manager"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-coderpassword}"
POSTGRES_USER="coder"
POSTGRES_DB="coder"

# Ensure gum is installed
if ! command -v gum &>/dev/null; then
    echo "Installing gum..."
    if command -v brew &>/dev/null; then
        brew install gum
    else
        echo "Error: brew is required to install gum. Please install Homebrew first."
        exit 1
    fi
fi

# Styling
SUCCESS_COLOR="212"
WARN_COLOR="214"
INFO_COLOR="81"
SKIP_COLOR="245"

log_info() { gum log --level info "$1"; }
log_warn() { gum log --level warn "$1"; }
log_error() { gum log --level error "$1"; }
log_success() { gum style --foreground "$SUCCESS_COLOR" "✓ $1"; }
log_skip() { gum style --foreground "$SKIP_COLOR" "○ $1 (already exists)"; }

print_header() {
    gum style --border double --border-foreground "$INFO_COLOR" --padding "1 2" --margin "1" --align center --bold "$1"
}

print_section() {
    echo ""
    gum style --foreground "$INFO_COLOR" --bold "▸ $1"
}

# Handle uninstall
if [[ "${1:-}" =~ ^(uninstall|destroy)$ ]]; then
    print_header "Uninstalling Coder"

    if ! gum confirm "Are you sure you want to uninstall Coder?"; then
        log_info "Uninstall cancelled"
        exit 0
    fi

    log_warn "Uninstalling Coder deployment..."

    gum spin --spinner dot --title "Running helmfile destroy..." -- \
        bash -c "helmfile -f helmfile.k3s.yml destroy 2>/dev/null || true"

    gum spin --spinner dot --title "Deleting namespace: $CODER_NAMESPACE" -- \
        kubectl delete namespace "$CODER_NAMESPACE" --ignore-not-found

    gum spin --spinner dot --title "Deleting namespace: $WORKSPACES_NAMESPACE" -- \
        kubectl delete namespace "$WORKSPACES_NAMESPACE" --ignore-not-found

    gum spin --spinner dot --title "Deleting ClusterIssuer..." -- \
        kubectl delete clusterissuer letsencrypt-prod --ignore-not-found

    log_success "Uninstall complete"
    exit 0
fi

# Handle status check
if [[ "${1:-}" == "status" ]]; then
    print_header "Coder Deployment Status"

    print_section "Cluster Nodes"
    kubectl get nodes -o wide

    print_section "Pods in coder namespace"
    kubectl get pods -n "$CODER_NAMESPACE" 2>/dev/null || echo "No pods found"

    print_section "Services in coder namespace"
    kubectl get svc -n "$CODER_NAMESPACE" 2>/dev/null || echo "No services found"

    print_section "Ingress"
    kubectl get ingress -n "$CODER_NAMESPACE" 2>/dev/null || echo "No ingress found"

    exit 0
fi

# =============================================================================
# Main deployment
# =============================================================================

print_header "Coder Deployment for k3s"

gum style --faint "This will deploy Coder with PostgreSQL and cert-manager"
gum style --faint "Safe to run multiple times - existing resources will be skipped"
echo ""

if ! gum confirm "Continue with deployment?"; then
    log_info "Deployment cancelled"
    exit 0
fi

# -----------------------------------------------------------------------------
# Check prerequisites
# -----------------------------------------------------------------------------
print_section "Checking prerequisites"

missing=()
command -v kubectl &>/dev/null || missing+=("kubectl")
command -v helm &>/dev/null || missing+=("helm")
command -v helmfile &>/dev/null || missing+=("helmfile")

if [ ${#missing[@]} -ne 0 ]; then
    log_error "Missing required tools: ${missing[*]}"
    gum style --foreground "$WARN_COLOR" "Install with: brew install ${missing[*]}"
    exit 1
fi

if ! kubectl cluster-info &>/dev/null; then
    log_error "Cannot connect to Kubernetes cluster. Check your kubeconfig."
    exit 1
fi

log_success "All prerequisites satisfied"

# -----------------------------------------------------------------------------
# Create namespaces
# -----------------------------------------------------------------------------
print_section "Creating namespaces"

for ns in "$CODER_NAMESPACE" "$WORKSPACES_NAMESPACE" "$CERT_MANAGER_NAMESPACE"; do
    if kubectl get namespace "$ns" &>/dev/null; then
        log_skip "Namespace $ns"
    else
        gum spin --spinner dot --title "Creating namespace: $ns" -- kubectl create namespace "$ns"
        log_success "Namespace $ns created"
    fi
done

# -----------------------------------------------------------------------------
# Ensure IngressClass exists
# -----------------------------------------------------------------------------
print_section "Ensuring Traefik IngressClass exists"

if kubectl get ingressclass traefik &>/dev/null; then
    log_skip "IngressClass traefik"
else
    cat <<EOF | kubectl apply -f - &>/dev/null
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: traefik
  annotations:
    ingressclass.kubernetes.io/is-default-class: "true"
spec:
  controller: traefik.io/ingress-controller
EOF
    log_success "IngressClass created"
fi

# -----------------------------------------------------------------------------
# Deploy with Helmfile
# -----------------------------------------------------------------------------
print_section "Deploying with Helmfile"

gum spin --spinner globe --title "Adding Helm repositories..." -- bash -c '
    helm repo add jetstack https://charts.jetstack.io 2>/dev/null || true
    helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || true
    helm repo add coder-v2 https://helm.coder.com/v2 2>/dev/null || true
    helm repo update >/dev/null 2>&1
'

log_info "Running helmfile sync (this may take a few minutes)..."
helmfile -f helmfile.k3s.yml sync

log_success "Helmfile deployment complete"

# -----------------------------------------------------------------------------
# Wait for PostgreSQL
# -----------------------------------------------------------------------------
print_section "Waiting for PostgreSQL"

if ! kubectl get statefulset postgresql -n "$CODER_NAMESPACE" &>/dev/null; then
    log_warn "PostgreSQL statefulset not found - it may not have been deployed yet"
else
    ready=$(kubectl get statefulset postgresql -n "$CODER_NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    desired=$(kubectl get statefulset postgresql -n "$CODER_NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")

    if [ "$ready" = "$desired" ] && [ "$ready" != "0" ]; then
        log_skip "PostgreSQL already ready"
    else
        gum spin --spinner pulse --title "Waiting for PostgreSQL to be ready..." -- \
            kubectl rollout status statefulset/postgresql -n "$CODER_NAMESPACE" --timeout=300s
        log_success "PostgreSQL is ready"
    fi
fi

# -----------------------------------------------------------------------------
# Create database connection secret
# -----------------------------------------------------------------------------
print_section "Creating database connection secret"

if ! kubectl get secret postgresql -n "$CODER_NAMESPACE" &>/dev/null; then
    log_warn "PostgreSQL secret not found - skipping database secret creation"
else
    pg_password=$(kubectl get secret postgresql -n "$CODER_NAMESPACE" -o jsonpath='{.data.password}' 2>/dev/null | base64 -d)

    if [ -z "$pg_password" ]; then
        log_warn "Could not retrieve PostgreSQL password - skipping database secret creation"
    else
        db_url="postgres://${POSTGRES_USER}:${pg_password}@postgresql.${CODER_NAMESPACE}.svc.cluster.local:5432/${POSTGRES_DB}?sslmode=disable"

        if kubectl get secret coder-db-url -n "$CODER_NAMESPACE" &>/dev/null; then
            existing_url=$(kubectl get secret coder-db-url -n "$CODER_NAMESPACE" -o jsonpath='{.data.url}' 2>/dev/null | base64 -d)
            if [ "$existing_url" = "$db_url" ]; then
                log_skip "Database secret coder-db-url"
            else
                log_info "Updating database secret with new credentials..."
                kubectl create secret generic coder-db-url \
                    --from-literal=url="$db_url" \
                    -n "$CODER_NAMESPACE" \
                    --dry-run=client -o yaml | kubectl apply -f - >/dev/null
                log_success "Database secret updated"
            fi
        else
            gum spin --spinner dot --title "Creating database secret..." -- bash -c "
                kubectl create secret generic coder-db-url \
                    --from-literal=url='$db_url' \
                    -n '$CODER_NAMESPACE' >/dev/null
            "
            log_success "Database secret created"
        fi
    fi
fi

# -----------------------------------------------------------------------------
# Apply RBAC
# -----------------------------------------------------------------------------
print_section "Applying RBAC configuration"

if [ ! -f "rbac.yml" ]; then
    log_warn "rbac.yml not found - skipping RBAC configuration"
else
    gum spin --spinner dot --title "Applying RBAC..." -- kubectl apply -f rbac.yml
    log_success "RBAC applied"
fi

# -----------------------------------------------------------------------------
# Setup cert-manager ClusterIssuer
# -----------------------------------------------------------------------------
print_section "Setting up cert-manager"

if kubectl get clusterissuer letsencrypt-prod &>/dev/null; then
    log_skip "ClusterIssuer letsencrypt-prod"
elif ! kubectl get deployment cert-manager -n "$CERT_MANAGER_NAMESPACE" &>/dev/null; then
    log_warn "cert-manager not deployed - skipping ClusterIssuer creation"
else
    # Wait for cert-manager if not ready
    ready=$(kubectl get deployment cert-manager -n "$CERT_MANAGER_NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    desired=$(kubectl get deployment cert-manager -n "$CERT_MANAGER_NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")

    if [ "$ready" != "$desired" ] || [ "$ready" = "0" ]; then
        gum spin --spinner pulse --title "Waiting for cert-manager to be ready..." -- \
            kubectl rollout status deployment/cert-manager -n "$CERT_MANAGER_NAMESPACE" --timeout=300s
    fi

    ready=$(kubectl get deployment cert-manager-webhook -n "$CERT_MANAGER_NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    desired=$(kubectl get deployment cert-manager-webhook -n "$CERT_MANAGER_NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")

    if [ "$ready" != "$desired" ] || [ "$ready" = "0" ]; then
        gum spin --spinner pulse --title "Waiting for cert-manager-webhook to be ready..." -- \
            kubectl rollout status deployment/cert-manager-webhook -n "$CERT_MANAGER_NAMESPACE" --timeout=300s
    fi

    gum spin --spinner dot --title "Waiting for webhook to initialize..." -- sleep 10

    log_info "Applying ClusterIssuer for Let's Encrypt..."

    cat <<EOF | kubectl apply -f - &>/dev/null
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: ahmadinejadarian@gmail.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: traefik
EOF

    log_success "ClusterIssuer applied"
fi

# -----------------------------------------------------------------------------
# Ensure Coder is running
# -----------------------------------------------------------------------------
print_section "Ensuring Coder is running"

if ! kubectl get deployment coder -n "$CODER_NAMESPACE" &>/dev/null; then
    log_warn "Coder deployment not found - it may not have been deployed yet"
else
    ready=$(kubectl get deployment coder -n "$CODER_NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    desired=$(kubectl get deployment coder -n "$CODER_NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")

    if [ "$ready" = "$desired" ] && [ "$ready" != "0" ]; then
        log_skip "Coder already running and ready"
    else
        kubectl rollout restart deployment/coder -n "$CODER_NAMESPACE" 2>/dev/null || true

        gum spin --spinner pulse --title "Waiting for Coder to be ready..." -- bash -c "
            sleep 5
            kubectl rollout status deployment/coder -n '$CODER_NAMESPACE' --timeout=300s
        "
        log_success "Coder is ready"
    fi
fi

# -----------------------------------------------------------------------------
# DNS Configuration
# -----------------------------------------------------------------------------
print_section "DNS Configuration"

# Get external IP
external_ip=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}' 2>/dev/null)
if [ -z "$external_ip" ]; then
    external_ip=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null)
fi

if [ -z "$external_ip" ]; then
    log_error "Could not determine cluster IP address"
    log_warn "Please manually configure DNS to point to your cluster"
else
    # Check if DNS already configured
    resolved_ip=$(dig +short coder.nolapse.tech 2>/dev/null | head -1)

    if [ "$resolved_ip" = "$external_ip" ]; then
        log_skip "DNS already configured correctly (coder.nolapse.tech → $external_ip)"
    else
        echo ""
        gum style \
            --border rounded \
            --border-foreground "$WARN_COLOR" \
            --padding "1 2" \
            --margin "1" \
            --align left \
            "$(gum style --bold --foreground "$WARN_COLOR" "ACTION REQUIRED: Configure DNS Records")

Your cluster IP address is: $(gum style --bold --foreground "$SUCCESS_COLOR" "$external_ip")

Please create the following DNS records:

  $(gum style --foreground "$INFO_COLOR" "A record:")  coder.nolapse.tech      →  $(gum style --bold "$external_ip")
  $(gum style --foreground "$INFO_COLOR" "A record:")  *.coder.nolapse.tech    →  $(gum style --bold "$external_ip")

$(gum style --faint "These records are required for HTTPS certificates to work correctly.")"

        echo ""
        log_info "Waiting for you to configure DNS records..."
        echo ""

        if gum confirm --affirmative "I've configured DNS" --negative "Skip for now" "Have you configured the DNS records above?"; then
            log_success "DNS configuration confirmed"

            echo ""
            if gum confirm "Would you like to verify DNS propagation?"; then
                print_section "Verifying DNS propagation"

                gum spin --spinner dot --title "Checking DNS for coder.nolapse.tech..." -- sleep 2

                resolved_ip=$(dig +short coder.nolapse.tech 2>/dev/null | head -1)

                if [ "$resolved_ip" = "$external_ip" ]; then
                    log_success "DNS is correctly configured! coder.nolapse.tech resolves to $resolved_ip"
                elif [ -n "$resolved_ip" ]; then
                    log_warn "DNS resolves to $resolved_ip but expected $external_ip"
                    gum style --foreground "$WARN_COLOR" "DNS may still be propagating. This can take up to 48 hours."
                else
                    log_warn "DNS not yet propagated for coder.nolapse.tech"
                    gum style --foreground "$WARN_COLOR" "DNS propagation can take up to 48 hours."
                fi
            fi
        else
            log_warn "DNS configuration skipped"
            gum style --foreground "$WARN_COLOR" "Remember to configure DNS later, or certificates won't work!"
            echo ""
        fi
    fi
fi

# -----------------------------------------------------------------------------
# Show final status
# -----------------------------------------------------------------------------
print_header "Deployment Complete!"

print_section "Cluster Nodes"
kubectl get nodes -o wide

print_section "Pods in coder namespace"
kubectl get pods -n "$CODER_NAMESPACE" 2>/dev/null || echo "No pods found"

print_section "Services in coder namespace"
kubectl get svc -n "$CODER_NAMESPACE" 2>/dev/null || echo "No services found"

print_section "Ingress"
kubectl get ingress -n "$CODER_NAMESPACE" 2>/dev/null || echo "No ingress found"

echo ""
gum style \
    --border rounded \
    --border-foreground "$SUCCESS_COLOR" \
    --padding "1 2" \
    --margin "1" \
    "$(gum style --bold "Access Coder")

Once DNS has propagated, access Coder at:
  $(gum style --foreground "$SUCCESS_COLOR" "https://coder.nolapse.tech")

$(gum style --faint "Useful commands:")
  Check certificate: kubectl get certificate -n $CODER_NAMESPACE
  View Coder logs:   kubectl logs -f deployment/coder -n $CODER_NAMESPACE"
