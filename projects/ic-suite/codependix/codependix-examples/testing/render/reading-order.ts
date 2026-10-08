// ♟️ Constants

/**
 * Every example, in the order the package README lists them.
 *
 * Named here rather than derived from a numeric filename prefix: each example
 * is a directory a reader can open on its own, and its name is what the guides
 * link to. The order is a reading order, and this is the one place it is
 * written down — `renderDocument` reads it to render each guide's `## Next`
 * link, so the chain through the examples cannot disagree with the index table
 * the README renders from the same list.
 *
 * This module imports nothing on purpose. Both the catalog that builds the
 * documents and the renderer that writes them need this order, and a cycle
 * between those two would take down every task in the package.
 */
export const EXAMPLE_ORDER = [
  "graph-levels",
  "neighborhood-scope",
  "ambient-modules",
  "preview-mode",
  "container-rooting",
  "typescript-resolution",
  "python-scanner",
  "configuration-resolution",
  "export-targets",
  "markdown-modes",
  "auto-created-sections",
  "check-and-write",
  "boundary-rules",
  "refusals",
  "path-queries",
  "json-exports",
  "workspace-drift",
] as const;

/**
 * The emoji each example's title carries, keyed by directory name.
 *
 * Kept beside the reading order rather than in the eight builders, so the whole
 * set is visible at once and two examples cannot quietly claim the same one.
 */
export const EXAMPLE_EMOJI: Record<string, string> = {
  "ambient-modules": "🌍",
  "auto-created-sections": "🪄",
  "boundary-rules": "🚧",
  "check-and-write": "🔀",
  "configuration-resolution": "⚙️",
  "container-rooting": "🌱",
  "export-targets": "🎯",
  "graph-levels": "🗺️",
  "json-exports": "📦",
  "markdown-modes": "📝",
  "neighborhood-scope": "🏘️",
  "path-queries": "🛤️",
  "preview-mode": "👁️",
  "python-scanner": "🐍",
  refusals: "🚫",
  "typescript-resolution": "🧭",
  "workspace-drift": "🌊",
};

// 🔗 Chaining

/** The example a guide's `## Next` section points at, if there is one. */
export function nextExample(id: string): string | undefined {
  const order: readonly string[] = EXAMPLE_ORDER;
  const position = order.indexOf(id);

  if (position === -1) return undefined;

  return order[position + 1];
}
