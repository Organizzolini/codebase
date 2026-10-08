import { Injectable } from "@nestjs/common";

import { NEIGHBORHOOD_IMPLICIT_LEGEND } from "../neighborhood/neighborhood.constants";
import { NeighborhoodService } from "../neighborhood/neighborhood.service";

import {
  WORKSPACE_GRAPH_MERMAID_HEADER,
  WORKSPACE_GRAPH_UNCONNECTED,
} from "./workspace-graph.constants";

import type {
  NxProject,
  NxProjectGraph,
} from "../neighborhood/neighborhood.types";
import type { WorkspaceGraph } from "./workspace-graph.types";

/**
 * Builds the whole-repository Nx dependency graph — every project, every
 * edge — exported once at the workspace root rather than once per project.
 *
 * Reuses `NeighborhoodService`'s node and edge rendering rather than
 * duplicating it: the two graphs draw nodes and edges the same way, and only
 * differ in scope (one project's immediate neighbors versus every project in
 * the workspace) and in that the Workspace Graph highlights no single
 * project.
 */
@Injectable()
export class WorkspaceGraphService {
  // 🏗 Dependency Injection

  constructor(private readonly neighborhoodService: NeighborhoodService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Builds the Workspace Graph from one read of the Nx project graph. */
  buildWorkspaceGraph(
    graph: NxProjectGraph,
    projects: NxProject[],
  ): WorkspaceGraph {
    const knownNames = new Set(projects.map((project) => project.name));
    const edges = this.neighborhoodService.collectEdges(graph, knownNames);

    return {
      edges: edges.toSorted((first, second) =>
        this.neighborhoodService.compareEdges(first, second),
      ),
      projectNames: this.neighborhoodService.sortNames(
        projects.map((project) => project.name),
      ),
    };
  }

  /** Renders the Workspace Graph as a fenced mermaid diagram. */
  renderMermaid(workspaceGraph: WorkspaceGraph): string {
    if (workspaceGraph.edges.length === 0) {
      return WORKSPACE_GRAPH_UNCONNECTED;
    }

    const lines = [
      "```mermaid",
      WORKSPACE_GRAPH_MERMAID_HEADER,
      ...workspaceGraph.projectNames.map((projectName) =>
        this.neighborhoodService.renderNode(projectName),
      ),
      ...workspaceGraph.edges.map((edge) =>
        this.neighborhoodService.renderEdge(edge),
      ),
      "```",
    ];

    if (workspaceGraph.edges.some((edge) => edge.implicit)) {
      lines.push("", NEIGHBORHOOD_IMPLICIT_LEGEND);
    }

    return lines.join("\n");
  }
}
