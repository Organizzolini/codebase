import { Injectable } from "@nestjs/common";

import { PythonImportGraphService } from "./python-import-graph.service";
import { PythonProjectService } from "./python-project.service";

import type { PythonImportGraph, PythonProject } from "./python.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * The `python` module's public surface: discovers the workspace's Python
 * projects, and builds and renders one project's file-level import Graph.
 *
 * A thin facade over `PythonProjectService` (project discovery and
 * source-file listing) and `PythonImportGraphService` (parsing those files'
 * imports into a graph, itself backed by `PythonImportParserService`) —
 * kept as separate collaborators internally so each stays focused, with
 * this class the one file this repository's conformetry template for a
 * NestJS service module expects a flat module to expose.
 */
@Injectable()
/* v8 ignore stop */
export class PythonService {
  // 🏗 Dependency Injection

  constructor(
    private readonly pythonImportGraphService: PythonImportGraphService,
    private readonly pythonProjectService: PythonProjectService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Builds a Python project's internal file-level import Graph. */
  buildGraph(project: PythonProject): PythonImportGraph {
    return this.pythonImportGraphService.buildGraph(project);
  }

  /**
   * Filters an already-read list of Nx projects down to the ones tagged
   * `language:python`, and describes each one.
   */
  discoverProjects(
    projects: { absoluteRoot: string; name: string; tags: string[] }[],
  ): PythonProject[] {
    return this.pythonProjectService.discoverProjects(projects);
  }

  /** Renders an import graph as a fenced mermaid diagram. */
  renderMermaid(graph: PythonImportGraph): string {
    return this.pythonImportGraphService.renderMermaid(graph);
  }
}
