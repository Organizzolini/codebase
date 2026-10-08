import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * An input whose globs matched nothing, with a limit written against it.
 *
 * This fails. Declaring a limit asserts the files are there, so an empty match
 * is a glob that stopped matching or a build that never ran — the two failures
 * a size gate exists to catch, and the two an input reporting a comfortable
 * zero would hide.
 *
 * Compare [empty-target-unlimited.config.ts](./empty-target-unlimited.config.ts),
 * which is the identical input with the limit removed and passes.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../limits/empty-target-limited.config.ts --check limits
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  inputs: [
    {
      analyses: ["size"],
      include: ["never-built/**/*.js"],
      name: "Never Built",
    },
  ],
  limits: [{ metric: "Never Built.size", value: "8 KB" }],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
