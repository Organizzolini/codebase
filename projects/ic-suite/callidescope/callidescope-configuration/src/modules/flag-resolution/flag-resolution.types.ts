// 🏷️ Types

import type {
  CallidescopeLimitOverrides,
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
} from "../configuration/configuration.types";

/**
 * Every flag a callidescope command line may carry, as parsed and before any
 * of it has met a configuration.
 *
 * One shape for every command rather than one per command: `depth` accepts a
 * subset of what the workspace run accepts, and a subset is expressed by
 * leaving fields out rather than by a second type that would have to be kept
 * in step with this one.
 *
 * The mode flags are carried here even though resolution never merges them,
 * so the rule they obey is stated where the other flags' rules are rather
 * than left to be inferred from their absence.
 *
 * `--config` is deliberately absent: it chooses the file every other flag is
 * resolved against, so by the time resolution runs it has already done its
 * whole job.
 */
export interface CallidescopeRunFlags {
  /** Mode. The written `--check` set, or `true` for the flag with no value. */
  readonly check?: string | true | undefined;
  /** Scope. `--directories`, already split on commas. */
  readonly directories?: readonly string[] | undefined;
  /** Judgement. `--entry-point-addresses`, already split on commas. */
  readonly entryPointAddresses?: readonly string[] | undefined;
  /** Judgement. `--entry-point-decorators`, already split on commas. */
  readonly entryPointDecorators?: readonly string[] | undefined;
  /** Judgement. `--exclude`, already split on commas. */
  readonly exclude?: readonly string[] | undefined;
  /** Judgement. `--exclude-callees`, already split on commas. */
  readonly excludeCallees?: readonly string[] | undefined;
  /** Presentation. `--format`, exactly as it was typed. */
  readonly format?: string | undefined;
  /**
   * Judgement. `--include-exported-functions`, exactly as it was typed.
   *
   * A switch arrives here as written text rather than as a boolean for the
   * same reason `--format` does: which values a switch accepts is this
   * package's to decide, and a `--include-tests maybe` coerced to `true` on
   * the way here could never be refused by the one place that knows better.
   * `true` is the one exception, and it is not a coercion: a switch written
   * with no value at all is how commander reports the flag's own presence.
   */
  readonly includeExportedFunctions?: string | true | undefined;
  /** Judgement. `--include-orphans`, exactly as it was typed. */
  readonly includeOrphans?: string | true | undefined;
  /** Judgement. `--include-tests`, exactly as it was typed. */
  readonly includeTests?: string | true | undefined;
  /** Destination. `--json`, a path and nothing else. */
  readonly json?: string | undefined;
  /** Destination. `--markdown`, a path and nothing else. */
  readonly markdown?: string | undefined;
  /** Judgement. `--maximum-breadth`, exactly as it was typed. */
  readonly maximumBreadth?: string | undefined;
  /** Judgement. `--maximum-depth`, exactly as it was typed. */
  readonly maximumDepth?: string | undefined;
  /** Destination. `--mermaid`, a path and nothing else. */
  readonly mermaid?: string | undefined;
  /** Mode. `--write`. */
  readonly write?: boolean | undefined;
}

/** What a command line and the configuration it was resolved against produced. */
export interface ResolvedRunFlags {
  /**
   * The configuration every override has been applied to.
   *
   * The scope and the destinations a run acts on are read from here rather
   * than from the flags, so nothing downstream has to remember which of the
   * two won.
   */
  readonly configuration: ResolvedCallidescopeConfiguration;
  /**
   * Every reason the command line could not be resolved, collected rather
   * than thrown one at a time, so a command line with two mistakes in it is
   * two mistakes to fix rather than two runs.
   */
  readonly errors: readonly string[];
  /** What the run prints. The default whenever the flag was left off. */
  readonly format: CallidescopeOutputFormat;
  /**
   * The limits a flag chose, and only those.
   *
   * Carried beside the configuration rather than only inside it because a
   * limit is enforced per project: each project's own file declares the number
   * its gate reads, so an override applied only to the workspace's copy would
   * be a flag no gate ever looks at. Empty whenever no limit flag was given.
   */
  readonly limitOverrides: CallidescopeLimitOverrides;
}
