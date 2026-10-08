# Infrastructure

**Kubernetes deployment tools and cloud infrastructure configuration for the codebase.**

> For detailed architecture, deployment patterns, Helm chart configuration, and troubleshooting, see [AGENTS.md](AGENTS.md).

## Contents

| Directory                                  | Purpose                                                        |
| ------------------------------------------ | -------------------------------------------------------------- |
| [helm/kubernetes-job](helm/kubernetes-job) | Reusable Helm chart for batch job deployments with PVC storage |
| [terraform/](terraform)                    | Linode LKE (Kubernetes) cluster provisioning                   |

## Quick Start

### Deploy Application with Helm

```bash
# Build, push, and deploy
nx run caelundas-cli:docker-build
nx run caelundas-cli:docker-push
nx run caelundas-cli:helm-upgrade
# → Release name: caelundas-20260125-143022

# Monitor and retrieve output
kubectl get jobs -l app.kubernetes.io/name=caelundas -w
nx run caelundas-cli:kubernetes-copy-files -- --release-name=caelundas-20260125-143022

# Clean up
nx run caelundas-cli:helm-uninstall -- --release-name=caelundas-20260125-143022
```

### Provision Kubernetes Cluster

```bash
cd infrastructure/terraform
terraform init
terraform plan -var="linode_token=$LINODE_API_TOKEN"
terraform apply -var="linode_token=$LINODE_API_TOKEN"
```

## Deployment Pipeline

```text
Code → Docker Build → Push to GHCR → Helm Upgrade → K8s Job → Retrieve Output
```

1. **Build**: `nx run <app>:docker-build` (linux/amd64 platform)
2. **Push**: `nx run <app>:docker-push` (to GHCR)
3. **Secret**: `kubectl apply -f <app>/kubernetes/secret.yaml` (one-time)
4. **Deploy**: `nx run <app>:helm-upgrade` (creates Job)
5. **Monitor**: `kubectl get jobs -w`
6. **Retrieve**: `nx run <app>:kubernetes-copy-files`
7. **Clean**: `nx run <app>:helm-uninstall`

## Documentation

- **[AGENTS.md](AGENTS.md)**: Complete infrastructure architecture, Helm chart config, Terraform setup, troubleshooting
- **[caelundas AGENTS.md](../projects/caelundas/caelundas-cli/AGENTS.md)**: Application deployment example
- **[Main AGENTS.md](../AGENTS.md)**: Codebase architecture and Nx workflows
