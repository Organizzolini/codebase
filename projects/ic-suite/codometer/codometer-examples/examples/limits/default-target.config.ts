import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The `defaultInput` case the codometer configuration README calls out by
 * name.
 *
 * An input here is called `typescript`, and the codebase carries a metric
 * group called `typescript` too. With `defaultInput: "codebase"`, an
 * unprefixed path is read as the default target's whenever no input name
 * competes for it — so `typescript.interfaces` is the **codebase's** six
 * interfaces, because the `typescript` input has no `interfaces` metric of
 * its own to disagree with.
 *
 * `typescript.files` under this same configuration is the opposite case: both
 * readings exist, so it is refused rather than chosen between. That one is
 * [ambiguous.config.ts](./ambiguous.config.ts), written against `markdown` for
 * the same reason.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../limits/default-target.config.ts --check limits
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  defaultInput: "codebase",
  format: "markdown",
  inputs: [
    {
      analyses: ["size"],
      include: ["typescript/**/*.ts"],
      name: "typescript",
    },
  ],
  limits: [{ label: "Interfaces", metric: "typescript.interfaces", value: 10 }],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
