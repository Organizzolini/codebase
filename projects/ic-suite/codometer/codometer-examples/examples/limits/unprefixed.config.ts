import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The stumble almost everyone hits first: a path with no input name on it.
 *
 * `linesOfCode` is a real metric, spelled correctly, on the only input this
 * run measures. It still binds to nothing. An unprefixed path is read as the
 * default input's, and `defaultInput` is unset here — so there is no default
 * for it to be read as, and codometer refuses rather than guessing that the one
 * input measured must be the one meant.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../limits/unprefixed.config.ts --check limits
 * ```
 *
 * ```text
 * Cannot bind the limit written against "linesOfCode": nothing measured answers
 * to it. Measured targets: "codebase". Write the target's name in front of the
 * metric path, or configure a default target.
 * ```
 *
 * Both fixes are shipped beside this file: write it out in full, as
 * [warn.config.ts](./warn.config.ts) does with `codebase.linesOfCode`, or set
 * `defaultInput`, as [default-target.config.ts](./default-target.config.ts)
 * does. Prefer the first where an input and a metric group might ever share a
 * name — see [ambiguous.config.ts](./ambiguous.config.ts) for what a
 * `defaultInput` can break.
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  limits: [{ metric: "linesOfCode", value: 10 }],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
