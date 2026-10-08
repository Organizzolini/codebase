// 🏷️ Types

import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

/** One configuration file, and everything it resolved to for its own folder. */
export interface ConfiguredDirectory {
  /** The configuration with every default applied, absent when it failed to load. */
  configuration: ResolvedCodometerConfiguration | undefined;
  /** Directory the configuration was resolved for, relative to the walk root. */
  directory: string;
  /** Why the file could not be read, and `undefined` when it was read. */
  error: string | undefined;
  /** Configuration file that answered, relative to the walk root. */
  path: string;
}

/** One row of the limits listing. */
export interface ConfiguredLimitRow {
  /** Directory the limit gates, relative to the walk root. */
  directory: string;
  /** Written label, or a dash when none was written. */
  label: string;
  /** Metric path the limit is written against. */
  metric: string;
  /** Configuration file the limit is declared in, relative to the walk root. */
  path: string;
  severity: string;
  /** Rendered with its unit, so a size reads as a size and a count as a count. */
  value: string;
}

/** Everything a tree configures, plus whatever answered for its root. */
export interface ConfiguredTree {
  described: ConfiguredDirectory[];
  /**
   * Why nothing could be resolved for the walk root, and `undefined` when
   * something was.
   *
   * Carried rather than thrown. The listing is most wanted precisely when the
   * configuration is in a state somebody is trying to understand, so an
   * unreadable root is reported and the walk goes on with the built-in
   * exclusions — but it still fails the run's exit code.
   */
  rootError: string | undefined;
}

/** Which tree to describe, and which configuration answers for its root. */
export interface DescribeConfigurationsArguments {
  /**
   * Configuration file answering for the walk root, when one is named.
   *
   * `undefined` searches upward from the walk root instead. A workspace whose
   * root carries no configuration file — because its shared object lives
   * somewhere every project spreads it from — names that file here, exactly as
   * the workspace-root measurement target already does.
   */
  configurationPath: string | undefined;
  /** Directory the walk starts from, absolute. */
  workingDirectory: string;
}

/** Every configuration file a walk found, plus whatever the walk root said. */
export interface DiscoveredConfigurationFiles {
  /** Configuration file paths, relative to the walk root, in walk order. */
  files: string[];
  /** Why nothing answered for the walk root, and `undefined` when it did. */
  rootError: string | undefined;
}

/** Arguments accepted when rendering the configuration listing. */
export interface RenderConfigurationArguments {
  described: readonly ConfiguredDirectory[];
  format: string;
  limitRows: readonly ConfiguredLimitRow[];
  limitsOnly: boolean;
  rootError: string | undefined;
}

/** The exclusions a configuration walk uses, and why they may be the defaults. */
export interface WalkExclusions {
  /** Why the walk root's configuration could not be read, if it could not. */
  error: string | undefined;
  exclude: string[];
  excludeFrom: string[];
}
