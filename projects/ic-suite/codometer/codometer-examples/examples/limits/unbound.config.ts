import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * Two paths that bind to nothing, reported together.
 *
 * `nowhere.at.all` names no metric anything measured. `Compiled.typescript.files`
 * names a real counter on a real input — but that input runs `size` and
 * nothing else, so the counter was never produced and there is nothing to
 * limit. Both are failures rather than silent zeroes, and both are collected
 * before the run gives up, so a configuration with two broken limits is one run
 * to diagnose rather than two.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../limits/unbound.config.ts --check limits
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  inputs: [
    {
      analyses: ["size"],
      directory: "..",
      include: ["compiled/**/*.js"],
      name: "Compiled",
    },
  ],
  limits: [
    { metric: "nowhere.at.all", value: 1 },
    { metric: "Compiled.typescript.files", value: 1 },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
