import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The one place ignore rules do not reach.
 *
 * `examples/corpus/.gitignore` names `generated/`, and discovery reads that
 * file itself rather than invoking git — so whatever is put in there is
 * invisible to the codebase input. A declared input's globs are the
 * exception, and that exception is the whole reason inputs exist: a build
 * directory is precisely the thing every repository ignores and every
 * repository wants to gate the size of.
 *
 * `generated/` is empty in a fresh checkout, because a file that is both
 * tracked and ignored breaks `git add` for everyone afterwards. Fill it from
 * the committed samples first:
 *
 * ```bash
 * cp -R projects/ic-suite/codometer/codometer-examples/examples/compiled projects/ic-suite/codometer/codometer-examples/examples/corpus/generated
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../targets/ignored.config.ts
 * ```
 *
 * The codebase input still reports 28 files, exactly as it did before the copy
 * — and `Ignored Output` reports the two that discovery refused to walk into.
 * Delete `examples/corpus/generated` afterwards; nothing else needs it.
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  inputs: [
    {
      analyses: ["language", "size"],
      compression: "gzip",
      include: ["generated/**/*.js"],
      name: "Ignored Output",
    },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
