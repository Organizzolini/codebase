# shellcheck shell=bash
# Sourced into an interactive zsh or bash by shell-config.sh, never executed.

function killport() {
  port="$1"
  process_ids=$(lsof -t -i ":${port}")
  if [[ -z "${process_ids}" ]]; then
    echo "👍 No processes running on port ${port}"
  else
    echo "⏹️ Killing processes running on port ${port}"
    echo "${process_ids}" | while read -r process_id; do
      echo "⏹️ Killing process with PID ${process_id}"
      kill -9 "${process_id}"
    done
    echo "✅ Killed processes running on port ${port}"
  fi
}

function killallnode() {
  echo "🔪 Killing all node processes"

  # Find all node process IDs and print info before killing
  for pid in $(pgrep node); do
    # Get process info: PID, command, and full command line
    process_info=$(ps -p "${pid}" -o pid=,comm=,args=)
    echo "Killing process: ${process_info}"
    kill -9 "${pid}"
    echo "Killed process: ${pid}"
  done

  echo "⚰️ Killed all node processes"
}

function killallvscodeextensions() {
  echo "🔪 Killing all VSCode Extension helper processes"

  # Use -lf to get PID and full command, filter only .vscode/extensions
  pgrep -lf "${HOME}/\.vscode/extensions/" | while read -r pid full_command; do
    extension_name=$(echo "${full_command}" | grep -oE '\.vscode/extensions/[^/]+' | sed 's/.*extensions\///')
    echo "⏹️  Killing ${pid}: ${extension_name}"
    kill -9 "${pid}"
  done

  echo "⚰️ Killed all VSCode Extension helper processes"
}
