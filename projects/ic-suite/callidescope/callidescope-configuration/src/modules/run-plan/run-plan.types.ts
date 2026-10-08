// 🏷️ Types

import type {
  CallidescopeLimitOverrides,
  CallidescopeLimits,
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
} from "../configuration/configuration.types";

/**
 * Options `depth` and `breadth` accept, scoping a lookup to one workspace.
 *
 * Every override that shapes the graph is here, and no other kind is. A lookup
 * gates nothing and writes nothing, so a limit or a destination has nothing to
 * act on — overriding one would change a number this command never reads.
 */
export interface AddressCommandOptions {
  /**
   * Callable addresses to report on, each `<file>#<qualified-name>`.
   *
   * Prompted for when empty. Required in the sense that a run cannot proceed
   * without one — but asked for rather than refused, so the flag is only
   * mandatory on a command line nobody is watching.
   */
  readonly addresses?: string[] | undefined;
  readonly config?: string | undefined;
  /** Project directories to trace. Every project in the workspace when omitted. */
  readonly directories?: string[] | undefined;
  /** Overrides `entryPoints.addresses` for this lookup. */
  readonly entryPointAddresses?: string[] | undefined;
  /** Overrides `entryPoints.decorators` for this lookup. */
  readonly entryPointDecorators?: string[] | undefined;
  /** Overrides `exclude` for this lookup. */
  readonly exclude?: string[] | undefined;
  /** Overrides `excludeCallees` for this lookup. */
  readonly excludeCallees?: string[] | undefined;
  /** `--format`, exactly as it was typed, for the resolver to judge. */
  readonly format?: string | undefined;
  /** Overrides `entryPoints.includeExportedFunctions`, as it was typed. */
  readonly includeExportedFunctions?: string | true | undefined;
  /** Overrides `entryPoints.includeOrphans`, as it was typed. */
  readonly includeOrphans?: string | true | undefined;
  /** Overrides `entryPoints.includeTests`, as it was typed. */
  readonly includeTests?: string | true | undefined;
}

/** Options the CLI accepts. */
export interface CallidescopeCommandOptions {
  /**
   * The written `--check` set, or `true` for the flag passed without one.
   *
   * Kept as written rather than read into booleans here, so the one place that
   * knows which names exist is the only place that decides what they mean.
   */
  readonly check?: string | true | undefined;
  readonly config?: string | undefined;
  /** Project directories to trace. Every project in the workspace when omitted. */
  readonly directories?: string[] | undefined;
  /** Overrides `entryPoints.addresses` for this run. */
  readonly entryPointAddresses?: string[] | undefined;
  /** Overrides `entryPoints.decorators` for this run. */
  readonly entryPointDecorators?: string[] | undefined;
  /** Overrides `exclude` for this run. */
  readonly exclude?: string[] | undefined;
  /** Overrides `excludeCallees` for this run. */
  readonly excludeCallees?: string[] | undefined;
  /**
   * `--format`, exactly as it was typed.
   *
   * Left wide on purpose: a value nobody recognizes is refused by the one
   * resolver that knows which formats exist, rather than rewritten to
   * markdown before it ever gets there.
   */
  readonly format?: string | undefined;
  /**
   * Overrides `entryPoints.includeExportedFunctions`, exactly as it was typed.
   *
   * `true` is the flag written with no value at all, which is how commander
   * reports its presence — not a value anybody typed.
   */
  readonly includeExportedFunctions?: string | true | undefined;
  /** Overrides `entryPoints.includeOrphans`, exactly as it was typed. */
  readonly includeOrphans?: string | true | undefined;
  /** Overrides `entryPoints.includeTests`, exactly as it was typed. */
  readonly includeTests?: string | true | undefined;
  readonly json?: string | undefined;
  readonly markdown?: string | undefined;
  /** Overrides `limits.maximumBreadth`, exactly as it was typed. */
  readonly maximumBreadth?: string | undefined;
  /** Overrides `limits.maximumDepth`, exactly as it was typed. */
  readonly maximumDepth?: string | undefined;
  readonly mermaid?: string | undefined;
  readonly write?: boolean | undefined;
}

/**
 * What a lookup command line and its configuration resolved to.
 *
 * Everything a run resolves except the mode: `depth` and `breadth` never
 * write or compare a destination, so they have no `--check` or `--write` set
 * to select and nothing about one to reject.
 */
export interface PreparedLookup {
  readonly authoredLimits: CallidescopeLimits | undefined;
  /** The configuration, with the scope a `--directories` flag named applied. */
  readonly configuration: ResolvedCallidescopeConfiguration;
  readonly configurationPath: string | undefined;
  readonly format: CallidescopeOutputFormat;
  readonly workspaceRoot: string;
}

/** What a command line and its configuration resolved to. */
export interface PreparedRun {
  /**
   * The limits the workspace file itself wrote down, exactly as authored.
   *
   * Carried beside the resolved configuration because resolution manufactures
   * a default for every limit, so only this can say which numbers that file
   * really chose — and the workspace row names a file only when one did.
   */
  readonly authoredLimits: CallidescopeLimits | undefined;
  /**
   * The configuration every flag override has already been applied to.
   *
   * The scope a run traces and the destinations it writes are read from here
   * rather than from the options, so nothing downstream has to remember which
   * of a flag and a configured value won.
   */
  readonly configuration: ResolvedCallidescopeConfiguration;
  /**
   * The file the configuration was read from, or `undefined` when the search
   * found none and the run is on the tool's defaults.
   *
   * The trace resolves a configuration beside every project it reaches, and
   * skips this one: a file a run was pointed at is already that run's workspace
   * configuration, and reading it again as a project's would refuse it for the
   * workspace-only fields it is entitled to set.
   */
  readonly configurationPath: string | undefined;
  /**
   * What the run prints to standard output.
   *
   * A presentation choice a command line makes for this one invocation, never
   * a value a configuration file writes down.
   */
  readonly format: CallidescopeOutputFormat;
  /**
   * The limits this command line overrode, if any.
   *
   * Carried past the resolved configuration because a limit is enforced per
   * project: each project's own file declares the number its gate reads, so an
   * override left in the workspace's copy alone would be a flag no gate looks
   * at.
   */
  readonly limitOverrides: CallidescopeLimitOverrides;
  readonly mode: RunMode;
  readonly workspaceRoot: string;
}

/**
 * What the run does with what it traces.
 *
 * The four are independent. Writing gates on `writes` alone, staleness on
 * `checksReports` alone, a stack that is too deep on `checksDepth` alone, and
 * a callable calling too many things on `checksBreadth` alone, so no flag
 * ever quietly turns another one on.
 */
export interface RunMode {
  readonly checksBreadth: boolean;
  readonly checksDepth: boolean;
  readonly checksReports: boolean;
  readonly writes: boolean;
}

/**
 * What the command line asked the run to do, and what it could not make sense of.
 *
 * Every complaint is collected before any of them is reported, so a command
 * line with two mistakes in it is two mistakes to fix rather than two runs.
 */
export interface RunModeSelection {
  readonly errors: readonly string[];
  readonly mode: RunMode;
}

/**
 * What one command line resolved to, and what could not be made sense of.
 *
 * Both together rather than one or the other, because refusing is the host's
 * act rather than this layer's: resolving a run is deciding what it would do,
 * and saying so on a terminal is what the command-line host is for. Every
 * complaint is collected before any of them is reported, so a command line
 * with two mistakes in it is two mistakes to fix rather than two runs.
 */
export interface RunPreparation {
  readonly errors: readonly string[];
  /** Absent exactly when `errors` is not empty. */
  readonly run: PreparedRun | undefined;
}
