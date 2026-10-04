#!/bin/bash
# dependencies.sh — Install project-level dependencies and initialize infrastructure.
#
# Responsibilities:
#   - Install Node.js workspace dependencies (pnpm install)
#   - Reset the Nx computation cache (ensures a clean local cache after setup)
#   - Create the shared Python virtual environment for the uv workspace
#   - Initialize Terraform providers and backend
#   - Write kubeconfig for the LKE cluster (skipped if env vars are missing)
#
# Requires: software.sh to have run first so that pnpm, node, uv, and terraform
#           are on PATH.

echo "📦 Installing Node dependencies..."
pnpm install
echo "✅ Node dependencies installed"

# Nx caches task outputs keyed by input hashes. Resetting on first setup
# prevents stale cache hits from leaking across developer machines.
echo "🔄 Resetting Nx cache..."
nx reset
echo "✅ Nx cache reset"

# `uv sync` reads the workspace root pyproject.toml to create/update the venv
# and install the locked dependencies of every workspace member. The venv lives
# at .venv and is activated automatically by Nx tasks via the `uv run` prefix.
echo "🐍 Setting up Python virtual environment..."
uv sync
echo "✅ Python dependencies installed (.venv)"

# `terraform init` downloads the required providers (linode) and configures the
# backend. This must run before any `terraform plan/apply` or state imports.
echo "🏗  Initializing Terraform..."
pushd infrastructure/terraform > /dev/null || exit 1
terraform init
echo "✅ Terraform initialized"

echo "🔑 Setting up kubeconfig..."
# Source root .env so TF_VAR_* variables are available
if [[ -f "../../.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "../../.env"
  set +a
fi

if [[ -z "${TF_VAR_linode_token}" ]] || [[ -z "${TF_VAR_linode_kubernetes_engine_cluster_id}" ]]; then
  echo "⚠️  Skipping kubeconfig: set TF_VAR_linode_token and TF_VAR_linode_kubernetes_engine_cluster_id in .env"
elif [[ -f "${HOME}/.kube/config" ]]; then
  echo "👍 kubeconfig already exists at ~/.kube/config"
else
  # Extract numeric cluster ID (strip any node pool suffix like "lke12345-6789-...")
  cluster_id="${TF_VAR_linode_kubernetes_engine_cluster_id%%[-_]*}"
  cluster_id="${cluster_id//[^0-9]/}"

  # Import cluster into state if not already tracked
  if ! terraform state list 2>/dev/null | grep -q "linode_lke_cluster.cluster"; then
    echo "📥 Importing cluster ${cluster_id} into Terraform state..."
    terraform import linode_lke_cluster.cluster "${cluster_id}"
  fi

  mkdir -p "${HOME}/.kube"
  terraform output -raw kubeconfig | base64 -d > "${HOME}/.kube/config"
  echo "✅ kubeconfig saved to ~/.kube/config"
fi

popd > /dev/null || exit 1
