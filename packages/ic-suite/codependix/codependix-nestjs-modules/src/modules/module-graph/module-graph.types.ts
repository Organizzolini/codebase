// 🏷️ Types

/**
 * A NestJS project's module import graph, reduced to what an export needs.
 *
 * Built from the exploration of a project's container in
 * preview mode — see `NestjsProjectService.exploreProject` — and kept to the
 * plain module-name and edge shape a diagram or a JSON export can render
 * directly, without carrying the container's own provider or controller
 * metadata.
 */
export interface NestjsModuleGraph {
  /**
   * Modules every other module imports, and whose edges are therefore left
   * out. Reported so a caller can say why the diagram looks sparser than the
   * container does.
   */
  readonly ambientModuleNames: string[];
  /** Every drawn import relationship, sorted so the diagram is stable. */
  readonly edges: NestjsModuleGraphEdge[];
  /** Modules left with no drawn edge in either direction. */
  readonly isolatedModuleNames: string[];
  /** Every module node in the graph, sorted. */
  readonly nodes: NestjsModuleGraphNode[];
  /** The project the graph was built from. */
  readonly projectName: string;
}

/** One module importing another. */
export interface NestjsModuleGraphEdge {
  readonly source: string;
  readonly target: string;
}

/** One module in a NestJS project's module import graph. */
export interface NestjsModuleGraphNode {
  /** Path to the file declaring the module class, relative to the project root. */
  readonly declaringFile: string;
  /** The module class name. */
  readonly name: string;
}
