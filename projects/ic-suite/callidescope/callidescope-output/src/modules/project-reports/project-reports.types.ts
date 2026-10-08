// 🏷️ Types

import type { ProjectLimitsLookup } from "@callidescope/configuration";
import type {
  CallableId,
  DeepStackFinding,
  ProjectReport,
  WideCallableFinding,
} from "@callidescope/core";
import type {
  BreadthMeasurement,
  CallGraph,
  CondensedGraph,
  DepthMeasurement,
  DiscoveredCallable,
  EntryPointCollection,
} from "@callidescope/graph";

/** Arguments for scoping a run's findings to each project that produced them. */
export interface BuildProjectReportsArguments {
  readonly breadthMeasurement: BreadthMeasurement;
  readonly callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
  readonly condensed: CondensedGraph;
  readonly entryPoints: EntryPointCollection;
  readonly fileCountByProject: ReadonlyMap<string, number>;
  readonly graph: CallGraph;
  readonly measurement: DepthMeasurement;
  readonly projectNames: readonly string[];
}

/** Arguments for picking the findings a named set of projects owns. */
export interface FindOwnedFindingsArguments {
  readonly limits: ProjectLimitsLookup;
  /** The projects entitled to fail on what they own. */
  readonly projectNames: readonly string[];
  readonly reports: readonly ProjectReport[];
}

/** The findings one set of projects owns, each judged by that project. */
export interface OwnedFindings {
  readonly deepStacks: readonly DeepStackFinding[];
  readonly wideCallables: readonly WideCallableFinding[];
}
