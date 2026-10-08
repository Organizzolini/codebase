import { Injectable } from "@nestjs/common";

import {
  FILE_IMPORTS_WORKSPACE_GRAPH_MERMAID_HEADER,
  FILE_IMPORTS_WORKSPACE_GRAPH_QUALIFIER_SEPARATOR,
  FILE_IMPORTS_WORKSPACE_GRAPH_UNCONNECTED,
} from "./file-imports-workspace-graph.constants";

import type { PythonImportGraph } from "../python/python.types";
import type { TypescriptImportGraph } from "../typescript/typescript.types";
import type {
  FileImportsWorkspaceGraph,
  FileImportsWorkspaceGraphEdge,
} from "./file-imports-workspace-graph.types";

/**
 * Builds the whole-workspace file-level import graph — every TypeScript and
 * Python project's own internal import graph, combined into one — exported
 * once at the workspace root rather than once per project.
 *
 * Combines both languages into one graph rather than two, matching how
 * `fileImports` reads as one merged concept everywhere else in codependix:
 * `boundaries.fileImports` is the only place the two still separate, because
 * a Python file can never import a TypeScript file or vice versa and the rule
 * vocabularies differ — nothing like that applies to simply drawing both
 * languages' already-built graphs on one page.
 *
 * A file name alone is only unique within its own project, unlike an Nx
 * project name, which is unique workspace-wide — so every node is qualified
 * with the project it belongs to before the two languages' graphs are
 * combined, mirroring `codependix-nx-projects`'s `WorkspaceGraphService`
 * without reusing its code, since the two build genuinely different kinds of
 * graph from genuinely different sources.
 */
@Injectable()
export class FileImportsWorkspaceGraphService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Sorts edges by source then target so a rendered diagram never churns. */
  private compareEdges(
    first: FileImportsWorkspaceGraphEdge,
    second: FileImportsWorkspaceGraphEdge,
  ): number {
    return (
      first.source.localeCompare(second.source) ||
      first.target.localeCompare(second.target)
    );
  }

  /** Qualifies a project-relative file name with the project it belongs to. */
  private qualifyFileName(projectName: string, fileName: string): string {
    return `${projectName}${FILE_IMPORTS_WORKSPACE_GRAPH_QUALIFIER_SEPARATOR}${fileName}`;
  }

  /** Renders one qualified file name as a mermaid node. */
  private renderNode(qualifiedFileName: string): string {
    return `  ${this.toNodeIdentifier(qualifiedFileName)}["${qualifiedFileName}"]`;
  }

  /** Sorts names into a stable order. */
  private sortNames(names: string[]): string[] {
    return [...names].toSorted((first, second) => first.localeCompare(second));
  }

  /** Turns a qualified file name into an identifier mermaid accepts. */
  private toNodeIdentifier(qualifiedFileName: string): string {
    return `file_${qualifiedFileName.replaceAll(/[^\dA-Za-z]/gu, "_")}`;
  }

  // 🌎 Public Methods

  /**
   * Builds the whole-workspace file-level import graph from every discovered
   * TypeScript and Python project's own already-built import graph.
   */
  buildWorkspaceGraph(args: {
    pythonGraphs: PythonImportGraph[];
    typescriptGraphs: TypescriptImportGraph[];
  }): FileImportsWorkspaceGraph {
    const graphs = [...args.typescriptGraphs, ...args.pythonGraphs];
    const fileNames = this.sortNames(
      graphs.flatMap((graph) =>
        graph.fileNames.map((fileName) =>
          this.qualifyFileName(graph.projectName, fileName),
        ),
      ),
    );
    const edges = graphs
      .flatMap((graph) =>
        graph.edges.map((edge) => ({
          source: this.qualifyFileName(graph.projectName, edge.source),
          target: this.qualifyFileName(graph.projectName, edge.target),
        })),
      )
      .toSorted((first, second) => this.compareEdges(first, second));

    return { edges, fileNames };
  }

  /** Renders the whole-workspace file-level import graph as a mermaid diagram. */
  renderMermaid(workspaceGraph: FileImportsWorkspaceGraph): string {
    if (workspaceGraph.edges.length === 0) {
      return FILE_IMPORTS_WORKSPACE_GRAPH_UNCONNECTED;
    }

    return [
      "```mermaid",
      FILE_IMPORTS_WORKSPACE_GRAPH_MERMAID_HEADER,
      ...workspaceGraph.fileNames.map((fileName) => this.renderNode(fileName)),
      ...workspaceGraph.edges.map(
        (edge) =>
          `  ${this.toNodeIdentifier(edge.source)} --> ${this.toNodeIdentifier(edge.target)}`,
      ),
      "```",
    ].join("\n");
  }
}
