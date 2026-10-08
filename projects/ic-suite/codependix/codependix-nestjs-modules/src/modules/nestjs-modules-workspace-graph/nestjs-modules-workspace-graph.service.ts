import { Injectable } from "@nestjs/common";

import {
  NESTJS_MODULES_WORKSPACE_GRAPH_MERMAID_HEADER,
  NESTJS_MODULES_WORKSPACE_GRAPH_QUALIFIER_SEPARATOR,
  NESTJS_MODULES_WORKSPACE_GRAPH_UNCONNECTED,
} from "./nestjs-modules-workspace-graph.constants";

import type { NestjsModuleGraph } from "../module-graph/module-graph.types";
import type {
  NestjsModulesWorkspaceGraph,
  NestjsModulesWorkspaceGraphEdge,
} from "./nestjs-modules-workspace-graph.types";

/**
 * Builds the whole-workspace NestJS module graph — every NestJS project's
 * own module graph, combined into one — exported once at the workspace root
 * rather than once per project.
 *
 * A module's class name alone is only unique within its own project — two
 * different projects each declare their own `AppModule`, and even within one
 * project `ModuleGraphService` already collapses two same-named modules into
 * one node — so every node is qualified with the project it belongs to before
 * the projects' graphs are combined, mirroring
 * `codependix-nx-projects`'s `WorkspaceGraphService` without reusing its
 * code, since the two build genuinely different kinds of graph from
 * genuinely different sources. `ModuleGraphService.buildGraph` has already
 * dropped ambient-module edges per project by the time a graph reaches here,
 * so nothing further needs deciding about ambience at workspace scope.
 */
@Injectable()
export class NestjsModulesWorkspaceGraphService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Sorts edges by source then target so a rendered diagram never churns. */
  private compareEdges(
    first: NestjsModulesWorkspaceGraphEdge,
    second: NestjsModulesWorkspaceGraphEdge,
  ): number {
    return (
      first.source.localeCompare(second.source) ||
      first.target.localeCompare(second.target)
    );
  }

  /** Qualifies a module's class name with the project it belongs to. */
  private qualifyModuleName(projectName: string, moduleName: string): string {
    return `${projectName}${NESTJS_MODULES_WORKSPACE_GRAPH_QUALIFIER_SEPARATOR}${moduleName}`;
  }

  /** Renders one qualified module name as a mermaid node. */
  private renderNode(qualifiedModuleName: string): string {
    return `  ${this.toNodeIdentifier(qualifiedModuleName)}["${qualifiedModuleName}"]`;
  }

  /** Sorts names into a stable order. */
  private sortNames(names: string[]): string[] {
    return [...names].toSorted((first, second) => first.localeCompare(second));
  }

  /** Turns a qualified module name into an identifier mermaid accepts. */
  private toNodeIdentifier(qualifiedModuleName: string): string {
    return `module_${qualifiedModuleName.replaceAll(/[^\dA-Za-z]/gu, "_")}`;
  }

  // 🌎 Public Methods

  /**
   * Builds the whole-workspace NestJS module graph from every discovered
   * NestJS project's own already-built module graph.
   */
  buildWorkspaceGraph(
    graphs: NestjsModuleGraph[],
  ): NestjsModulesWorkspaceGraph {
    const moduleNames = this.sortNames(
      graphs.flatMap((graph) =>
        graph.nodes.map((node) =>
          this.qualifyModuleName(graph.projectName, node.name),
        ),
      ),
    );
    const edges = graphs
      .flatMap((graph) =>
        graph.edges.map((edge) => ({
          source: this.qualifyModuleName(graph.projectName, edge.source),
          target: this.qualifyModuleName(graph.projectName, edge.target),
        })),
      )
      .toSorted((first, second) => this.compareEdges(first, second));

    return { edges, moduleNames };
  }

  /** Renders the whole-workspace NestJS module graph as a mermaid diagram. */
  renderMermaid(workspaceGraph: NestjsModulesWorkspaceGraph): string {
    if (workspaceGraph.edges.length === 0) {
      return NESTJS_MODULES_WORKSPACE_GRAPH_UNCONNECTED;
    }

    return [
      "```mermaid",
      NESTJS_MODULES_WORKSPACE_GRAPH_MERMAID_HEADER,
      ...workspaceGraph.moduleNames.map((moduleName) =>
        this.renderNode(moduleName),
      ),
      ...workspaceGraph.edges.map(
        (edge) =>
          `  ${this.toNodeIdentifier(edge.source)} --> ${this.toNodeIdentifier(edge.target)}`,
      ),
      "```",
    ].join("\n");
  }
}
