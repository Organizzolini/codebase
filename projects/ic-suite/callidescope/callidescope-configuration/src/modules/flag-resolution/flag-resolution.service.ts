import { Injectable } from "@nestjs/common";

import {
  CALLIDESCOPE_OUTPUT_FORMATS,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_OUTPUT_FORMAT,
} from "../configuration/configuration.constants";

import {
  buildUndeclaredDestinationMessage,
  buildUndeclaredValueMessage,
  buildUnknownFormatMessage,
  buildUnknownSwitchMessage,
  buildUnreadableCountMessage,
} from "./flag-resolution.constants";

import type {
  CallidescopeLimitOverrides,
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeEntryPoints,
  ResolvedCallidescopeLimits,
  ResolvedCallidescopeWriteConfiguration,
} from "../configuration/configuration.types";
import type {
  CallidescopeRunFlags,
  ResolvedRunFlags,
} from "./flag-resolution.types";

/**
 * Combines a command line with the configuration it was resolved against,
 * under one precedence rule.
 *
 * **The rule.** A flag that changes what a run judges or writes may only
 * override a value the configuration already declares. A flag that selects
 * mode or presentation is command-line only, because neither can make an
 * under-configured run legal.
 *
 * `--check` and `--write` are the mode flags and `--format` is the
 * presentation flag, so none of the three is merged into anything here — the
 * format is validated and handed back beside the configuration rather than
 * written into it. Every other flag is an override, so each replaces exactly
 * the field it names and leaves every neighboring field as the configuration
 * wrote it — including whatever resolution folded into that field, which is
 * why `--exclude` keeps the default globs rather than the six of them being
 * neighbors it discards. `--config` never reaches this call at all: it chooses
 * the file the rest are resolved against.
 *
 * Every configured field has such an override, save one. `excludeFrom` names
 * the ignore files a run reads, which is what the run *is* rather than a value
 * it judges by, and it is workspace-only for the same reason — a project
 * cannot redirect it either.
 *
 * The overrides are grouped rather than listed, one private method per nesting
 * level of the configuration, because a single returned literal covering four
 * levels was already the longest thing here at three fields and would not have
 * survived thirteen.
 *
 * One service rather than a merge per command, because the four defects this
 * replaced were each a different command combining one flag with one field
 * its own way: an empty `--directories` beating the configured list, a
 * `--markdown` path discarding the heading and markers beside it, a `--json`
 * path discarding the configured indentation, and an unrecognized `--format`
 * rewritten to markdown instead of refused.
 */
@Injectable()
export class FlagResolutionService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Reads one limit flag into the number it chose, or nothing.
   *
   * Nothing on every path but success — the flag left off, and both refusals —
   * because the caller reads this as *what the command line overrode*, and a
   * refused value reported as an override would be the typo silently winning
   * the argument it just lost.
   *
   * Two refusals rather than one, because they are different mistakes: a value
   * that is not a positive whole number is a typo, and a value with nothing to
   * override is the precedence rule. Only `limits.maximumBreadth` can reach the
   * second — it is the one judged value resolution supplies no default for, and
   * a flag that could supply one would gate a workspace on a number no
   * configuration ever chose.
   */
  private resolveCount(args: {
    configured: number | undefined;
    errors: string[];
    field: string;
    flag: string;
    flagged: string | undefined;
  }): number | undefined {
    if (args.flagged === undefined) {
      return undefined;
    }

    if (args.configured === undefined) {
      args.errors.push(
        buildUndeclaredValueMessage({ field: args.field, flag: args.flag }),
      );

      return undefined;
    }

    const count = Number(args.flagged);

    if (!Number.isInteger(count) || count <= 0) {
      args.errors.push(
        buildUnreadableCountMessage({ flag: args.flag, value: args.flagged }),
      );

      return undefined;
    }

    return count;
  }

  /**
   * Applies a path flag to one configured destination, and to nothing else.
   *
   * Spread over the configured object rather than resolved afresh from the
   * path: a destination carries a heading, a description, its anchors, and
   * its render and write hooks, and re-resolving from a path alone silently
   * replaced every one of them with a default.
   *
   * An undeclared destination is refused rather than invented, which is the
   * precedence rule itself: a flag may change where a declared report goes
   * and may not ask for a report the configuration never declared.
   */
  private resolveDestination<Destination extends { path: string }>(args: {
    configured: Destination | undefined;
    errors: string[];
    field: string;
    flag: string;
    flagged: string | undefined;
  }): Destination | undefined {
    if (args.flagged === undefined) {
      return args.configured;
    }

    if (args.configured === undefined) {
      args.errors.push(
        buildUndeclaredDestinationMessage({
          field: args.field,
          flag: args.flag,
        }),
      );

      return undefined;
    }

    return { ...args.configured, path: args.flagged };
  }

  /**
   * Applies the entry-point flags to the rules a run roots its stacks with.
   *
   * Grouped rather than spread into the caller, so the one returned literal
   * there stays four fields long however many rules this level grows.
   */
  private resolveEntryPoints(args: {
    configured: ResolvedCallidescopeEntryPoints;
    errors: string[];
    flags: CallidescopeRunFlags;
  }): ResolvedCallidescopeEntryPoints {
    const { configured, errors, flags } = args;

    return {
      addresses: this.resolveList({
        configured: configured.addresses,
        flagged: flags.entryPointAddresses,
      }),
      decorators: this.resolveList({
        configured: configured.decorators,
        flagged: flags.entryPointDecorators,
      }),
      includeExportedFunctions: this.resolveSwitch({
        configured: configured.includeExportedFunctions,
        errors,
        flag: "--include-exported-functions",
        flagged: flags.includeExportedFunctions,
      }),
      includeOrphans: this.resolveSwitch({
        configured: configured.includeOrphans,
        errors,
        flag: "--include-orphans",
        flagged: flags.includeOrphans,
      }),
      includeTests: this.resolveSwitch({
        configured: configured.includeTests,
        errors,
        flag: "--include-tests",
        flagged: flags.includeTests,
      }),
    };
  }

  /**
   * Reads `--exclude` the way the configured field beside it is read: over the
   * top of the globs no repository wants traced, never instead of them.
   *
   * `exclude` is the one list resolution does not hand back as written —
   * `resolveExclude` folds `DEFAULT_EXCLUDE_GLOBS` into it, so the array
   * arriving here is the authored globs plus six directories nobody chose.
   * Replacing that array wholesale, as every other list flag rightly does with
   * its own field, therefore threw away the defaults too: `--exclude src/**`
   * traced `node_modules` and `dist`. So the flag overrides what the
   * configuration *authored* and the same additive resolution is re-run over
   * it, which is what makes `--exclude` and an authored `exclude` mean the
   * same thing.
   */
  private resolveExclude(args: {
    configured: string[];
    flagged: readonly string[] | undefined;
  }): string[] {
    if (args.flagged === undefined || args.flagged.length === 0) {
      return args.configured;
    }

    return [...new Set([...DEFAULT_EXCLUDE_GLOBS, ...args.flagged])];
  }

  // A deliberate misspelling: the example of a `--format` value nobody
  // recognizes, which is exactly what this refusal is about.
  // cspell:ignore mermiad
  /**
   * Reads `--format` into one of the formats a run can print.
   *
   * Anything else is refused rather than rewritten. A run that quietly
   * printed markdown for `--format mermiad` exited 0 having taught its reader
   * that the flag does nothing.
   */
  private resolveFormat(args: {
    errors: string[];
    flagged: string | undefined;
  }): CallidescopeOutputFormat {
    if (args.flagged === undefined) {
      return DEFAULT_OUTPUT_FORMAT;
    }

    const matched = CALLIDESCOPE_OUTPUT_FORMATS.find(
      (format) => format === args.flagged,
    );

    if (matched === undefined) {
      args.errors.push(buildUnknownFormatMessage(args.flagged));

      return DEFAULT_OUTPUT_FORMAT;
    }

    return matched;
  }

  /**
   * Reads the limit flags into the numbers they chose, and nothing else.
   *
   * The overrides are what a flag really said, kept apart from the merged
   * configuration below, because a limit is enforced per project: a project's
   * own file declares the number its gate reads, so an override that stopped
   * at the workspace's copy would be a flag no gate ever looks at. A member is
   * absent unless a flag supplied it, which is what lets the override be
   * applied to a declared limit without supplying one where none was declared.
   */
  private resolveLimitOverrides(args: {
    configured: ResolvedCallidescopeLimits;
    errors: string[];
    flags: CallidescopeRunFlags;
  }): CallidescopeLimitOverrides {
    const { configured, errors, flags } = args;
    const overrides: CallidescopeLimitOverrides = {};
    const maximumBreadth = this.resolveCount({
      configured: configured.maximumBreadth,
      errors,
      field: "limits.maximumBreadth",
      flag: "--maximum-breadth",
      flagged: flags.maximumBreadth,
    });
    const maximumDepth = this.resolveCount({
      configured: configured.maximumDepth,
      errors,
      field: "limits.maximumDepth",
      flag: "--maximum-depth",
      flagged: flags.maximumDepth,
    });

    if (maximumBreadth !== undefined) {
      overrides.maximumBreadth = maximumBreadth;
    }

    if (maximumDepth !== undefined) {
      overrides.maximumDepth = maximumDepth;
    }

    return overrides;
  }

  /**
   * Applies the limit overrides to the numbers the run's own configuration
   * declares.
   *
   * An absent breadth limit is left off the object rather than written as an
   * explicit `undefined`: `maximumBreadth` is the one optional member here, and
   * a key that is always present would say a configuration declared a breadth
   * limit of nothing where resolution had simply never been given one.
   */
  private resolveLimits(args: {
    configured: ResolvedCallidescopeLimits;
    overrides: CallidescopeLimitOverrides;
  }): ResolvedCallidescopeLimits {
    const { configured, overrides } = args;
    const maximumBreadth =
      overrides.maximumBreadth ?? configured.maximumBreadth;
    const maximumDepth = overrides.maximumDepth ?? configured.maximumDepth;

    return maximumBreadth === undefined
      ? { maximumDepth }
      : { maximumBreadth, maximumDepth };
  }

  /**
   * Reads one list flag, preferring it over the configuration when it named
   * anything.
   *
   * An empty list is absent rather than a value: `--directories ""` and a
   * `--directories` nobody typed arrive here as the same thing, and reading
   * either as "trace nothing" — or, as this used to, as "trace everything" in
   * defiance of a configuration that said otherwise — silently ignores what
   * was configured. One rule for every list flag, so `--exclude ""` cannot
   * mean something `--directories ""` does not.
   */
  private resolveList(args: {
    configured: string[];
    flagged: readonly string[] | undefined;
  }): string[] {
    return args.flagged === undefined || args.flagged.length === 0
      ? args.configured
      : [...args.flagged];
  }

  /**
   * Reads one switch flag into the boolean it names.
   *
   * Anything but `true` or `false` is refused rather than coerced, for the
   * reason `--format` is: a typo read as either answer changes what the run
   * traces while looking like it was obeyed.
   */
  private resolveSwitch(args: {
    configured: boolean;
    errors: string[];
    flag: string;
    flagged: string | true | undefined;
  }): boolean {
    if (args.flagged === undefined) {
      return args.configured;
    }

    // The flag written with no value at all, which commander reports as its
    // own presence rather than as text. `--include-tests` on its own asks for
    // tests, the way every valueless switch on a command line does.
    if (args.flagged === true) {
      return true;
    }

    if (args.flagged === "true" || args.flagged === "false") {
      return args.flagged === "true";
    }

    args.errors.push(
      buildUnknownSwitchMessage({ flag: args.flag, value: args.flagged }),
    );

    return args.configured;
  }

  /** Applies the path flags to the destinations a run writes. */
  private resolveWrite(args: {
    configured: ResolvedCallidescopeWriteConfiguration;
    errors: string[];
    flags: CallidescopeRunFlags;
  }): ResolvedCallidescopeWriteConfiguration {
    const { configured, errors, flags } = args;

    return {
      json: this.resolveDestination({
        configured: configured.json,
        errors,
        field: "write.json",
        flag: "--json",
        flagged: flags.json,
      }),
      markdown: this.resolveDestination({
        configured: configured.markdown,
        errors,
        field: "write.markdown",
        flag: "--markdown",
        flagged: flags.markdown,
      }),
      mermaid: this.resolveDestination({
        configured: configured.mermaid,
        errors,
        field: "write.mermaid",
        flag: "--mermaid",
        flagged: flags.mermaid,
      }),
    };
  }

  // 🌎 Public Methods

  /**
   * Resolves a whole command line against one configuration.
   *
   * Every complaint is collected rather than thrown at the first one, so a
   * command line with two mistakes in it is two mistakes to fix rather than
   * two runs. Nothing has been traced or written by the time this returns, so
   * a caller that finds `errors` non-empty can refuse with the checkout
   * untouched.
   */
  public resolveRunFlags(args: {
    configuration: ResolvedCallidescopeConfiguration;
    flags: CallidescopeRunFlags;
  }): ResolvedRunFlags {
    const { configuration, flags } = args;
    const errors: string[] = [];
    const format = this.resolveFormat({ errors, flagged: flags.format });
    const limitOverrides = this.resolveLimitOverrides({
      configured: configuration.limits,
      errors,
      flags,
    });

    return {
      configuration: {
        ...configuration,
        directories: this.resolveList({
          configured: configuration.directories,
          flagged: flags.directories,
        }),
        entryPoints: this.resolveEntryPoints({
          configured: configuration.entryPoints,
          errors,
          flags,
        }),
        exclude: this.resolveExclude({
          configured: configuration.exclude,
          flagged: flags.exclude,
        }),
        excludeCallees: this.resolveList({
          configured: configuration.excludeCallees,
          flagged: flags.excludeCallees,
        }),
        limits: this.resolveLimits({
          configured: configuration.limits,
          overrides: limitOverrides,
        }),
        write: this.resolveWrite({
          configured: configuration.write,
          errors,
          flags,
        }),
      },
      errors,
      format,
      limitOverrides,
    };
  }
}
