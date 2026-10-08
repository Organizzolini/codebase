import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The same files uncompressed — the bytes on disk.
 *
 * Useful as the denominator: it is what the gzip and brotli numbers are a
 * fraction of, and it is what a limit should be written against when the files
 * are not served over a network at all.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../compression/none.config.ts
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  inputs: [
    {
      analyses: ["size"],
      compression: "none",
      directory: "..",
      include: ["compiled/**/*.js"],
      name: "Compiled",
    },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
