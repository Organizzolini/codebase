import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * A path that could name two metrics. Refused, never resolved.
 *
 * Two things together make `markdown.files` ambiguous: an input called
 * `markdown`, whose own `files` metric the path could name, and
 * `defaultInput: "codebase"`, which makes the path readable as the codebase's
 * `markdown.files` counter too. The run fails naming both readings rather than
 * picking one, because a limit that quietly bound to the wrong metric would
 * look exactly like one that works.
 *
 * Drop the `defaultInput` and the ambiguity goes with it — the path then reads
 * only as the input's. That is worth knowing, because it means a
 * `defaultInput` added for convenience can break a limit written before it.
 * The fix either way is to write the input name in full:
 * `codebase.markdown.files` for the language counter, `markdown.files` for the
 * input's.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../limits/ambiguous.config.ts --check limits
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  defaultInput: "codebase",
  format: "markdown",
  inputs: [
    {
      analyses: ["language"],
      include: ["markdown/**/*.md"],
      name: "markdown",
    },
  ],
  limits: [{ metric: "markdown.files", value: 1 }],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
