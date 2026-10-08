import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The configuration the `--output-*` / `--check` matrix is driven against.
 *
 * It declares both file destinations and one limit that breaches, so every row
 * of the table has something to write and something to fail on. Run each row
 * against a scratch copy of the corpus — the writing rows create files.
 *
 * | Invocation | Writes | Fails on staleness | Fails on a breach |
 * | ---------- | ------ | ------------------ | ----------------- |
 * | `codometer` | no | no | no |
 * | `codometer --check limits` | no | no | yes |
 * | `codometer --check reports` | no | yes | no |
 * | `codometer --check reports,limits` | no | yes | yes |
 * | `codometer --output-json --output-markdown` | yes | no | no |
 * | `codometer --output-json --output-markdown --check limits` | yes | no | yes, after writing |
 *
 * `--output-json`/`--output-markdown` and `--check` are independent, and no
 * combination of them is inferred. Each `--output-*` flag writes its own
 * destination — bare, it writes wherever this configuration says to. The last
 * row is the one worth trying twice: the report is on disk even though the run
 * exits 1, because a gate that suppressed the report would leave the pull
 * request that failed it with nothing to read.
 *
 * Two command lines are refused rather than obeyed, before anything is
 * measured:
 *
 * - `--output-json`/`--output-markdown` combined with `--check reports`,
 *   because nothing can be stale in the run that just wrote it.
 * - a `--check` value the tool does not know.
 *
 * Every complaint about one command line is reported together, so a mistyped
 * flag beside a contradictory one is a single run to fix.
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  limits: [{ label: "Lines", metric: "codebase.linesOfCode", value: 20 }],
  outputs: [
    { indentation: 2, path: "codometer-report.json", type: "json" },
    {
      description: "Measured from the sample corpus.",
      path: "statistics.md",
      type: "markdown",
    },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
