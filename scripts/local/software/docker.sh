#!/bin/bash
# docker.sh — Install Docker Desktop and ensure the daemon is running.
#
# Docker is required for docker-compose services (SearxNG, Open WebUI) used by
# the affirmancy application, and for building caelundas container images.

echo "🔍 Checking for Docker installation..."
if ! command -v docker &> /dev/null; then
  echo "📦 Docker not found. Installing Docker Desktop via Homebrew..."
  brew install --cask docker
  echo "✅ Docker Desktop installed"
fi

echo "🐳 Ensuring Docker daemon is running..."
if ! docker info &>/dev/null 2>&1; then
  echo "🚀 Starting Docker Desktop..."
  open -a Docker
  echo "⏳ Waiting for Docker daemon to be ready..."
  for _ in {1..30}; do
    if docker info &>/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
  if docker info &>/dev/null 2>&1; then
    echo "✅ Docker is running: $(docker --version)"
  else
    echo "⚠️  Docker daemon is taking longer than expected to start."
    echo "   Please wait for Docker Desktop to finish launching, then re-run setup."
  fi
else
  echo "👍 Docker is running: $(docker --version)"
fi
