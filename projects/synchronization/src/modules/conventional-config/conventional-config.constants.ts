// ♟️ Constants

/**
 * Markdown files that carry the generated type and scope tables.
 *
 * Every entry must hold both `types-start`/`types-end` and
 * `scopes-start`/`scopes-end` marker pairs — the synchronizer rewrites what
 * sits between them and throws when a registered file has nowhere to write.
 *
 * These are the real paths, never the symlinked mirrors: `AGENTS.md` rather
 * than `.github/copilot-instructions.md`, and `.agents/skills/` rather than
 * `.github/skills/`. Writing through a mirror lands on the same file, but a
 * list that names mirrors cannot be checked against the files that actually
 * carry the markers.
 */
export const SYNC_CONVENTIONAL_CONFIG_MARKDOWN_FILES = [
  ".github/CONTRIBUTING.md",
  ".agents/skills/checkout-branch/SKILL.md",
  ".agents/skills/commit-code/SKILL.md",
  ".agents/skills/create-pull-request/SKILL.md",
  ".agents/skills/rename-branch/SKILL.md",
  ".agents/skills/triage-integration/SKILL.md",
];

/** Issue template files that contain type and scope dropdowns. */
export const SYNC_CONVENTIONAL_CONFIG_ISSUE_TEMPLATE_FILES = [
  ".github/ISSUE_TEMPLATE/issue.yml",
];

/** Commit types excluded from release rules presence validation. */
export const RELEASE_RULES_SPECIAL_TYPES = new Set(["revert"]);
