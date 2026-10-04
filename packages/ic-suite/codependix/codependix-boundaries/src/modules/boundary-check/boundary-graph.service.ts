import path from "node:path";

import { Injectable } from "@nestjs/common";

import type {
  BoundaryGraph,
  BoundaryNode,
} from "../boundaries/boundaries.types";
import type {
  PythonImportGraph,
  TypescriptImportGraph,
} from "@codependix/file-imports";
import type { NestjsModuleGraph } from "@codependix/nestjs-modules";
import type { NxProject, WorkspaceGraph } from "@codependix/nx-projects";

/**
 * Flattens each of codependix's four graphs into the one shape rules read.
 *
 * The adapters live here, in the host that already builds all four, rather
 * than in `@codependix/boundaries` — which would otherwise have to depend on
 * `@nestjs/core` and `typescript` to name the types it translates, for a
 * package whose whole job is evaluating rules. The four
 * already share an identical `{ source, target }` edge shape by construction,
 * so each adapter is only ever nodes, edges, and the attributes rules select
 * on.
 *
 * What each level knows differs, and the node shape says so: an Nx project
 * carries tags and a root, a file carries its project-relative path and the
 * project it belongs to, and a NestJS module carries its class name, declaring
 * file path, and project name.
 */
@Injectable()
export class BoundaryGraphService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds one file-level graph's nodes, which both languages share. */
  private buildFileNodes(args: {
    fileNames: readonly string[];
    projectName: string;
  }): BoundaryNode[] {
    return args.fileNames.map((fileName) => ({
      id: fileName,
      path: fileName,
      project: args.projectName,
    }));
  }

  /**
   * A project's workspace-relative root, or nothing when the graph knows of a
   * project the discovered list does not carry.
   */
  private resolveProjectRoot(
    absoluteRoot: string | undefined,
    workingDirectory: string,
  ): string | undefined {
    return absoluteRoot === undefined
      ? undefined
      : path.relative(workingDirectory, absoluteRoot);
  }

  // 🌎 Public Methods

  /**
   * Adapts one project's NestJS module graph.
   *
   * Nodes carry a name, their project-relative declaring file path, and the
   * project name they belong to.
   */
  public buildNestjsGraph(graph: NestjsModuleGraph): BoundaryGraph {
    return {
      edges: graph.edges,
      level: "nestjsModules",
      nodes: graph.nodes.map((node) => ({
        id: node.name,
        path: node.declaringFile,
        project: graph.projectName,
      })),
      scope: graph.projectName,
    };
  }

  /**
   * Adapts the whole-workspace Nx project graph.
   *
   * The workspace graph rather than each project's one-hop neighborhood: a
   * rule is a statement about the shape of the graph, and a neighborhood is
   * the same graph shown twice from either end of every edge.
   *
   * Tags come off the `NxProject`s themselves, because they are what makes
   * this level worth having: a tag rule reaches nothing unless the nodes it
   * judges carry them.
   */
  public buildNxGraph(args: {
    projects: readonly NxProject[];
    scope: string;
    workingDirectory: string;
    workspaceGraph: WorkspaceGraph;
  }): BoundaryGraph {
    const projectsByName = new Map(
      args.projects.map((project) => [project.name, project]),
    );

    return {
      edges: args.workspaceGraph.edges,
      level: "nxProjects",
      nodes: args.workspaceGraph.projectNames.map((name) => ({
        id: name,
        path: this.resolveProjectRoot(
          projectsByName.get(name)?.absoluteRoot,
          args.workingDirectory,
        ),
        project: name,
        tags: projectsByName.get(name)?.tags,
      })),
      scope: args.scope,
    };
  }

  /** Adapts one project's Python file-level import graph. */
  public buildPythonImportGraph(graph: PythonImportGraph): BoundaryGraph {
    return {
      edges: graph.edges,
      level: "python",
      nodes: this.buildFileNodes({
        fileNames: graph.fileNames,
        projectName: graph.projectName,
      }),
      scope: graph.projectName,
    };
  }

  /** Adapts one project's TypeScript file-level import graph. */
  public buildTypescriptImportGraph(
    graph: TypescriptImportGraph,
  ): BoundaryGraph {
    return {
      edges: graph.edges,
      level: "typescript",
      nodes: this.buildFileNodes({
        fileNames: graph.fileNames,
        projectName: graph.projectName,
      }),
      scope: graph.projectName,
    };
  }
}
