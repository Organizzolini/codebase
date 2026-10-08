// ♟️ Constants

/** Marker block name used to embed the PR template in target markdown files. */
export const SYNC_PULL_REQUEST_TEMPLATE_MARKER = "pr-template";

/** Target files that embed the PR template block. */
export const SYNC_PULL_REQUEST_TEMPLATE_TARGET_FILES: string[] = [
  ".agents/skills/create-pull-request/SKILL.md",
  ".agents/skills/update-pull-request/SKILL.md",
];
