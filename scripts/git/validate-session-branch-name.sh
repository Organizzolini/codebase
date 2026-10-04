#!/bin/bash
#
# sessionStart hook — validates the current git branch name.
#
#   - Silent when the branch follows <type>/<scope>-<description>
#   - Injects the validate-branch-name errorMsg + rename-branch skill directive
#     as additionalContext when non-compliant
#

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 🔎 Current branch

BRANCH=$(git branch --show-current 2>/dev/null)
# Detached HEAD or non-git directory — nothing to validate
[[ -z "${BRANCH}" ]] && exit 0

# validate-branch-name resolves its config from the working directory, which is
# not guaranteed to be the repository root when an agent harness invokes a hook.
REPOSITORY_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [[ -n "${REPOSITORY_ROOT}" ]]; then
  cd "${REPOSITORY_ROOT}" || exit 1
fi

# ✅ Validation

# Extract just the errorMsg block from validate-branch-name output, stripping
# ANSI codes. Empty output means the branch is compliant — exit silently.
ERROR=$(pnpm exec validate-branch-name 2>&1 | awk '/^Error Msg:/{found=1; next} found && /^Branch Name:/{exit} found{print}' | sed 's/\x1b\[[0-9;]*m//g')
[[ -z "${ERROR}" ]] && exit 0

# 📋 Context

# Combine the human-readable error (types, scopes, format) with a directive so
# the agent invokes the rename-branch skill before responding to the user.
CONTEXT="${ERROR}
🚨 Invoke the rename-branch skill to rename this branch before doing anything else."

printf '%s' "${CONTEXT}" | bash "${SCRIPT_DIRECTORY}/emit-session-hook-context.sh"
