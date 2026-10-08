import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The same files at brotli quality 11, so the difference against
 * [gzip](./gzip.config.ts) is visible rather than asserted.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../compression/brotli.config.ts
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  inputs: [
    {
      analyses: ["size"],
      compression: "brotli",
      directory: "..",
      include: ["compiled/**/*.js"],
      name: "Compiled",
    },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
