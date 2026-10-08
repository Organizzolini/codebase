// 🏷️ Types

import type { NeighborhoodEdge } from "../neighborhood/neighborhood.types";

/**
 * The whole-repository Nx dependency graph: every project, every edge.
 *
 * Exported once at the workspace root rather than once per project — see
 * `CONTEXT.md`'s `Workspace Graph` term.
 */
export interface WorkspaceGraph {
  /** Every edge between two workspace projects, sorted. */
  readonly edges: NeighborhoodEdge[];
  /** Every project name the graph knows, sorted. */
  readonly projectNames: string[];
}
