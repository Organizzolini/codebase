import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * Two configured destinations, spliced with the default markers.
 *
 * The badge block is written between `<!-- codometer:start -->` and
 * `<!-- codometer:end -->`, and the block is **appended** when the markers are
 * absent — so the destination file needs nothing in it beforehand, and is
 * created outright when it does not exist. Both halves are worth trying: run
 * this twice and the second run rewrites the block in place rather than
 * appending a second one.
 *
 * ```bash
 * cd packages/codometer-examples/examples/corpus
 * codometer --config ../output/codometer.config.ts --output-json --output-markdown
 * ```
 *
 * Destinations are resolved against the process's working directory, not
 * against this file — so `statistics.md` lands inside the corpus when the
 * corpus is what the command was run from. That is deliberate here: it is
 * also what [self-excluded.config.ts](./self-excluded.config.ts) demonstrates,
 * since a file codometer would write is never a file it measures.
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
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
