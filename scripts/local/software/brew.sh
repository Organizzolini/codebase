#!/bin/bash
# brew.sh — Verify Homebrew is installed and provide the brew_install_or_check helper.
#
# This module must be sourced first. All subsequent software modules depend on
# brew_install_or_check being defined and Homebrew being present.

echo "🔍 Checking for Homebrew installation..."
if ! command -v brew &> /dev/null; then
  echo "🛑 Homebrew not found. Please install Homebrew first: https://brew.sh/" >&2
  exit 1
fi

# Installs a Homebrew formula if the named command is not yet on PATH, and
# reports whether an upgrade is available if it already is.
# Usage: brew_install_or_check <command-name> [tap/formula]
brew_install_or_check() {
  local name="$1"
  local tap="$2" # optional tap path, e.g. "supabase/tap/supabase"
  local formula="${tap:-${name}}"

  echo "🔍 Checking for ${name} installation..."
  if ! command -v "${name}" &> /dev/null; then
    echo "📦 ${name} not found. Installing via Homebrew..."
    brew install "${formula}"
    echo "✅ ${name} installed via Homebrew"
  else
    echo "👍 ${name} is already installed"
    if brew outdated | grep -q "${name}"; then
      echo "🔄 ${name} is outdated. To update, run: brew upgrade ${formula}"
    fi
  fi
}
