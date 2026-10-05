#!/bin/bash
# ollama.sh — Install Ollama, ensure the daemon is running, and pull the default model.
#
# Ollama serves local language models over HTTP at localhost:11434.
# The affirmancy application uses it as the LLM backend via LangChain.
# gemma4:e2b is the default model used by the ReAct agent.
#
# Depends on: brew.sh (brew_install_or_check must be defined)

brew_install_or_check "ollama"

echo "🦙 Ensuring Ollama is running..."
if ! curl -sf http://localhost:11434/api/version &>/dev/null; then
  echo "🚀 Starting Ollama..."
  if brew services list | grep -q ollama; then
    brew services start ollama
  else
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

echo "🦙 Pulling default model (gemma4:e2b)..."
ollama pull gemma4:e2b
