// 🏷️ Types

/**
 * The whole-workspace NestJS module graph: every NestJS project's own module
 * graph, combined into one.
 *
 * Exported once at the workspace root rather than once per project — see
 * `codependix-nx-projects`'s `WorkspaceGraph`, which this mirrors. A module's
 * class name alone is not unique across the workspace — two different
 * projects can each declare their own `AppModule` — so every node here is
 * qualified with the project it belongs to (see
 * `WorkspaceGraphService.qualifyModuleName`) rather than reused as-is from a
 * single project's `NestjsModuleGraph`.
 */
export interface NestjsModulesWorkspaceGraph {
  /** Every drawn import relationship, sorted so the diagram never churns. */
  readonly edges: NestjsModulesWorkspaceGraphEdge[];
  /** Every module in the graph, qualified by project and sorted. */
  readonly moduleNames: string[];
}

/** One module importing another, both qualified by the project they belong to. */
export interface NestjsModulesWorkspaceGraphEdge {
  readonly source: string;
  readonly target: string;
}
