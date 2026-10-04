#!/bin/bash
# shell-config.sh — Write persistent shell configuration to ~/.zshrc / ~/.bashrc.
#
# Shell changes made in this setup session (nvm sourcing, PATH updates) only
# affect the current process. Writing them to the RC file ensures they persist
# in every new terminal window after setup completes.
#
# All blocks are idempotent: a unique marker comment guards against re-adding
# the same block on subsequent runs.
#
# Depends on: node.sh (nvm must be installed so brew --prefix nvm resolves)

# append_shell_block <rc_file> <marker> <block>
# Appends <block> to <rc_file> only if <marker> is not already present.
append_shell_block() {
  local rc_file="$1"
  local marker="$2"
  local block="$3"

  if [[ -f "${rc_file}" ]] && grep -q "${marker}" "${rc_file}"; then
    return 0
  fi

  {
    echo ""
    echo "${marker}"
    echo "${block}"
  } >> "${rc_file}"
}

configure_shell_rc() {
  local rc_file="$1"
  local nvm_prefix
  nvm_prefix="$(brew --prefix nvm)"
  local codebase_dir
  codebase_dir="$(pwd)"

  echo "🐚 Configuring shell in ${rc_file}..."

  # ── nvm ──
  append_shell_block "${rc_file}" \
    "# codebase: nvm configuration" \
    "export NVM_DIR=\"\$HOME/.nvm\"
[ -s \"${nvm_prefix}/nvm.sh\" ] && . \"${nvm_prefix}/nvm.sh\"
[ -s \"${nvm_prefix}/etc/bash_completion.d/nvm\" ] && . \"${nvm_prefix}/etc/bash_completion.d/nvm\""

  # ── pnpm global bin PATH ──
  append_shell_block "${rc_file}" \
    "# codebase: pnpm global bin" \
    "export PNPM_HOME=\"\$HOME/.local/share/pnpm\"
case \":\$PATH:\" in *\":\$PNPM_HOME/bin:\"*) ;; *) export PATH=\"\$PNPM_HOME/bin:\$PNPM_HOME:\$PATH\" ;; esac"

  # ── GPG TTY (for git commit signing) ──
  # gpg-agent needs a terminal reference to show the pinentry passphrase dialog.
  append_shell_block "${rc_file}" \
    "# codebase: GPG TTY for commit signing" \
    "export GPG_TTY=\$(tty)"

  # ── Node.js memory limit (parity with devcontainer) ──
  append_shell_block "${rc_file}" \
    "# codebase: Node.js memory limit" \
    "export NODE_OPTIONS=\"--max-old-space-size=2048\""

  # ── Shell completions ──
  local completions_marker="# codebase: shell completions"
  if ! ([[ -f "${rc_file}" ]] && grep -q "${completions_marker}" "${rc_file}"); then
    local shell_name
    shell_name="$(basename "${rc_file}")"
    local completion_type="bash"
    if [[ "${shell_name}" == ".zshrc" ]]; then
      completion_type="zsh"
    fi

    local completions_block="${completions_marker}"

    if command -v pnpm &>/dev/null; then
      completions_block="${completions_block}
eval \"\$(pnpm completion ${completion_type})\""
    fi

    if command -v kubectl &>/dev/null; then
      completions_block="${completions_block}
eval \"\$(kubectl completion ${completion_type})\""
    fi

    if command -v helm &>/dev/null; then
      completions_block="${completions_block}
eval \"\$(helm completion ${completion_type})\""
    fi

    if command -v gh &>/dev/null; then
      completions_block="${completions_block}
eval \"\$(gh completion -s ${completion_type})\""
    fi

    echo "" >> "${rc_file}"
    echo "${completions_block}" >> "${rc_file}"
  fi

  # ── terraform completions (uses its own installer) ──
  if command -v terraform &>/dev/null; then
    append_shell_block "${rc_file}" \
      "# codebase: terraform completion" \
      "autoload -U +X bashcompinit && bashcompinit 2>/dev/null
complete -o nospace -C $(command -v terraform) terraform"
  fi

  # ── Shell utility functions ──
  append_shell_block "${rc_file}" \
    "# codebase: shell utility functions" \
    "[ -f \"${codebase_dir}/scripts/shell/processes.sh\" ] && . \"${codebase_dir}/scripts/shell/processes.sh\""

  echo "✅ Shell configuration updated in ${rc_file}"
}

echo "🐚 Configuring shell..."
current_shell="$(basename "${SHELL}")"
case "${current_shell}" in
  zsh)
    configure_shell_rc "${HOME}/.zshrc"
    ;;
  bash)
    configure_shell_rc "${HOME}/.bashrc"
    # Also configure .bash_profile if it exists (macOS uses login shells)
    if [[ -f "${HOME}/.bash_profile" ]]; then
      configure_shell_rc "${HOME}/.bash_profile"
    fi
    ;;
  *)
    echo "⚠️  Unsupported shell: ${current_shell}. Please add the following to your shell config manually:"
    echo "   export NVM_DIR=\"\$HOME/.nvm\""
    echo "   [ -s \"$(brew --prefix nvm)/nvm.sh\" ] && . \"$(brew --prefix nvm)/nvm.sh\""
    echo "   export PNPM_HOME=\"\$HOME/.local/share/pnpm\""
    echo "   export GPG_TTY=\$(tty)"
    echo "   export NODE_OPTIONS=\"--max-old-space-size=2048\""
    ;;
esac
