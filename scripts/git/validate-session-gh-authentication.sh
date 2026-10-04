#!/bin/bash
#
# sessionStart hook — validates gh authentication.
#
#   - Silent when gh authentication is valid
#   - Injects the gh auth error + stop directive as additionalContext when
#     authentication is unavailable or insufficient
#

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ✅ Validation

ERROR=$(bash "${SCRIPT_DIRECTORY}/check-gh-authentication.sh" 2>&1 || true)
[[ -z "${ERROR}" ]] && exit 0

# 📋 Context

# Cloud agents authenticate from a repository secret, local agents from a browser
# flow, so each gets the remediation it can actually carry out.
if [[ -n "${GITHUB_ACTIONS:-}" || -n "${CI:-}" ]]; then
	REMEDIATION="1. Stop and do not continue this session until GitHub authentication is valid.
2. Confirm repository environment \"copilot\" has a valid \"GH_TOKEN\" (recommended).
3. Re-run workflow \".github/workflows/copilot-setup-steps.yml\" to bootstrap gh authentication.
4. Start a fresh cloud agent session after the workflow completes.
5. Re-run \"bash scripts/git/check-gh-authentication.sh\".
6. If project access still fails, verify token scopes include repository + Projects access."
else
	REMEDIATION="1. Stop and do not continue this session until GitHub authentication is valid.
2. Authenticate with \"gh auth login --hostname github.com\".
3. Configure the git credential helper with \"gh auth setup-git\".
4. Re-run \"bash scripts/git/check-gh-authentication.sh\".
5. If project access still fails, grant the missing scopes with \"gh auth refresh --scopes read:project,read:org\"."
fi

CONTEXT="${ERROR}
🚨 GitHub authentication is required in this repository.

Action required:
${REMEDIATION}"

printf '%s' "${CONTEXT}" | bash "${SCRIPT_DIRECTORY}/emit-session-hook-context.sh"
