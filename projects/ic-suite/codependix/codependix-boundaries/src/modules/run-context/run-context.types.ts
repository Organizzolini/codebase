// 🏷️ Types

import type {
  CodependixGraphType,
  CodependixProjectConfiguration,
  ResolvedCodependixConfiguration,
} from "@codependix/configuration";
import type { CodependixRunMode } from "@codependix/core";
import type { NxProject, NxProjectGraph } from "@codependix/nx-projects";

/**
 * Everything every graph-type pass reads, resolved once per run rather than
 * once per pass — see `GraphRunService.run`.
 *
 * Stated here, beside `BoundaryCheckContext`, because resolving it is the
 * first thing every run does and the boundary gate is one of its readers:
 * the wider context carries an export mode the gate never looks at, and is
 * structurally assignable to `BoundaryCheckContext`, so nothing is repacked
 * at the call site.
 */
export interface GraphRunContext {
  configuration: ResolvedCodependixConfiguration;
  /**
   * The graph types this run builds, checks, and writes.
   *
   * All three unless `--no-file-imports`, `--no-nestjs-modules`, or
   * `--no-nx-projects` narrowed it — see `RunContextService.build`. Read by
   * `GraphRunService.run` to skip a whole pass, and by
   * `BoundaryCheckService.run` to skip a boundary level, so a developer can
   * run a narrower, faster check locally without editing configuration.
   */
  enabledGraphTypes: ReadonlySet<CodependixGraphType>;
  graph: NxProjectGraph;
  mode: CodependixRunMode;
  /**
   * Every project's own `codependix.config.ts`, keyed by project name — or
   * `undefined` for a project naming none of its own.
   *
   * Loaded once per run, alongside `projects`, so every pass reads the same
   * snapshot rather than each re-reading the filesystem for every graph type
   * it resolves. Read as-is by `ConfigurationService.resolveForProject` — see
   * that method for why no further merge happens here.
   */
  projectConfigurations: Map<
    string,
    CodependixProjectConfiguration | undefined
  >;
  /** Every project the graph knows, apart from the workspace root. */
  projects: NxProject[];
  /**
   * The projects `--projects` and `--tags` narrowed the run to.
   *
   * Identical to `projects` when a run named neither, which is what keeps the
   * Workspace Graph whole and the boundary gate judging every project by
   * default. `include`/`exclude` never reach this: they decide which projects
   * have exports written, not which projects a graph is drawn over.
   */
  selectedProjects: NxProject[];
  workingDirectory: string;
}
