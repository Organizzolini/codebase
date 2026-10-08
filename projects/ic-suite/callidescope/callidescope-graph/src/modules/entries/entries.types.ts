// 🏷️ Types

import type { UnresolvedCallableAddress } from "../callables/address.types";
import type { DiscoveredCallable } from "../callables/callables.types";
import type { CallGraph } from "../graph/graph.types";
import type { ResolvedCallidescopeEntryPoints } from "@callidescope/configuration";
import type { CallableId, EntryPoint } from "@callidescope/core";

/** What a pass that reads a project's rules works over. */
export interface ClassificationPassArguments extends EntryPointPassArguments {
  /** The rules for a project the workspace configuration speaks for. */
  readonly defaultRules: ProjectEntryRules;
  readonly rulesByProject: ReadonlyMap<string, ProjectEntryRules>;
}

/** The roots a run will measure depth from. */
export interface EntryPointCollection {
  readonly entryPoints: readonly EntryPoint[];
  /**
   * Every declared address that named no callable, or more than one.
   *
   * Returned rather than logged or skipped: a declared address that stops
   * resolving is a root silently leaving the measurement, which lowers the
   * project's depth and loosens its gate with nothing in the output to say so.
   * The caller is what turns these into a refusal.
   */
  readonly unresolvedAddresses: readonly UnresolvedEntryPointAddress[];
}

/**
 * What every pass over a run's callables shares: the run's own arguments, and
 * the roots and claims the passes accumulate between them.
 */
export interface EntryPointPassArguments {
  /** Callables some pass has already rooted, so no later one roots them twice. */
  readonly claimed: Set<CallableId>;
  readonly entryPoints: EntryPoint[];
  readonly resolveArguments: ResolveEntriesArguments;
}

/**
 * One configuration's entry-point rules, with its decorator names in a set.
 *
 * Built once per configuration rather than per callable: `decorators` is
 * authored as a list and asked about once per decorator on every declaration
 * in the workspace.
 */
export interface ProjectEntryRules {
  readonly decorators: ReadonlySet<string>;
  readonly includeExportedFunctions: boolean;
  readonly includeOrphans: boolean;
}

/** Arguments for deciding which callables root a call stack. */
export interface ResolveEntriesArguments {
  readonly callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
  /**
   * The rules a project with no configuration of its own is judged by — the
   * workspace configuration's.
   */
  readonly entryPoints: ResolvedCallidescopeEntryPoints;
  /**
   * The rules a project declared for itself, keyed by project name. A project
   * absent here is judged by `entryPoints`.
   */
  readonly entryPointsByProject: ReadonlyMap<
    string,
    ResolvedCallidescopeEntryPoints
  >;
  readonly graph: CallGraph;
  readonly workspaceRoot: string;
}

/** A declared entry-point address that did not name exactly one callable. */
export interface UnresolvedEntryPointAddress {
  readonly address: string;
  /**
   * The project whose configuration declared it. Absent when the workspace
   * configuration did, which has no project to name.
   */
  readonly projectName: string | undefined;
  /** Why it named no single callable, and what it could have meant instead. */
  readonly resolution: UnresolvedCallableAddress;
}
