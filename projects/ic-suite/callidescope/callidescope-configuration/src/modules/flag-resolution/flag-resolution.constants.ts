// ♟️ Constants

import { CALLIDESCOPE_OUTPUT_FORMATS } from "../configuration/configuration.constants";
import { InputError } from "../input/input.constants";

// 🚫 Refusals

// A deliberate misspelling: the example of a `--format` value nobody
// recognizes, which is exactly what this refusal is about.
// cspell:ignore mermiad

/**
 * Says a format nobody recognizes is a typo rather than a request.
 *
 * Rewriting it to markdown is what this replaces: a run that quietly ignored
 * `--format mermiad` printed a tree, exited 0, and taught its reader that the
 * flag does nothing.
 */
export const buildUnknownFormatMessage = (value: string): string =>
  `--format does not accept "${value}". It takes one of ${CALLIDESCOPE_OUTPUT_FORMATS.map(
    (format) => `"${format}"`,
  ).join(", ")}.`;

/**
 * Says a path flag has nothing to override.
 *
 * The whole of the precedence rule in one sentence: a flag may change a value
 * the configuration already declares and may not supply one it left out. A
 * flag that could conjure a destination would let any command line write a
 * report the configuration never asked for, which is how a requirement that
 * configuration be complete gets circumvented from a terminal.
 */
export const buildUndeclaredDestinationMessage = (args: {
  field: string;
  flag: string;
}): string =>
  `${args.flag} overrides a destination the configuration does not declare. Add \`${args.field}\` to the configuration this run reads, then use ${args.flag} to send it somewhere else.`;

/**
 * Says a switch was given something that is neither true nor false.
 *
 * Guessing is what this replaces: a `--include-tests maybe` read as `true`
 * would trace every test file in the workspace on the strength of a typo, and
 * read as `false` would silently trace none of them.
 */
export const buildUnknownSwitchMessage = (args: {
  flag: string;
  value: string;
}): string =>
  `${args.flag} does not accept "${args.value}". It takes "true" or "false", or the flag on its own for "true".`;

/**
 * Says a limit flag was given something that is not a number.
 *
 * A limit decides what a run fails on, so a value nobody can read has to be
 * refused rather than dropped: a `--maximum-depth deep` quietly ignored leaves
 * the configured number gating a run whose author believed they had changed it.
 */
export const buildUnreadableCountMessage = (args: {
  flag: string;
  value: string;
}): string =>
  `${args.flag} does not accept "${args.value}". It takes a positive whole number.`;

/**
 * Says a value flag has nothing to override.
 *
 * The sibling of the destination refusal above, and the same rule: only
 * `limits.maximumBreadth` can reach it, that being the one judged value with
 * no default. A `--maximum-breadth` that could supply one would let a command
 * line gate a workspace on a number no configuration ever chose, which is
 * exactly the refusal `--check breadth` exists to make.
 */
export const buildUndeclaredValueMessage = (args: {
  field: string;
  flag: string;
}): string =>
  `${args.flag} overrides a value the configuration does not declare. Add \`${args.field}\` to the configuration this run reads, then use ${args.flag} to change it.`;

/**
 * One refusal covering every flag a command line got wrong.
 *
 * An `InputError` rather than a class of its own: to whoever catches it this
 * is the same event as any other unusable command line — nothing was
 * attempted, and the fix is to retype the flags.
 */
export const flagResolutionError = (reasons: readonly string[]): InputError =>
  new InputError(reasons.join(" "));
