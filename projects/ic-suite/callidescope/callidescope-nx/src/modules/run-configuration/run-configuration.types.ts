// 🏷️ Types

import type { ResolvedCallidescopeConfiguration } from "@callidescope/configuration";

/** A loaded configuration, beside the path the loader settled on. */
export interface LoadedRunConfiguration {
  readonly configuration: ResolvedCallidescopeConfiguration;
  /**
   * Where the configuration was read from, or nothing when none was found.
   *
   * The path the loader settled on rather than the one it was handed, since a
   * search may have answered — and a run resolves a project's own
   * configuration relative to it.
   */
  readonly path: string | undefined;
}

/** Arguments for loading the configuration one run is judged by. */
export interface LoadRunConfigurationArguments {
  /** Resolved from this plugin's `nx.json` registration when omitted. */
  readonly configurationPath?: string | undefined;
  readonly workspaceRoot: string;
}
