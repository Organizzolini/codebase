// 🏷️ Types

import type {
  ProjectLimitsLookup,
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeWriteConfiguration,
} from "@callidescope/configuration";
import type { CallGraphResult, ProjectReport } from "@callidescope/core";

/** Arguments for writing every configured destination. */
export interface SyncDestinationsArguments {
  readonly check: boolean;
  readonly configuration: ResolvedCallidescopeConfiguration;
  /** The depth and breadth limits each traced project is judged against. */
  readonly projectLimits: ProjectLimitsLookup;
  readonly result: CallGraphResult;
  /**
   * Workspace-relative root of each project the run was scoped to, keyed by
   * name. Only these projects have a section published, so a scoped run never
   * writes into a dependency it merely measured.
   */
  readonly startingProjectRoots: ReadonlyMap<string, string>;
  /**
   * The written destinations each project declared for itself, by name.
   *
   * Every traced project declares a complete configuration, so every one of
   * them is named here — a project publishing nothing wrote `markdown:
   * undefined` rather than being absent.
   */
  readonly writeByProject: ReadonlyMap<
    string,
    ResolvedCallidescopeWriteConfiguration
  >;
}

/** Arguments for writing the destinations one project declared for itself. */
export interface SyncProjectSectionsArguments {
  readonly check: boolean;
  /** The depth and breadth limits each traced project is judged against. */
  readonly projectLimits: ProjectLimitsLookup;
  /** The findings for the one project these destinations belong to. */
  readonly report: ProjectReport;
  readonly result: CallGraphResult;
  /** Workspace-relative root every declared path is read against. */
  readonly root: string;
  readonly write: ResolvedCallidescopeWriteConfiguration;
}
