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
   * The projects the run was narrowed to, which is what every level judges.
   *
   * Identical to `projects` unless `--projects` or `--tags` named a
   * selection, so the gate judges the whole workspace by default and a
   * narrowed run is something the command line asked for explicitly.
   */
  readonly selectedProjects: NxProject[];
  readonly workingDirectory: string;
}

/** One project whose graph could not be built, and why. */
export interface BoundaryCheckFailure {
  readonly error: string;
  readonly projectName: string;
}

/**
 * What one `--check boundaries` pass found.
 *
 * Failures are carried beside violations rather than thrown, for the same
 * reason every export pass carries them: a NestJS project that cannot boot
 * its container says nothing about whether the other thirty-six break a rule,
 * and a run that abandoned the rest would report a smaller problem than it
 * has.
 */
export interface BoundaryCheckOutcome {
  readonly failures: BoundaryCheckFailure[];
  readonly violations: BoundaryViolation[];
}

/** Arguments accepted when judging one graph level against its rules. */
export interface LevelCheckArguments {
  readonly context: BoundaryCheckContext;
  readonly level: CodependixBoundaryLevel;
  readonly rules: readonly CodependixBoundaryRule[];
}
