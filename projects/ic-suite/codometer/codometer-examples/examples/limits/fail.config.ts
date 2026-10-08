import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The same limit at the default severity, plus a `warn` beneath it.
 *
 * One metric may carry more than one limit, and the gate enforces all of them:
 * the `warn` at 10 lines is advice and the `fail` at 20 is what stops a change.
 * Both appear in the report, breached, so a consumer can render the headroom
 * rather than only the failure.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../limits/fail.config.ts --check limits
 * echo $?   # 1
 * ```
 *
 * Without `--check limits` the same run prints the breach and exits 0: a breach
 * is a finding, and only the flag turns a finding into a gate.
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  limits: [
    {
      label: "Lines Advisory",
      metric: "codebase.linesOfCode",
      severity: "warn",
      value: 10,
    },
    { label: "Lines", metric: "codebase.linesOfCode", value: 20 },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
