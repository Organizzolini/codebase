#!/bin/bash
# setup.sh — Entry point for local developer machine setup.
#
# Run this once after cloning the codebase repository to install all required tools,
# configure your shell, and install project dependencies.
#
# Usage: bash scripts/local/setup.sh   (from the workspace/worktree root)
#
# Execution order:
#   1. utilities.sh    — validates cwd, loads .env, enables set -e
#   2. software.sh     — installs system tools (brew, nvm, node, pnpm, uv, etc.)
#   3. environment.sh  — bootstraps .env files from .env.default templates
#   4. dependencies.sh — installs project deps, sets up Python venv, Terraform

source ./scripts/utilities.sh

# Scripts are sourced (not executed) so environment changes made in software.sh
# (e.g. nvm use, PATH updates) carry through into subsequent scripts.
source ./scripts/local/software.sh
source ./scripts/local/environment.sh
source ./scripts/local/dependencies.sh
echo ""
current_shell="$(basename "${SHELL}")"
case "${current_shell}" in
  zsh)  rc_file="${HOME}/.zshrc" ;;
  bash) rc_file="${HOME}/.bashrc" ;;
  *)    rc_file="" ;;
esac

echo "🎉 Setup complete! All tools and shell configuration are ready."
echo "   New terminal windows will automatically have all tools available."
if [[ -n "${rc_file}" ]]; then
  echo ""
  echo "   To activate in this terminal, run:"
  echo "   source ${rc_file}"
fi
