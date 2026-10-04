#!/bin/bash
#
# sessionStart hook — validates that the skills declared in skills-lock.json are
# installed.
#
#   - Silent when every declared skill is present
#   - Injects the missing skill names + restore directive as additionalContext
#     otherwise
#
# Skills declared in skills-lock.json live in gitignored folders, so a checkout
# that has never installed them holds none, and every skill link in AGENTS.md
# dangles. The root postinstall restores them, but only when dependencies
# actually install: pnpm skips lifecycle scripts entirely when node_modules is
# already up to date, which is exactly the case in a worktree branched from an
# existing checkout. This hook is what catches that gap.
#
# It reports rather than restores. Agent harnesses register skills when a
# session starts, so restoring here would still not expose them to the session
# already underway — it would only add a slow background job whose failures
# nobody sees. Directing the agent to restore, then start a fresh session, is
# both simpler and the same number of sessions.

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIRECTORY}/../.." && pwd)"

[[ -f "${REPOSITORY_ROOT}/skills-lock.json" ]] || exit 0

# ✅ Validation

MISSING=$(node -e '
const fs = require("fs");
const root = process.argv[1];
const { skills = {} } = JSON.parse(
  fs.readFileSync(root + "/skills-lock.json", "utf8"),
);
const absent = Object.keys(skills).filter(
  (name) => !fs.existsSync(root + "/.agents/skills/" + name + "/SKILL.md"),
);
process.stdout.write(absent.join(", "));
' "${REPOSITORY_ROOT}" 2>/dev/null)

[[ -z "${MISSING}" ]] && exit 0

# 📋 Context

# Cloud agents install dependencies from a setup workflow, local agents from a
# terminal, so each gets the remediation it can actually carry out.
if [[ -n "${GITHUB_ACTIONS:-}" || -n "${CI:-}" ]]; then
	REMEDIATION="1. Restore them with \"pnpm exec nx run codebase:install-skills\".
2. If restoration fails, confirm \".github/workflows/copilot-setup-steps.yml\" completed its dependency install, which restores skills through postinstall.
3. Start a fresh cloud agent session so the restored skills register.
4. Re-run \"bash scripts/git/validate-session-skills.sh\" to confirm."
else
	REMEDIATION="1. Restore them with \"pnpm exec nx run codebase:install-skills\".
2. Ask the user to start a new session afterwards. Skills register when a session starts, so restoring them does not add them to this one.
3. Re-run \"bash scripts/git/validate-session-skills.sh\" to confirm."
fi

CONTEXT="⚠️  Skills declared in skills-lock.json are not installed: ${MISSING}
🚨 The agent workflow in AGENTS.md links to these skills. Until they are restored those links dangle, and user-invoked skills such as \"/grill-with-docs\" are unavailable.

Action required:
${REMEDIATION}"

printf '%s' "${CONTEXT}" | bash "${SCRIPT_DIRECTORY}/emit-session-hook-context.sh"
