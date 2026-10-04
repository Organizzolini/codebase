#!/bin/bash
#
# sessionStart hook — validates the current git worktree directory naming.
#
#   - Silent when the checkout is the main repository, a submodule, or when the
#     worktree directory follows lowercase kebab-case naming and ignore conventions.
#   - Injects the worktree naming error + using-git-worktrees skill directive
#     as additionalContext when non-compliant.
#

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIRECTORY}/../.." && pwd)"

command -v git >/dev/null 2>&1 || exit 0
cd "${REPOSITORY_ROOT}" || exit 0

# 🔎 Worktree detection

# Submodule guard: inside a submodule, treat as normal repo
if [[ -n "$(git rev-parse --show-superproject-working-tree 2>/dev/null)" ]]; then
	exit 0
fi

GIT_DIRECTORY="$(git rev-parse --git-dir 2>/dev/null)" || exit 0
GIT_COMMON_DIRECTORY="$(git rev-parse --git-common-dir 2>/dev/null)" || exit 0
ABSOLUTE_GIT_DIRECTORY="$(cd "${GIT_DIRECTORY}" && pwd)"
ABSOLUTE_GIT_COMMON_DIRECTORY="$(cd "${GIT_COMMON_DIRECTORY}" && pwd)"

# The main checkout's own git-dir is its common-dir; a linked worktree's is a
# subdirectory of the common-dir's "worktrees" folder instead.
[[ "${ABSOLUTE_GIT_DIRECTORY}" = "${ABSOLUTE_GIT_COMMON_DIRECTORY}" ]] && exit 0

MAIN_CHECKOUT_ROOT="$(dirname "${ABSOLUTE_GIT_COMMON_DIRECTORY}")"
[[ "${MAIN_CHECKOUT_ROOT}" = "${REPOSITORY_ROOT}" ]] && exit 0

# ✅ Validation

WORKTREE_DIR_NAME="$(basename "${REPOSITORY_ROOT}")"
ERRORS=()

# 1. Kebab-case naming check (lowercase alphanumeric and hyphens)
if [[ ! "${WORKTREE_DIR_NAME}" =~ ^[a-z0-9][a-z0-9.-]*$ ]]; then
	ERRORS+=("❌ Invalid worktree directory name: \"${WORKTREE_DIR_NAME}\"
   Worktree directory names must be lowercase kebab-case (letters, numbers, hyphens). Avoid spaces, uppercase characters, and special symbols.")
fi

# 2. Ignored check for project-local worktrees
if [[ "${REPOSITORY_ROOT}" == "${MAIN_CHECKOUT_ROOT}/"* ]]; then
	if ! (cd "${MAIN_CHECKOUT_ROOT}" && git check-ignore -q "${REPOSITORY_ROOT}" 2>/dev/null); then
		ERRORS+=("❌ Worktree directory is not gitignored: \"${REPOSITORY_ROOT}\"
   Project-local worktrees inside the repository root must be ignored by .gitignore to prevent committing worktree contents.")
	fi
fi

[[ ${#ERRORS[@]} -eq 0 ]] && exit 0

# 📋 Context

ERROR_MESSAGE=$(printf "%s\n\n" "${ERRORS[@]}")
CONTEXT="${ERROR_MESSAGE}
🚨 Invoke the using-git-worktrees skill to configure a compliant isolated workspace."

printf '%s' "${CONTEXT}" | bash "${SCRIPT_DIRECTORY}/emit-session-hook-context.sh"
