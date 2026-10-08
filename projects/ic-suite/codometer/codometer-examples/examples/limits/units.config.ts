import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * How a size written as a string is read.
 *
 * The unit is **decimal** and its trailing `b` is required: `"8 KB"` is 8000
 * bytes and `"1 MB"` is 1000000, not 8192 and 1048576. The two limits below sit
 * either side of the input's real size, so one holds and one breaches — which
 * is what proves the numbers were read as claimed rather than merely accepted.
 *
 * A bare number means bytes and carries no unit at all.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../limits/units.config.ts --check limits
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  inputs: [
    {
      analyses: ["size"],
      compression: "gzip",
      include: ["**/*"],
      name: "Corpus",
    },
  ],
  limits: [
    // 8000 bytes. The input compresses to more than that, so this breaches.
    { label: "Eight Kilobytes", metric: "Corpus.size", value: "8 KB" },
    // 1000000 bytes. Nothing here is close, so this holds.
    { label: "One Megabyte", metric: "Corpus.size", value: "1 MB" },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
