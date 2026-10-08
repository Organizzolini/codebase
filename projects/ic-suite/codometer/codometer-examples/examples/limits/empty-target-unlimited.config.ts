import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The same empty input with nothing limiting it. This passes.
 *
 * The report still says `"empty": true` outright rather than leaving a consumer
 * to infer an empty match from a size of zero. An input nobody limited simply
 * measured nothing, which is unremarkable — the failure in
 * [empty-target-limited.config.ts](./empty-target-limited.config.ts) comes from
 * the limit, not from the empty match.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../limits/empty-target-unlimited.config.ts --check limits
 * echo $?   # 0
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
  python: { command: "uv run python" },
};

export default codometerConfiguration;
