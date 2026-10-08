// 🏷️ Types

import type {
  BoundaryViolation,
  CodependixBoundaryLevel,
} from "../boundaries/boundaries.types";
import type {
  CodependixBoundaryRule,
  CodependixGraphType,
  ResolvedCodependixConfiguration,
} from "@codependix/configuration";
import type { NxProject, NxProjectGraph } from "@codependix/nx-projects";

/**
 * Everything a boundary check reads about the workspace it is judging.
 *
 * Stated apart from `GraphRunContext` — the wider run context this package
 * also owns, which carries an export mode the gate never reads — so a caller
 * that only judges boundaries never has to name an export mode it has none
 * of. `GraphRunContext` is structurally assignable to this, so nothing has to
 * be repacked at the call site.
 */
export interface BoundaryCheckContext {
  /**
   * The projects every level's graph is built over: `selectedProjects` and
   * everything they depend on, or `selectedProjects` alone under
   * `--no-dependencies` — see `RunContextService.resolveBuildProjects`.
   */
  readonly buildProjects: NxProject[];
  readonly configuration: ResolvedCodependixConfiguration;
  /**
   * The graph types this run judges.
   *
   * Read by `BoundaryCheckService.run` to skip every level under a disabled
   * graph type before a single graph is built — see
   * `RunContextService.resolveEnabledGraphTypes`, which is where a run
   * resolves this from `--no-file-imports`, `--no-nestjs-modules`, and
   * `--no-nx-projects`.
   */
  readonly enabledGraphTypes: ReadonlySet<CodependixGraphType>;
  readonly graph: NxProjectGraph;
  /** Every project the graph knows, apart from the workspace root. */
  readonly projects: NxProject[];
  /**
   * The projects the run was narrowed to: a finding fails the run only when
   * it is charged to one of these.
   *
   * Identical to `projects` unless `--projects` or `--tags` named a
   * selection, so the gate judges the whole workspace by default and a
   * narrowed run is something the command line asked for explicitly.
   */
  readonly selectedProjects: NxProject[];
  readonly workingDirectory: string;
}

/**
 * One graph that could not be built, charged to the project(s) it was being
 * built for.
 *
 * A container that cannot boot fails its own project, since that container
 * really cannot boot — but the class it failed on often lives in a
 * dependency, so `ownerProject` names that dependency when the stack shows it.
 */
export interface BoundaryCheckFailure {
  /** The raised error's message. */
  readonly error: string;
  readonly level: CodependixBoundaryLevel;
  /**
   * The project owning the first stack frame inside the root of a project
   * the charged ones depend on, when that is not a charged project. Absent when no frame resolves to a
   * project: a guessed owner would blame a project that did nothing wrong.
   */
  readonly ownerProject?: string | undefined;
  /** The projects this failure is charged to, sorted. */
  readonly projects: readonly string[];
}

/**
 * What one `--check boundaries` pass found, each finding judged.
 *
 * Failures are carried beside violations rather than thrown, for the same
 * reason every export pass carries them: a NestJS project that cannot boot
 * its container says nothing about whether the other thirty-six break a rule,
 * and a run that abandoned the rest would report a smaller problem than it
 * has.
 */
export interface BoundaryCheckOutcome {
  readonly failures: JudgedBoundaryFinding<BoundaryCheckFailure>[];
  readonly violations: JudgedBoundaryFinding<BoundaryViolation>[];
}

/** What every level found, charged but not yet judged. */
export interface BoundaryLevelOutcome {
  readonly failures: BoundaryCheckFailure[];
  readonly violations: BoundaryViolation[];
}

/**
 * Whether a finding fails the run, or is reported as a note against the
 * dependency it lives in.
 *
 * `"fail"` when a charged project is one the run judges; `"note"` when every
 * charged project is only in the build set — a dependency the judged
 * projects are built from, whose finding they inherit but cannot fix.
 */
export type BoundaryVerdict = "fail" | "note";

/** Arguments accepted when collecting one graph's failure. */
export interface CollectFailureArguments {
  readonly error: unknown;
  /**
   * The whole Nx project graph, rather than the build set, so an owner is
   * still found in a dependency `--no-dependencies` left out of the build.
   */
  readonly graph: NxProjectGraph;
  readonly level: CodependixBoundaryLevel;
  /** The projects the failing graph was being built for. */
  readonly projects: readonly string[];
  /** Every project the workspace knows, for resolving the failure's owner. */
  readonly workspaceProjects: readonly NxProject[];
}

/** A violation or failure, with the verdict the run reached on it. */
export type JudgedBoundaryFinding<Finding> = Finding & {
  readonly verdict: BoundaryVerdict;
};

/** Arguments accepted when judging one graph level against its rules. */
export interface LevelCheckArguments {
  readonly context: BoundaryCheckContext;
  readonly level: CodependixBoundaryLevel;
  readonly rules: readonly CodependixBoundaryRule[];
}
