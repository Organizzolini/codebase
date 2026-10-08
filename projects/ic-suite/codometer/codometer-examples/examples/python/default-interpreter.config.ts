import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The default interpreter: no `python` block at all.
 *
 * Python analysis runs through a real interpreter rather than a parser written
 * in TypeScript, and `python3` on PATH is what it reaches for when nothing says
 * otherwise. On a machine where that interpreter exists, this configuration and
 * [uv.config.ts](./uv.config.ts) report the same numbers from the same file —
 * 3 classes, 4 functions, 1 protocol, 8 docstrings — and the test beside these
 * files asserts exactly that agreement.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../python/default-interpreter.config.ts --format json \
 *   | jq '.targets[0].metrics[] | select(.path | startswith("python."))'
 * ```
 *
 * So why does every other configuration here name one? Because agreement is a
 * property of the machine, not of the configuration. A continuous integration
 * runner with no `python3`, or one whose `python3` predates the syntax a sample
 * uses, reports the same corpus as empty —
 * [unreachable-interpreter.config.ts](./unreachable-interpreter.config.ts) is
 * what that looks like. Naming the interpreter is how a repository stops
 * depending on which machine the run happened on.
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
};

export default codometerConfiguration;
