// 🏷️ Types

import type { CodependixBoundaryRule } from "@codependix/configuration";

/**
 * One cycle found in a graph.
 *
 * `source` and `target` are the edge that closed it — the last node walked,
 * and the node already on the path it returned to — so a cycle reports the
 * same two endpoints every other violation does, without a caller having to
 * index into `path` and prove to the compiler that it is non-empty.
 */
export interface BoundaryCycle {
  /** The whole path, with the closing node repeated at the end. */
  readonly path: readonly string[];
  readonly source: string;
  readonly target: string;
}

/**
 * One node depending on another, at whatever level the graph is.
 *
 * `implicit` is carried rather than dropped because it is the one fact a lint
 * rule reading import statements cannot reach: an Nx `implicitDependencies`
 * entry creates a project-graph edge with no import statement to flag. Absent
 * at every level that has no such notion, rather than defaulted to `false` —
 * a file import is not "explicitly" anything, it is just an import.
 */
export interface BoundaryEdge {
  readonly implicit?: boolean | undefined;
  readonly source: string;
  readonly target: string;
}

/**
 * One built graph, reduced to what rule evaluation needs.
 *
 * Deliberately not `Neighborhood`, `NestjsModuleGraph`, `TypescriptImportGraph`
 * or `PythonImportGraph`: reading any of those would drag `@nx/devkit`,
 * `@nestjs/core` and `typescript` behind anything that wants only rule
 * evaluation. The four already share an identical `{ source, target }` edge
 * shape by construction, so the adapters that flatten them into this live in
 * the host that already builds all four — see `codependix-cli`.
 */
export interface BoundaryGraph {
  readonly edges: readonly BoundaryEdge[];
  /** Which of codependix's four levels this graph was built at. */
  readonly level: CodependixBoundaryLevel;
  readonly nodes: readonly BoundaryNode[];
  /**
   * What the graph covers: an Nx project name, or the workspace itself.
   *
   * Reported beside every violation, because the same rule evaluated at file
   * level fails once per project and a bare pair of file paths does not say
   * which project's files they are.
   */
  readonly scope: string;
}

/**
 * One node in a graph, with whatever a level knows about it.
 *
 * One shape for three vocabularies: an Nx project has a name, a root, and
 * tags; a file has a project-relative path and project; a NestJS module has a
 * class name, declaring file path, and project. Every field beyond `id` is
 * therefore optional, and a selector naming one a level does not carry
 * matches nothing there rather than everything — see `BoundarySelectorService`.
 *
 * No `kind` field: the graph already states its `level`, and a second field
 * saying the same thing is a second thing that can be wrong.
 */
export interface BoundaryNode {
  readonly id: string;
  readonly path?: string | undefined;
  readonly project?: string | undefined;
  readonly tags?: readonly string[] | undefined;
}

/** One edge, or one cycle, breaking one declared rule. */
export interface BoundaryViolation {
  /**
   * The whole cycle, closing node repeated at the end, for an `acyclic` rule.
   *
   * Absent for an access rule, which is about one edge and has no path to
   * report.
   */
  readonly cycle: readonly string[] | undefined;
  readonly level: CodependixBoundaryLevel;
  /** The sentence reported, whether the rule's own or the generated one. */
  readonly message: string;
  /**
   * The projects this violation is charged to, sorted: an access rule's
   * edge source's project, or every project owning a node on a cycle.
   *
   * What decides whether it fails a run — it does when any of these is a
   * project the run judges — see `BoundaryCheckService.run`.
   */
  readonly projects: readonly string[];
  /** The `name` of the rule that reported it. */
  readonly rule: string;
  readonly scope: string;
  readonly source: string;
  readonly target: string;
}

/**
 * The level a boundary graph was built at, or a violation was found at.
 *
 * Finer-grained than `CodependixGraphType`: `fileImports` builds one merged
 * graph type per project, but `boundaries.fileImports` still nests rules by
 * language, and a violation has to say which language's graph it came from.
 * `nestjsModules` and `nxProjects` match `CodependixGraphType` one for one,
 * since those two levels carry no such split.
 */
export type CodependixBoundaryLevel =
  | "nestjsModules"
  | "nxProjects"
  | "python"
  | "typescript";

/**
 * The bookkeeping one depth-first cycle walk carries.
 *
 * Passed as one object rather than as five parameters so the recursive walk
 * stays inside the repository's three-parameter limit, and so a reader sees
 * at a glance that all five belong to the same traversal.
 */
export interface CycleWalkState {
  /** Every cycle found so far. */
  readonly cycles: BoundaryCycle[];
  /** Node-set keys of the cycles already recorded, so rotations dedupe. */
  readonly keys: Set<string>;
  /** The nodes on the current path, as a set, for constant-time lookup. */
  readonly onStack: Set<string>;
  /** The nodes on the current path, in order. */
  readonly stack: string[];
  /** Nodes whose whole subtree has been walked. */
  readonly visited: Set<string>;
}

/** Arguments accepted when judging one graph against one level's rules. */
export interface EvaluateBoundariesArguments {
  readonly graph: BoundaryGraph;
  readonly rules: readonly CodependixBoundaryRule[];
}

/** Arguments accepted when finding the cycles in a graph. */
export interface FindCyclesArguments {
  readonly edges: readonly BoundaryEdge[];
  /** The nodes a cycle must lie entirely within. */
  readonly nodeIds: ReadonlySet<string>;
}
