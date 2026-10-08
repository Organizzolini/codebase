import { readFile } from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { createProjectGraphAsync } from "@nx/devkit";

import {
  InvalidProjectGraphError,
  NEIGHBORHOOD_IMPLICIT_LEGEND,
  NEIGHBORHOOD_MERMAID_HEADER,
  NEIGHBORHOOD_SUBJECT_STYLE,
  NEIGHBORHOOD_UNCONNECTED,
} from "./neighborhood.constants";

import type {
  Neighborhood,
  NeighborhoodEdge,
  NxProject,
  NxProjectGraph,
} from "./neighborhood.types";

/**
 * Builds each project's one-hop Nx dependency neighborhood.
 *
 * Ported from `projects/synchronization`'s `nx-project-graphs` command (see
 * issue #242), which this package replaces: the graph reading and mermaid
 * rendering are unchanged, but the file-writing side — deciding where and how
 * a neighborhood is exported — belongs to `codependix-cli` and its own anchor
 * mechanism instead of conformetry's marker-block sync.
 *
 * `collectEdges`, `compareEdges`, `renderEdge`, `renderNode`, and
 * `toNodeIdentifier` are kept public: `WorkspaceGraphService` renders the
 * whole-workspace graph with the same node and edge shapes, and reaches for
 * these rather than duplicating them.
 */
@Injectable()
export class NeighborhoodService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Whether a parsed file looks like a project graph at all.
   *
   * Deliberately shallow — a supplied graph's contents are trusted, and this
   * only separates "Nx wrote this" from "this is some other JSON".
   */
  private isProjectGraph(value: unknown): value is NxProjectGraph {
    if (typeof value !== "object" || value === null) return false;

    const candidate = value as { dependencies?: unknown; nodes?: unknown };

    return (
      typeof candidate.dependencies === "object" &&
      candidate.dependencies !== null &&
      typeof candidate.nodes === "object" &&
      candidate.nodes !== null
    );
  }

  // 🌎 Public Methods

  /**
   * Builds every project's neighborhood from one read of the project graph.
   *
   * The workspace root project is left out by `readProjects`, so no
   * neighborhood is built for it: it contains every other project rather than
   * depending on them, so its neighborhood would say nothing.
   */
  buildNeighborhoods(
    graph: NxProjectGraph,
    projects: NxProject[],
  ): Map<string, Neighborhood> {
    const neighborhoods = new Map<string, Neighborhood>();
    const knownNames = new Set(projects.map((project) => project.name));

    for (const project of projects) {
      const edges = this.collectEdges(graph, knownNames, project.name);

      neighborhoods.set(project.name, {
        dependencies: this.sortNames(
          edges
            .filter((edge) => edge.source === project.name)
            .map((edge) => edge.target),
        ),
        dependents: this.sortNames(
          edges
            .filter((edge) => edge.target === project.name)
            .map((edge) => edge.source),
        ),
        edges: edges.toSorted((first, second) =>
          this.compareEdges(first, second),
        ),
        projectName: project.name,
      });
    }

    return neighborhoods;
  }

  /**
   * Collects edges between known workspace projects, optionally narrowed to
   * the ones touching one subject project.
   *
   * `subjectName` left undefined collects every edge among `knownNames` —
   * what `WorkspaceGraphService` needs for the whole-workspace graph. Naming
   * it narrows to only the edges where the subject is the source or the
   * target — one project's neighborhood.
   */
  collectEdges(
    graph: NxProjectGraph,
    knownNames: Set<string>,
    subjectName?: string,
  ): NeighborhoodEdge[] {
    const edges = new Map<string, NeighborhoodEdge>();

    for (const [source, dependencies] of Object.entries(graph.dependencies)) {
      for (const dependency of dependencies) {
        const touchesSubject =
          subjectName === undefined ||
          source === subjectName ||
          dependency.target === subjectName;
        if (!touchesSubject) continue;
        if (!knownNames.has(source) || !knownNames.has(dependency.target)) {
          continue;
        }
        if (source === dependency.target) continue;

        const key = `${source}->${dependency.target}`;
        // A pair can be declared both ways round; a static edge is the
        // stronger statement, so it wins over an implicit one.
        const implicit =
          dependency.type === "implicit" && (edges.get(key)?.implicit ?? true);

        edges.set(key, { implicit, source, target: dependency.target });
      }
    }

    return [...edges.values()];
  }

  /** Sorts edges by source then target so a rendered diagram never churns. */
  compareEdges(first: NeighborhoodEdge, second: NeighborhoodEdge): number {
    return (
      first.source.localeCompare(second.source) ||
      first.target.localeCompare(second.target)
    );
  }

  /**
   * Reads a project graph — the workspace's own, or a supplied one.
   *
   * Nx resolves the project graph from the **process working directory** and
   * takes no directory argument, so a run can only ever graph the workspace it
   * stands in. `filePath` is the way out of that: point it at the JSON file
   * that `nx graph --file=graph.json` writes, and codependix graphs whatever
   * that describes — which is what lets a job graph a repository it merely
   * checked out.
   *
   * A supplied graph is **trusted**, not validated: Nx wrote it, and restating
   * `ProjectGraph` as a schema to re-check that buys little. The one exception
   * is the shape check below, which turns an unreadable crash deep inside
   * `readProjects` into a message naming the file.
   */
  async readProjectGraph(filePath?: string): Promise<NxProjectGraph> {
    if (filePath === undefined) {
      return createProjectGraphAsync({ exitOnError: false });
    }

    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));

    if (!this.isProjectGraph(parsed)) {
      throw new InvalidProjectGraphError(filePath);
    }

    return parsed;
  }

  /** Lists every project the graph knows, apart from the workspace root. */
  readProjects(graph: NxProjectGraph, workspaceRoot: string): NxProject[] {
    return Object.entries(graph.nodes)
      .filter(([, node]) => node.data.root !== ".")
      .map(([name, node]) => ({
        absoluteRoot: path.join(workspaceRoot, node.data.root),
        name,
        tags: node.data.tags ?? [],
      }))
      .toSorted((first, second) => first.name.localeCompare(second.name));
  }

  /** Renders one edge, dotted when Nx inferred it from configuration. */
  renderEdge(edge: NeighborhoodEdge): string {
    const arrow = edge.implicit ? "-.->" : "-->";

    return `  ${this.toNodeIdentifier(edge.source)} ${arrow} ${this.toNodeIdentifier(edge.target)}`;
  }

  /** Renders a neighborhood as a fenced mermaid diagram. */
  renderMermaid(neighborhood: Neighborhood): string {
    if (neighborhood.edges.length === 0) {
      return NEIGHBORHOOD_UNCONNECTED;
    }

    const nodeNames = this.sortNames([
      ...neighborhood.dependencies,
      ...neighborhood.dependents,
      neighborhood.projectName,
    ]);
    const lines = [
      "```mermaid",
      NEIGHBORHOOD_MERMAID_HEADER,
      ...nodeNames.map((nodeName) => this.renderNode(nodeName)),
      ...neighborhood.edges.map((edge) => this.renderEdge(edge)),
      NEIGHBORHOOD_SUBJECT_STYLE,
      `  class ${this.toNodeIdentifier(neighborhood.projectName)} subject`,
      "```",
    ];

    if (neighborhood.edges.some((edge) => edge.implicit)) {
      lines.push("", NEIGHBORHOOD_IMPLICIT_LEGEND);
    }

    return lines.join("\n");
  }

  /** Declares one node, labelled with the project name it stands for. */
  renderNode(projectName: string): string {
    return `  ${this.toNodeIdentifier(projectName)}["${projectName}"]`;
  }

  /** Sorts names into a stable order, dropping duplicates. */
  sortNames(names: string[]): string[] {
    return [...new Set(names)].toSorted((first, second) =>
      first.localeCompare(second),
    );
  }

  /** Turns a project name into an identifier mermaid accepts. */
  toNodeIdentifier(projectName: string): string {
    return projectName.replaceAll(/[^\dA-Za-z]/gu, "_");
  }
}
