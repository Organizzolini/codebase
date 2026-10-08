import path from "node:path";
import { fileURLToPath } from "node:url";

// ♟️ Constants

/**
 * This package's own root, resolved from this file rather than from the
 * process working directory.
 *
 * Every example reads a subject from disk, and the two callers that run them —
 * the `examples` Nx target and vitest — do not agree on a working directory in
 * every harness. Resolving from `import.meta.url` makes a path mean the same
 * thing either way.
 */
export const PROJECT_ROOT_DIRECTORY = path.resolve(
  fileURLToPath(import.meta.url),
  "../../..",
);

/**
 * Directory every example lives in, subject and rendered guide together.
 *
 * Each subdirectory is one example: its `README.md` is rendered from the
 * subject files beside it, so a reader opening the directory sees the code and
 * what codependix makes of it in the same place. Committed rather than
 * gitignored — the whole point of the package is that a reader sees the
 * diagram, the JSON shape, and the refusal without running anything first.
 */
export const EXAMPLES_DIRECTORY = path.join(PROJECT_ROOT_DIRECTORY, "examples");

/** Resolves one example subject's absolute root. */
export const resolveExample = (...segments: string[]): string =>
  path.join(EXAMPLES_DIRECTORY, ...segments);

/**
 * Prefix every anchor name used anywhere in this package carries.
 *
 * `codebase:codependix:write` claims the anchors named in
 * `configuration/codependix.config.ts` — `codependix-nx-projects`, `codependix-nestjs-modules`,
 * `codependix-file-imports`, `codependix-imports-python`, and
 * `codependix-workspace` — in every `README.md` in the workspace. An example
 * that printed one of those names inside a Markdown file here would be an
 * anchor the real run could claim and overwrite, so every example uses a name
 * outside that set, and writes into `output/` rather than into a `README.md`.
 */
export const EXAMPLE_ANCHOR_PREFIX = "example";

/** Builds an anchor name no real codependix run will ever claim. */
export const buildExampleAnchor = (suffix: string): string =>
  `${EXAMPLE_ANCHOR_PREFIX}-${suffix}`;
