// ♟️ Constants

/** Rendered in place of a diagram for a project with no neighbors at all. */
export const NEIGHBORHOOD_UNCONNECTED =
  "_This project has no immediate Nx dependencies or dependents._";

/** Header declaring the mermaid diagram type and its default layout direction. */
export const NEIGHBORHOOD_MERMAID_HEADER = "graph LR";

/** Class definition that highlights the project a diagram is centered on. */
export const NEIGHBORHOOD_SUBJECT_STYLE =
  "  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px";

/** Legend explaining the dashed-edge convention for an implicit dependency. */
export const NEIGHBORHOOD_IMPLICIT_LEGEND =
  "_Dashed edges are dependencies Nx inferred from configuration rather than from code._";

// 🚨 Errors

/**
 * Raised when a supplied project graph file is not a project graph.
 *
 * The only check a supplied graph gets. Its contents are otherwise trusted —
 * a graph is `nx graph --file=graph.json` output, and restating `ProjectGraph`
 * as a schema to re-validate what Nx just emitted buys little. This one exists
 * because the alternative is not a wrong diagram but a crash inside
 * `readProjects` with nothing in it naming the file that caused it.
 */
export class InvalidProjectGraphError extends Error {
  constructor(filePath: string) {
    super(
      `Supplied project graph has no nodes or dependencies: ${filePath}. Expected the JSON that \`nx graph --file=graph.json\` emits.`,
    );
    this.name = "InvalidProjectGraphError";
  }
}
