#!/bin/bash
#
# sessionStart hook — validates git commit signing configuration.
#
#   - Silent when GPG signing is configured correctly
#   - Injects the signing error + stop directive as additionalContext when
#     commit signing is not configured
#

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ✅ Validation

if [[ -n "${GITHUB_ACTIONS:-}" || -n "${CI:-}" ]]; then
	ERROR=$(SKIP_GPG_SIGNING_SMOKE_TEST=true bash "${SCRIPT_DIRECTORY}/check-commit-signing-configuration.sh" 2>&1 || true)
else
	ERROR=$(bash "${SCRIPT_DIRECTORY}/check-commit-signing-configuration.sh" 2>&1 || true)
fi
[[ -z "${ERROR}" ]] && exit 0

# 📋 Context

# Cloud agents cannot configure gpg themselves — their key arrives from repository
# secrets — so they get bootstrap instructions while local agents get local ones.
if [[ -n "${GITHUB_ACTIONS:-}" || -n "${CI:-}" ]]; then
	REMEDIATION="1. Stop and do not create commits until signing is configured.
2. Confirm repository environment \"copilot\" has secrets \"GPG_PRIVATE_KEY\" and \"GPG_PASSPHRASE\".
3. Re-run workflow \".github/workflows/copilot-setup-steps.yml\" so the GPG key is imported and signing is enabled.
4. Start a fresh cloud agent session after the workflow completes.
5. Re-run \"bash scripts/git/check-commit-signing-configuration.sh\".
6. If signatures still are not verified, add the matching public key to GitHub: Settings -> SSH and GPG keys."
else
	REMEDIATION="1. Stop and do not create commits until signing is configured.
2. List available keys with \"gpg --list-secret-keys --keyid-format=long\".
3. Enable signing with \"git config --global commit.gpgsign true\".
4. Select the key with \"git config --global user.signingkey <key-id>\".
5. Re-run \"bash scripts/git/check-commit-signing-configuration.sh\".
6. If signatures still are not verified, add the matching public key to GitHub: Settings -> SSH and GPG keys."
fi

CONTEXT="${ERROR}
🚨 Git commit signing is required in this repository.

Action required:
${REMEDIATION}"

printf '%s' "${CONTEXT}" | bash "${SCRIPT_DIRECTORY}/emit-session-hook-context.sh"
