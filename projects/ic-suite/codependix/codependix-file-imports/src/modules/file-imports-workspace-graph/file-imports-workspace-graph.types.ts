// 🏷️ Types

/**
 * The whole-workspace file-level import graph: every TypeScript and Python
 * project's own internal import graph, combined into one.
 *
 * Exported once at the workspace root rather than once per project — see
 * `codependix-nx-projects`'s `WorkspaceGraph`, which this mirrors. A file name
 * alone is not unique across the workspace the way a project name is, so
 * every node here is qualified with the project it belongs to (see
 * `WorkspaceGraphService.qualifyFileName`) rather than reused as-is from a
 * single project's `TypescriptImportGraph`/`PythonImportGraph`.
 */
export interface FileImportsWorkspaceGraph {
  /** Every drawn import relationship, sorted so the diagram never churns. */
  readonly edges: FileImportsWorkspaceGraphEdge[];
  /** Every file in the graph, qualified by project and sorted. */
  readonly fileNames: string[];
}

/** One file importing another, both qualified by the project they belong to. */
export interface FileImportsWorkspaceGraphEdge {
  readonly source: string;
  readonly target: string;
}
