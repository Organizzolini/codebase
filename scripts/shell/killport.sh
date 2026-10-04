#!/bin/bash

function killport() {
  port="$1"
  process_ids=$(lsof -t -i ":${port}")
  if [[ -z "${process_ids}" ]]; then
    echo "👍 No processes found running on port ${port}"
  else
    echo "⏹️ Killing processes running on port ${port}"
    echo "${process_ids}" | while read -r process_id; do
      process_name=$(ps -p "${process_id}" -o comm= 2>/dev/null || echo "unknown")
      echo "⏹️ Killing process ${process_name} (${process_id})"
      kill -9 "${process_id}"
    done
    echo "✅ All processes running on port ${port} killed successfully."
  fi
}