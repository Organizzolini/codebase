#!/bin/bash
# gpg.sh — Install GPG, configure pinentry-mac, and wire git commit signing.
#
# All commits must be GPG-signed (enforced by branch protection + commitlint).
# pinentry-mac provides a macOS GUI passphrase dialog when signing commits.
# GPG_TTY (written to the shell RC by shell-config.sh) ensures gpg-agent can
# prompt for the passphrase in terminal sessions.
#
# Depends on: brew.sh (brew_install_or_check must be defined)

echo "🔍 Checking for GPG installation..."
if ! command -v gpg &> /dev/null; then
  echo "📦 GPG not found. Installing via Homebrew..."
  brew install gnupg pinentry-mac
  echo "✅ gnupg and pinentry-mac installed"
else
  echo "👍 GPG is already installed: $(gpg --version | head -1)"
fi

echo "🔐 Configuring gpg-agent to use pinentry-mac..."
GNUPG_DIR="${HOME}/.gnupg"
mkdir -p "${GNUPG_DIR}" && chmod 700 "${GNUPG_DIR}"
AGENT_CONF="${GNUPG_DIR}/gpg-agent.conf"
PINENTRY_PATH="$(brew --prefix)/bin/pinentry-mac"
if [[ ! -f "${AGENT_CONF}" ]] || ! grep -q "pinentry-program" "${AGENT_CONF}"; then
  echo "pinentry-program ${PINENTRY_PATH}" >> "${AGENT_CONF}"
  echo "✅ pinentry-mac configured in gpg-agent.conf"
else
  echo "👍 gpg-agent.conf already configured"
fi

echo "🔐 Checking for existing GPG signing key..."
if ! gpg --list-secret-keys --keyid-format=long | grep -q '^sec'; then
  echo "⚠️  No GPG secret key found."
  echo "   To create one, run:"
  echo "     gpg --quick-generate-key \"Your Name <you@example.com>\" rsa4096 sign 0"
  echo "   Then configure git signing:"
  echo "     KEY_ID=\$(gpg --list-secret-keys --keyid-format=long | grep '^sec' | awk '{print \$2}' | cut -d'/' -f2)"
  echo "     git config --global user.signingkey \"\$KEY_ID\""
  echo "     git config --global commit.gpgsign true"
  echo "   Finally, add the public key to GitHub:"
  echo "     gpg --armor --export you@example.com"
  echo "     https://github.com/settings/gpg/new"
else
  echo "👍 GPG signing key found"
  GPG_KEY_ID=$(gpg --list-secret-keys --keyid-format=long | grep '^sec' | awk '{print $2}' | cut -d'/' -f2 | head -1)
  echo "   Key ID: ${GPG_KEY_ID}"
  if ! git config --global user.signingkey &>/dev/null; then
    git config --global user.signingkey "${GPG_KEY_ID}"
    git config --global commit.gpgsign true
    git config --global gpg.program gpg
    echo "✅ git global signing configured with key ${GPG_KEY_ID}"
  else
    echo "👍 git signing already configured globally"
  fi
fi
