import { CODEPENDIX_GRAPH_TYPES } from "@codependix/configuration";
import {
  FileImportsWorkspaceGraphService,
  PythonService,
  TypescriptService,
} from "@codependix/file-imports";
import {
  ModuleGraphService,
  NestjsModulesWorkspaceGraphService,
  NestjsProjectService,
} from "@codependix/nestjs-modules";
import { WorkspaceGraphService } from "@codependix/nx-projects";
import { Injectable } from "@nestjs/common";

import {
  FORMAT_JSON,
  FORMAT_MARKDOWN,
  GRAPH_TYPE_MARKDOWN_SUBHEADINGS,
} from "../combined-output/combined-output.constants";
import { JSON_INDENTATION } from "../delivery/delivery.constants";

import {
  buildNoPathMessage,
  FORMAT_MERMAID,
  PATH_ARROW,
  PATH_FORMAT_NAMES,
  PATH_MERMAID_HEADER,
} from "./path-query.constants";

import type {
  CombinedPathResults,
  PathFormat,
  PathQueryArguments,
  PathQueryResult,
  PathReportArguments,
} from "./path-query.types";
import type { GraphRunContext } from "@codependix/boundaries";
import type { NestjsModuleGraph } from "@codependix/nestjs-modules";

/**
 * Searches for connecting paths between two nodes in codependix graphs and renders results.
 */
@Injectable()
export class PathQueryService {
  // 🏗 Dependency Injection

  constructor(
    private readonly fileImportsWorkspaceGraphService: FileImportsWorkspaceGraphService,
    private readonly moduleGraphService: ModuleGraphService,
    private readonly nestjsModulesWorkspaceGraphService: NestjsModulesWorkspaceGraphService,
    private readonly nestjsProjectService: NestjsProjectService,
    private readonly pythonService: PythonService,
    private readonly typescriptService: TypescriptService,
    private readonly workspaceGraphService: WorkspaceGraphService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds an adjacency map from directed edges with sorted targets. */
  private buildAdjacency(
    edges: readonly { source: string; target: string }[],
  ): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();

    for (const edge of edges) {
      const targets = adjacency.get(edge.source) ?? [];
      targets.push(edge.target);
      adjacency.set(edge.source, targets);
    }

    for (const [source, targets] of adjacency) {
      adjacency.set(source, targets.toSorted());
    }

    return adjacency;
  }

  /**
   * Explores and builds every discovered NestJS project's module graph.
   */
  private async buildNestjsModuleGraphs(
    selectedProjects: GraphRunContext["selectedProjects"],
  ): Promise<NestjsModuleGraph[]> {
    const nestjsProjects =
      this.nestjsProjectService.discoverProjects(selectedProjects);
    const moduleGraphs: NestjsModuleGraph[] = [];

    for (const project of nestjsProjects) {
      const tree = await this.nestjsProjectService.exploreProject(project);

      moduleGraphs.push(this.moduleGraphService.buildGraph(tree, project.name));
    }

    return moduleGraphs;
  }

  /** Checks whether a node is present in the graph's node list or edges. */
  private isKnownNode(
    node: string,
    nodes: readonly string[] | undefined,
    edges: readonly { source: string; target: string }[],
  ): boolean {
    if (nodes?.includes(node) === true) {
      return true;
    }

    return edges.some((edge) => edge.source === node || edge.target === node);
  }

  /** Queries the file-imports workspace graph for a path between two files. */
  private queryFileImports(args: PathQueryArguments): null | string[] {
    const pythonGraphs = this.pythonService
      .discoverProjects(args.context.selectedProjects)
      .map((project) => this.pythonService.buildGraph(project));
    const typescriptGraphs = this.typescriptService
      .discoverProjects(args.context.selectedProjects)
      .map((project) =>
        this.typescriptService.buildGraph(
          this.typescriptService.buildProgram(project),
        ),
      );
    const graph = this.fileImportsWorkspaceGraphService.buildWorkspaceGraph({
      pythonGraphs,
      typescriptGraphs,
    });

    return this.findShortestPath({
      edges: graph.edges,
      from: args.from,
      nodes: graph.fileNames,
      to: args.to,
    });
  }

  /** Queries the NestJS modules workspace graph for a path between two modules. */
  private async queryNestjsModules(
    args: PathQueryArguments,
  ): Promise<null | string[]> {
    const moduleGraphs = await this.buildNestjsModuleGraphs(
      args.context.selectedProjects,
    );
    const graph =
      this.nestjsModulesWorkspaceGraphService.buildWorkspaceGraph(moduleGraphs);

    return this.findShortestPath({
      edges: graph.edges,
      from: args.from,
      nodes: graph.moduleNames,
      to: args.to,
    });
  }

  /** Queries the Nx project graph for a path between two projects. */
  private queryNxProjects(args: PathQueryArguments): null | string[] {
    const workspaceGraph = this.workspaceGraphService.buildWorkspaceGraph(
      args.context.graph,
      args.context.selectedProjects,
    );

    return this.findShortestPath({
      edges: workspaceGraph.edges,
      from: args.from,
      nodes: workspaceGraph.projectNames,
      to: args.to,
    });
  }

  /** Renders every active graph type's path as Markdown text. */
  private renderMarkdown(results: CombinedPathResults): string {
    const sections: string[] = [];

    for (const graphType of CODEPENDIX_GRAPH_TYPES) {
      const entry = results[graphType];
      if (entry === undefined) continue;

      const heading = `### ${GRAPH_TYPE_MARKDOWN_SUBHEADINGS[graphType]}`;
      const body =
        entry.path === null || entry.path.length === 0
          ? buildNoPathMessage(entry.from, entry.to)
          : entry.path.map((node) => `\`${node}\``).join(PATH_ARROW);

      sections.push(`${heading}\n\n${body}`);
    }

    return sections.join("\n\n");
  }

  /** Renders every active graph type's path as a Mermaid diagram. */
  private renderMermaid(results: CombinedPathResults): string {
    const sections: string[] = [];

    for (const graphType of CODEPENDIX_GRAPH_TYPES) {
      const entry = results[graphType];
      if (entry !== undefined) {
        sections.push(this.renderMermaidSection(entry));
      }
    }

    return sections.join("\n\n");
  }

  /** Renders a single path entry as a Mermaid diagram block or no-path message. */
  private renderMermaidSection(entry: PathQueryResult): string {
    const pathNodes = entry.path;
    if (pathNodes === null || pathNodes.length === 0) {
      return buildNoPathMessage(entry.from, entry.to);
    }

    const lines = [
      "```mermaid",
      PATH_MERMAID_HEADER,
      ...pathNodes.map((node) => `  ${this.toMermaidId(node)}["${node}"]`),
    ];
    for (let index = 0; index + 1 < pathNodes.length; index++) {
      const source = pathNodes[index];
      const target = pathNodes[index + 1];
      if (source !== undefined && target !== undefined) {
        lines.push(
          `  ${this.toMermaidId(source)} --> ${this.toMermaidId(target)}`,
        );
      }
    }
    lines.push("```");

    return lines.join("\n");
  }

  /** Runs deterministic breadth-first search to find the shortest path. */
  private searchBfs(
    from: string,
    to: string,
    adjacency: Map<string, string[]>,
  ): null | string[] {
    const queue: [string, string[]][] = [[from, [from]]];
    const visited = new Set<string>([from]);
    let currentEntry = queue.shift();

    while (currentEntry !== undefined) {
      const [current, path] = currentEntry;
      if (current === to) {
        return path;
      }

      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([neighbor, [...path, neighbor]]);
        }
      }

      currentEntry = queue.shift();
    }

    return null;
  }

  /** Converts a node name to a safe Mermaid identifier. */
  private toMermaidId(name: string): string {
    return name.replaceAll(/[^\dA-Za-z]/gu, "_");
  }

  /**
   * Finds the shortest directed path between two nodes in a given edge set.
   */
  public findShortestPath(args: {
    edges: readonly { source: string; target: string }[];
    from: string;
    nodes?: readonly string[] | undefined;
    to: string;
  }): null | string[] {
    const { edges, from, nodes, to } = args;

    if (
      !this.isKnownNode(from, nodes, edges) ||
      !this.isKnownNode(to, nodes, edges)
    ) {
      return null;
    }

    if (from === to) {
      return [from];
    }

    return this.searchBfs(from, to, this.buildAdjacency(edges));
  }

  // 🌎 Public Methods

  /**
   * Queries every enabled graph type for a connecting path between two nodes.
   */
  async query(args: PathQueryArguments): Promise<CombinedPathResults> {
    const { context, from, to } = args;
    const results: CombinedPathResults = {};

    if (context.enabledGraphTypes.has("nxProjects")) {
      results.nxProjects = {
        from,
        path: this.queryNxProjects(args),
        to,
      };
    }

    if (context.enabledGraphTypes.has("fileImports")) {
      results.fileImports = {
        from,
        path: this.queryFileImports(args),
        to,
      };
    }

    if (context.enabledGraphTypes.has("nestjsModules")) {
      results.nestjsModules = {
        from,
        path: await this.queryNestjsModules(args),
        to,
      };
    }

    return results;
  }

  /** Renders combined path query results according to the selected format. */
  public render(args: PathReportArguments): string {
    if (args.format === FORMAT_JSON) {
      return JSON.stringify(args.results, null, JSON_INDENTATION);
    }

    if (args.format === FORMAT_MERMAID) {
      return this.renderMermaid(args.results);
    }

    return this.renderMarkdown(args.results);
  }

  /**
   * Reads `--format` into what the run prints, falling back to
   * `FORMAT_MARKDOWN` when the flag was left off entirely.
   */
  public resolveFormat(value: string | undefined): {
    errors: string[];
    format: PathFormat;
  } {
    if (value === undefined) {
      return { errors: [], format: FORMAT_MARKDOWN };
    }

    const matched = PATH_FORMAT_NAMES.find((name) => name === value);

    if (matched === undefined) {
      return {
        errors: [
          `--format does not accept "${value}". It takes one of ${PATH_FORMAT_NAMES.map((name) => `"${name}"`).join(" and ")}, as in "--format ${FORMAT_MARKDOWN}".`,
        ],
        format: FORMAT_MARKDOWN,
      };
    }

    return { errors: [], format: matched };
  }
}
