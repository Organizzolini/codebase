#!/bin/bash
# environment.sh — Bootstrap .env files for all projects from their defaults.
#
# Each project ships a .env.default containing safe placeholder values.
# This script finds every .env.default git knows about (tracked or untracked,
# respecting .gitignore) outside the conformetry templates, and copies it to
# .env wherever one doesn't already exist, so developers can immediately run
# the stack without manually creating env files. Existing .env files are never
# overwritten.
#
# Also injects LOCAL_WORKSPACE_FOLDER into the root .env so that docker-compose
# volume mounts resolve correctly on the host (devcontainer sets this via
# remoteEnv; local runs derive it from the current working directory).

# Helper: copy .env.default → .env if missing
setup_env_file() {
  local dir="$1"
  local label="$2"

  if [[ ! -f "${dir}/.env" ]]; then
    if [[ -f "${dir}/.env.default" ]]; then
      cp "${dir}/.env.default" "${dir}/.env"
      echo "✅ ${label} .env created from .env.default"
    else
      echo "⚠️  ${label} .env.default not found. Skipping."
    fi
  else
    echo "👍 ${label} .env already exists"
  fi
}

echo "🔍 Setting up environment files..."
while IFS= read -r default_file; do
  dir="$(dirname "${default_file}")"
  if [[ "${dir}" == "." ]]; then
    setup_env_file "." "Root"
  else
    setup_env_file "${dir}" "${dir}"
  fi
done < <(
  git ls-files --cached --others --exclude-standard -- \
    '.env.default' '*/.env.default' \
    ':!:configuration/conformetry-templates/**' | sort -u
)

# Ensure LOCAL_WORKSPACE_FOLDER is set for docker-compose volume mounts
# (devcontainer sets this via remoteEnv; locally we derive it from pwd)
if [[ -f ".env" ]] && ! grep -q '^LOCAL_WORKSPACE_FOLDER=' .env; then
  {
    echo ""
    echo "# Local workspace path (used by docker-compose for volume mounts)"
    echo "LOCAL_WORKSPACE_FOLDER=$(pwd)"
  } >> .env
  echo "✅ Added LOCAL_WORKSPACE_FOLDER to root .env"
fi
