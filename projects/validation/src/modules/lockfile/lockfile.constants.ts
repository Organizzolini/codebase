// ♟️ Constants

/** The package manager whose answer this check is. */
export const PACKAGE_MANAGER_BINARY = "pnpm";

/**
 * The install that answers the question.
 *
 * `--frozen-lockfile` is the whole check: it resolves every manifest against
 * the lockfile and refuses rather than rewriting, so pnpm's own verdict is the
 * verdict, and "in sync" never means something this check invented.
 *
 * `--lockfile-only` keeps it from touching `node_modules`. The pre-commit hook
 * runs this beside eslint, knip, and typecheck, and a real install re-links
 * whatever is out of step while they read it: each then dies on a different
 * missing module. Resolution alone still refuses a stale lockfile.
 */
export const FROZEN_INSTALL_ARGUMENTS = [
  "install",
  "--frozen-lockfile",
  "--lockfile-only",
];

/** Said when the lockfile and the manifests agree. */
export const LOCKFILE_IN_SYNC_MESSAGE = "🔒 pnpm-lock.yaml is in sync";

/** Said, in order, when they do not. */
export const LOCKFILE_OUT_OF_SYNC_MESSAGES = [
  "❌ pnpm-lock.yaml is out of sync with package.json files",
  "💡 Run 'pnpm install' to update the lockfile and try committing again",
  "",
  "pnpm output:",
];

/**
 * Said when there is no pnpm to ask, after which this check passes.
 *
 * Passing rather than failing on purpose. This runs from the pre-commit hook,
 * which has no login shell and so may not have pnpm on its path at all; a
 * commit refused because the checker could not be found would be a checker
 * that blocks work without ever having checked anything.
 */
export const PACKAGE_MANAGER_MISSING_MESSAGE =
  "⚠️  pnpm not found in PATH; skipping lockfile check";
