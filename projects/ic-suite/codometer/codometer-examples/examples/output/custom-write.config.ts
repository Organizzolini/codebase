import nodePath from "node:path";

import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * A `write` that picks the destination from what was measured.
 *
 * The corpus holds Python, so this lands in `polyglot.md`; a corpus that did
 * not would get `statistics.md` instead. `anchors.syncAnchoredBlock` is the
 * splice itself, handed over so choosing a different file does not mean
 * reimplementing marker handling — it appends when the markers are absent and
 * creates the file when it is missing, exactly as the built-in writer does,
 * and it renders the default badge block when `content` is left unset.
 *
 * **The destination is derived from `path` rather than written out.** The
 * `path` a writer is handed has already been resolved against the process's
 * working directory, and is absolute; a bare filename passed to
 * `syncAnchoredBlock` is not resolved the same way and lands relative to the
 * working directory the command was run from — which for an Nx target is the
 * workspace root, not the project. Deriving the sibling from `path` is what
 * keeps a writer working wherever it is invoked from.
 *
 * In a `--check` run nothing is written and the call reports whether the file
 * already holds the current block. Returning `false` is what reports a
 * destination as stale, so returning the call's own result is what makes a
 * custom writer participate in `--check reports` rather than silently pass it.
 *
 * ```bash
 * cd packages/codometer-examples/examples/corpus
 * codometer --config ../output/custom-write.config.ts --output-markdown
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  outputs: [
    {
      path: "statistics.md",
      type: "markdown",
      write: ({ anchors, path, statistics }) =>
        anchors.syncAnchoredBlock({
          path:
            path === undefined || statistics.python.files === 0
              ? path
              : nodePath.join(nodePath.dirname(path), "polyglot.md"),
        }),
    },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
