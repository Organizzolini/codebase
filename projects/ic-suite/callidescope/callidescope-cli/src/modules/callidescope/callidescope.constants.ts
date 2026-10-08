// ♟️ Constants

import { InputError } from "@callidescope/configuration";
import { ProgramConfigurationError } from "@callidescope/graph";

import { isRefusedProjectConfiguration } from "../address-lookup/address-lookup.constants";

/**
 * Whether a `new` expression pushes a frame.
 *
 * It does. Constructors in this repository do real work — reading files,
 * building indexes — so treating construction as free would understate every
 * stack that runs through one.
 */
export const INCLUDE_CONSTRUCTOR_EDGES = true;

// 🚫 Refusals

/** Headline a command line the input service refused is reported under. */
export const REJECTED_COMMAND_LINE = "🔭 Rejected the command line";

/** Headline a project whose `tsconfig.json` could not be read is reported under. */
export const REJECTED_PROJECT = "🔭 Rejected a project it could not read";

/** Headline a project's own refused configuration file is reported under. */
export const REJECTED_PROJECT_CONFIGURATION =
  "🔭 Rejected a project configuration";

/**
 * Says a bare argument named no command, and lists the ones that exist.
 *
 * The price of `callidescope` being the default command: a name commander
 * cannot match is no longer an unknown command, it is an operand handed to the
 * default — so a `deep` typed where `depth` was meant would otherwise trace the whole
 * workspace and report success rather than saying the word does not exist. This turns that
 * back into a refusal, which is the whole reason `run` looks at the parameters
 * it is otherwise given no use for.
 */
export const buildUnknownCommandMessage = (name: string): string =>
  `${name} is not a callidescope command, and the trace takes no positional arguments. Run one of depth, breadth, or limits, or drop the argument to trace the workspace.`;

/**
 * The headline an error a command may refuse is reported under, or nothing
 * when it is not one of them.
 *
 * Every command asks this one question, so a fourth refusal class is
 * remembered once rather than in each command's `catch`. Two of them forgot
 * the third and crashed with a raw stack instead of naming a file somebody
 * wrote, which is the failure this exists to make unrepeatable.
 *
 * Deliberately narrow, the same way `isRefusedProjectConfiguration` is:
 * anything absent here is callidescope's own fault and keeps its stack.
 *
 * A free function rather than a service method, for the reason the predicate
 * it calls gives — the commands mock their services, and a classification
 * reached through a mock decides nothing.
 */
export const readRefusalHeadline = (error: unknown): string | undefined => {
  if (error instanceof ProgramConfigurationError) {
    return REJECTED_PROJECT;
  }

  if (
    isRefusedProjectConfiguration(error) ||
    error instanceof UnresolvedEntryPointAddressError
  ) {
    return REJECTED_PROJECT_CONFIGURATION;
  }

  return error instanceof InputError ? REJECTED_COMMAND_LINE : undefined;
};

// 🚨 Errors

/**
 * Raised when a declared `entryPoints.addresses` entry named no callable, or
 * more than one.
 *
 * Fatal to the whole run rather than logged and stepped over. A rename that
 * silently drops a declared root would otherwise lower the project's measured
 * depth with nothing in the output to say so — the same failure codometer
 * already refuses when a limit binds to no metric, and the spec this feature
 * shipped from names it the single highest-value refusal in it. One error
 * covers every unresolved address a run found, so a run with several
 * problems is fixed from one message rather than one refusal at a time.
 *
 * Takes the sentences already written rather than the addresses themselves:
 * wording one of them needs `AddressService` to render an ambiguous address's
 * candidates, and a `*.constants.ts` that reaches a service is not holding
 * constants. `CallidescopeCommand` writes them; this only joins them.
 */
export class UnresolvedEntryPointAddressError extends Error {
  constructor(descriptions: readonly string[]) {
    super(UnresolvedEntryPointAddressError.joinDescriptions(descriptions));
    this.name = "UnresolvedEntryPointAddressError";
  }

  /**
   * Joins one sentence per unresolved address into one refusal.
   *
   * Numbered and counted rather than run together: these reach a log line the
   * logger prints on a single line, so six sentences with nothing between them
   * arrive as a paragraph with no way to see where one problem ends and the
   * next begins. A lone problem is left as the sentence it is, since numbering
   * a list of one is noise.
   */
  private static joinDescriptions(descriptions: readonly string[]): string {
    const [only] = descriptions;

    if (only !== undefined && descriptions.length === 1) {
      return only;
    }

    const numbered = descriptions
      .map((description, index) => `(${String(index + 1)}) ${description}`)
      .join(" ");

    return `${String(descriptions.length)} declared entry points did not resolve. ${numbered}`;
  }
}
