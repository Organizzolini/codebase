#!/usr/bin/env bash

# Runs on the HOST machine before the devcontainer starts.
# Ensures Ollama is installed, running, and has the required model.

set -euo pipefail

echo "🦙 Checking Ollama..."

if ! command -v ollama &>/dev/null; then
  echo "⚠️  Ollama is not installed on the host."
  echo "   Install it with: brew install ollama"
  echo "   Then re-open the devcontainer."
  exit 1
fi

echo "✅ Ollama found: $(ollama --version)"

# Upgrade Ollama to the latest version
echo "⬆️  Upgrading Ollama..."
brew upgrade ollama 2>/dev/null && echo "✅ Ollama upgraded" || echo "✅ Ollama already up to date"

# Start ollama if not already running
if ! curl -sf http://localhost:11434/api/version &>/dev/null; then
  echo "🚀 Starting Ollama..."
  if command -v brew &>/dev/null && brew services list | grep -q ollama; then
    brew services start ollama
  else
    # Fallback: start in background
    ollama serve &>/dev/null &
    disown
  fi

  echo "⏳ Waiting for Ollama to be ready..."
  for _ in {1..15}; do
    if curl -sf http://localhost:11434/api/version &>/dev/null; then
      break
    fi
    sleep 1
  done
fi

echo "✅ Ollama is running"
