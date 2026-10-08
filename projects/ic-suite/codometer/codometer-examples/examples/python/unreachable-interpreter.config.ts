import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * What a wrong interpreter looks like — which is not like an error.
 *
 * The command below does not exist. The run **exits 0**, warns once per attempt
 * on standard error, and reports a corpus with no Python in it:
 *
 * ```text
 * 🐍 Skipped Python analysis
 *    { reason: "Command failed: python-that-is-not-installed …: command not found" }
 * ```
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../python/unreachable-interpreter.config.ts --format json \
 *   | jq '.targets[0].metrics[] | select(.path | startswith("python."))'
 * ```
 *
 * Every `python.*` counter is 0, including `python.files` — the file is found
 * and simply cannot be read. Nothing in the report says the interpreter was the
 * problem, which is why this is worth recognizing by shape: a Python counter
 * reading zero for a directory you know has Python in it means the interpreter,
 * not the corpus.
 *
 * The notebook shows the seam plainly. `jupyter.cells` is still 5 and
 * `jupyter.markdownCells` still 2, because the notebook and markdown analyzers
 * are unaffected — but `jupyter.classes` and `jupyter.functions` fall to 0
 * alongside the standalone Python file, because a notebook's code cells are
 * measured by the same interpreter. Composition means one missing interpreter
 * takes a slice out of two groups at once.
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  python: { command: "python-that-is-not-installed" },
};

export default codometerConfiguration;
