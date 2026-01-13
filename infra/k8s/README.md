# Kubernetes Setup for Coder

This directory contains Kubernetes/Helm configurations for deploying Coder.

## Files

- `helmfile.yml` - Production Helmfile configuration
- `helmfile.local.yml` - Local development Helmfile (for minikube)
- `values.yml` - Production values for Coder
- `values.local.yml` - Local development values
- `rbac.yml` - RBAC configuration for workspace management
- `ssl.yml` - SSL/TLS configuration (production only)

## Local Development with Minikube

### Prerequisites

```bash
brew install minikube helmfile helm
```

### Quick Start

1. **Run the setup script:**

   ```bash
   cd infra/k8s
   chmod +x setup-minikube.sh
   ./setup-minikube.sh
   ```

2. **Add to `/etc/hosts`:**

   ```bash
   echo "$(minikube ip) coder.local" | sudo tee -a /etc/hosts
   ```

3. **Access Coder:**
   Open http://coder.local in your browser

### Manual Setup

If you prefer manual setup:

1. **Start Minikube:**

   ```bash
   minikube start --cpus=4 --memory=8192 --disk-size=50g
   ```

2. **Enable ingress:**

   ```bash
   minikube addons enable ingress
   ```

3. **Create namespaces:**

   ```bash
   kubectl create namespace coder
   kubectl create namespace workspaces
   ```

4. **Apply RBAC:**

   ```bash
   kubectl apply -f rbac.yml
   ```

5. **Deploy with Helmfile:**

   ```bash
   helmfile -f helmfile.local.yml sync
   ```

6. **Update `/etc/hosts`:**
   ```bash
   echo "$(minikube ip) coder.local" | sudo tee -a /etc/hosts
   ```

### Useful Commands

**Check deployment status:**

```bash
kubectl get pods -n coder
kubectl get svc -n coder
```

**View Coder logs:**

```bash
kubectl logs -f deployment/coder -n coder
```

**Access PostgreSQL:**

```bash
kubectl exec -it deployment/postgresql -n coder -- psql -U coder
```

**Port forward (alternative to ingress):**

```bash
kubectl port-forward svc/coder -n coder 8080:80
# Access at http://localhost:8080
```

**Clean up:**

```bash
helmfile -f helmfile.local.yml destroy
kubectl delete namespace coder workspaces
```

**Stop minikube:**

```bash
minikube stop
```

### Troubleshooting

**Ingress not working:**

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Get service URL directly
minikube service coder -n coder --url
```

**PostgreSQL connection issues:**

```bash
# Check PostgreSQL status
kubectl get pods -n coder | grep postgresql

# View PostgreSQL logs
kubectl logs deployment/postgresql -n coder
```

**Resource issues:**

```bash
# Check node resources
kubectl top nodes
kubectl top pods -n coder

# Restart minikube with more resources
minikube delete
minikube start --cpus=6 --memory=12288
```

## Production Deployment

For production deployment on a real cluster:

```bash
helmfile -f helmfile.yml sync
```

Make sure to:

1. Update the domain in `values.yml`
2. Configure proper SSL certificates
3. Set up external PostgreSQL (recommended)
4. Review resource limits
5. Configure backup strategy
