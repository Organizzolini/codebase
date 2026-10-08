// ♟️ Constants

import type { ResolvedCallidescopeWriteConfiguration } from "@callidescope/configuration";

/**
 * How each anchored destination draws the stacks it carries.
 *
 * One list rather than the pair written out at each of the two places a run
 * writes anchored blocks — its own and every project's — because the pairing is
 * the same fact both times, and two copies of it are two places for `mermaid`
 * to start printing trees.
 */
export const MARKDOWN_DESTINATION_RENDERINGS = [
  ["markdown", "tree"],
  ["mermaid", "diagram"],
] as const satisfies readonly (readonly [
  keyof ResolvedCallidescopeWriteConfiguration,
  "diagram" | "tree",
])[];
