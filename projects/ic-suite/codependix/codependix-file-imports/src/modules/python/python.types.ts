// 🏷️ Types

/**
 * A Python project's internal file-level import Graph: which of its own
 * files import which other of its own files.
 *
 * Shaped identically to the `typescript` module's `TypescriptImportGraph`,
 * kept as its own type rather than shared: the two modules build the same
 * kind of graph from entirely different sources — a `ts.Program` versus a
 * hand-rolled statement parser — the same independence `codependix-nx-projects` and
 * `codependix-nestjs-modules` already keep from each other and from
 * `codependix-file-imports`.
 */
export interface PythonImportGraph {
  /** Every drawn import relationship, sorted so the diagram never churns. */
  readonly edges: PythonImportGraphEdge[];
  /** Every source file in the graph, project-relative and sorted. */
  readonly fileNames: string[];
  /** Files left with no drawn edge in either direction. */
  readonly isolatedFileNames: string[];
  /** The project the graph was built from. */
  readonly projectName: string;
}

/** One file importing another, both paths project-relative. */
export interface PythonImportGraphEdge {
  readonly source: string;
  readonly target: string;
}

/**
 * A workspace project tagged `language:python`, discovered from the Nx
 * project graph the same way `codependix-nestjs-modules`'s `NestjsProject` is —
 * Python has no per-project marker file as reliable as a NestJS project's
 * root module, since every Python project shares one workspace-root
 * `pyproject.toml` (see the `write-python` skill) even when it also carries
 * its own.
 */
export interface PythonProject {
  /** Absolute path of the project directory. */
  readonly absoluteRoot: string;
  /** Project directory name, which is also the Nx project name. */
  readonly name: string;
}
