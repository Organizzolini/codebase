import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The same splice between markers of another name.
 *
 * Renaming them is not cosmetic. A document that *explains* the default markers
 * holds the default start marker in its own prose, so codometer reads it as
 * already carrying the block and rewrites the wrong region. Any file
 * documenting codometer therefore renames its own markers — the codometer
 * README does, and so does this package's.
 *
 * ```bash
 * cd packages/codometer-examples/examples/corpus
 * codometer --config ../output/renamed-markers.config.ts --output-markdown
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  outputs: [
    {
      description: "Measured from the sample corpus.",
      endMarker: "<!-- SAMPLE_STATISTICS_END -->",
      path: "statistics.md",
      startMarker: "<!-- SAMPLE_STATISTICS_START -->",
      type: "markdown",
    },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
