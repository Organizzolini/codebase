#!/bin/bash
#
# Shared sessionStart emitter — reads context text on stdin and prints the JSON
# shape the calling agent harness understands.
#
#   - Claude Code reads hookSpecificOutput.additionalContext
#   - GitHub Copilot reads a top-level additionalContext
#

# 🔎 Harness

# Claude Code exports CLAUDE_PROJECT_DIR into every hook command it runs, so its
# presence is what distinguishes a Claude Code hook from a Copilot one.
if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
	HOOK_CONTEXT_SHAPE='claude-code'
else
	HOOK_CONTEXT_SHAPE='copilot'
fi
export HOOK_CONTEXT_SHAPE

# 📋 Context

node -e "
const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk.toString()));
process.stdin.on('end', () => {
  const additionalContext = chunks.join('');
  const payload = process.env.HOOK_CONTEXT_SHAPE === 'claude-code'
    ? { hookSpecificOutput: { additionalContext, hookEventName: 'SessionStart' } }
    : { additionalContext };
  process.stdout.write(JSON.stringify(payload));
});
"
