import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { PythonImportParserService } from "./python-import-parser.service";
import { PythonProjectService } from "./python-project.service";
import {
  PYTHON_FILE_EXTENSION,
  PYTHON_IMPORT_GRAPH_MERMAID_HEADER,
  PYTHON_IMPORT_GRAPH_UNCONNECTED,
  PYTHON_PACKAGE_INIT_FILE_NAME,
} from "./python.constants";

import type { PythonImportSpecifier } from "./python-import-parser.types";
import type {
  PythonImportGraph,
  PythonImportGraphEdge,
  PythonProject,
} from "./python.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Builds a Python project's internal file-level import Graph, and renders it.
 *
 * Every source file's top-level import statements are read through
 * `PythonImportParserService`, then each specifier is resolved to a real
 * file with `resolveSpecifierPath` — the closest Python equivalent of
 * `ts.resolveModuleName`, since Python has no compiler API to delegate to.
 * An absolute specifier (`from src.grammars import Grammar`) resolves
 * relative to the project root; a relative one (`from .grammars import Grammar`)
 * resolves relative to the importing file's own directory, ascended once per
 * extra leading dot. An edge is kept only when it resolves to a file this
 * project owns, the same rule `TypescriptImportGraphService.buildGraph` applies.
 */
@Injectable()
/* v8 ignore stop */
export class PythonImportGraphService {
  // 🏗 Dependency Injection

  constructor(
    private readonly pythonImportParserService: PythonImportParserService,
    private readonly pythonProjectService: PythonProjectService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Walks a directory upward a number of levels. */
  private ascendDirectories(directory: string, levels: number): string {
    let result = directory;

    for (let count = 0; count < levels; count += 1) {
      result = path.dirname(result);
    }

    return result;
  }

  /** Collects every internal import edge one source file declares. */
  private collectEdgesForFile(args: {
    ownedFileNames: ReadonlySet<string>;
    project: PythonProject;
    sourceFileName: string;
  }): PythonImportGraphEdge[] {
    const { ownedFileNames, project, sourceFileName } = args;
    const specifiers = this.pythonImportParserService.parseImportSpecifiers(
      readFileSync(sourceFileName, "utf8"),
    );
    const edges: PythonImportGraphEdge[] = [];

    for (const specifier of specifiers) {
      const targetFileName = this.resolveSpecifierPath({
        containingFileName: sourceFileName,
        project,
        specifier,
      });

      if (targetFileName === undefined) continue;
      if (!ownedFileNames.has(targetFileName)) continue;
      if (targetFileName === sourceFileName) continue;

      edges.push({
        source: this.toRelativePath(project, sourceFileName),
        target: this.toRelativePath(project, targetFileName),
      });
    }

    return edges;
  }

  /** Sorts edges by source then target so a rendered diagram never churns. */
  private compareEdges(
    first: PythonImportGraphEdge,
    second: PythonImportGraphEdge,
  ): number {
    return (
      first.source.localeCompare(second.source) ||
      first.target.localeCompare(second.target)
    );
  }

  /** Drops duplicate edges, keeping the sorted order they were built in. */
  private dedupeEdges(edges: PythonImportGraphEdge[]): PythonImportGraphEdge[] {
    const byKey = new Map<string, PythonImportGraphEdge>();

    for (const edge of edges) {
      byKey.set(`${edge.source}->${edge.target}`, edge);
    }

    return [...byKey.values()].toSorted((first, second) =>
      this.compareEdges(first, second),
    );
  }

  /** Renders one file as a mermaid node, labelled with its relative path. */
  private renderNode(fileName: string): string {
    return `  ${this.toNodeIdentifier(fileName)}["${fileName}"]`;
  }

  /**
   * Resolves an import specifier to an absolute file path, checked against
   * the filesystem — the closest Python has to `ts.resolveModuleName`
   * checking against a compiler host.
   *
   * A specifier with no module path (`from . import name`) resolves the
   * package directory itself — its `__init__.py` — since there is no
   * standalone file a bare relative import could otherwise name.
   */
  private resolveSpecifierPath(args: {
    containingFileName: string;
    project: PythonProject;
    specifier: PythonImportSpecifier;
  }): string | undefined {
    const { containingFileName, project, specifier } = args;
    const baseDirectory =
      specifier.level === 0
        ? project.absoluteRoot
        : this.ascendDirectories(
            path.dirname(containingFileName),
            specifier.level - 1,
          );
    const relativeSegments =
      specifier.modulePath.length === 0 ? [] : specifier.modulePath.split(".");
    const candidateBase = path.join(baseDirectory, ...relativeSegments);

    if (relativeSegments.length > 0) {
      const moduleFile = `${candidateBase}${PYTHON_FILE_EXTENSION}`;

      if (existsSync(moduleFile)) return moduleFile;
    }

    const packageFile = path.join(candidateBase, PYTHON_PACKAGE_INIT_FILE_NAME);

    return existsSync(packageFile) ? packageFile : undefined;
  }

  /** Turns a relative file path into an identifier mermaid accepts. */
  private toNodeIdentifier(fileName: string): string {
    return `file_${fileName.replaceAll(/[^\dA-Za-z]/gu, "_")}`;
  }

  /** Expresses an absolute file path relative to its project, POSIX-style. */
  private toRelativePath(
    project: PythonProject,
    absoluteFileName: string,
  ): string {
    return path
      .relative(project.absoluteRoot, absoluteFileName)
      .split(path.sep)
      .join("/");
  }

  // 🌎 Public Methods

  /** Builds a Python project's internal file-level import Graph. */
  buildGraph(project: PythonProject): PythonImportGraph {
    const sourceFileNames =
      this.pythonProjectService.listSourceFileNames(project);
    const ownedFileNames = new Set(sourceFileNames);
    const edges = this.dedupeEdges(
      sourceFileNames.flatMap((sourceFileName) =>
        this.collectEdgesForFile({ ownedFileNames, project, sourceFileName }),
      ),
    );
    const connectedFileNames = new Set(
      edges.flatMap((edge) => [edge.source, edge.target]),
    );
    const fileNames = sourceFileNames
      .map((fileName) => this.toRelativePath(project, fileName))
      .toSorted((first, second) => first.localeCompare(second));

    return {
      edges,
      fileNames,
      isolatedFileNames: fileNames.filter(
        (fileName) => !connectedFileNames.has(fileName),
      ),
      projectName: project.name,
    };
  }

  /** Renders an import graph as a fenced mermaid diagram. */
  renderMermaid(graph: PythonImportGraph): string {
    if (graph.edges.length === 0) {
      return PYTHON_IMPORT_GRAPH_UNCONNECTED;
    }

    const lines = [
      "```mermaid",
      PYTHON_IMPORT_GRAPH_MERMAID_HEADER,
      ...graph.fileNames.map((fileName) => this.renderNode(fileName)),
      ...graph.edges.map(
        (edge) =>
          `  ${this.toNodeIdentifier(edge.source)} --> ${this.toNodeIdentifier(edge.target)}`,
      ),
      "```",
    ];

    return lines.join("\n");
  }
}
