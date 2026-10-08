import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The corpus measured at gzip, which is what an input compresses with by
 * default. Level 9, stated rather than defaulted.
 *
 * Each file is compressed **on its own** and the results summed — never all of
 * them together as one archive. That matters for a bundle-size gate: it is the
 * number a browser pays, file by file over the wire, rather than the smaller
 * number a tar of the whole directory would report by finding redundancy
 * across files nobody downloads together.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../compression/gzip.config.ts
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  inputs: [
    {
      analyses: ["size"],
      compression: "gzip",
      directory: "..",
      include: ["compiled/**/*.js"],
      name: "Compiled",
    },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
