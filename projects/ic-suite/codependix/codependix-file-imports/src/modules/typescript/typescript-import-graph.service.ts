import path from "node:path";

import { Injectable } from "@nestjs/common";
import ts from "typescript";

import { TypescriptProjectService } from "./typescript-project.service";
import {
  DECLARATION_FILE_EXTENSION,
  TYPESCRIPT_IMPORT_GRAPH_MERMAID_HEADER,
  TYPESCRIPT_IMPORT_GRAPH_UNCONNECTED,
} from "./typescript.constants";

import type {
  TypescriptImportGraph,
  TypescriptImportGraphEdge,
  TypescriptProjectProgram,
} from "./typescript.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Builds a project's internal file-level import Graph from a `ts.Program`,
 * and renders it.
 *
 * Every import specifier is resolved through `ts.resolveModuleName`, called
 * with the exact compiler options and host `TypescriptProjectService` built
 * the program with — the compiler's own module resolution, so this
 * workspace's TypeScript path aliases and NodeNext `.js`-extension imports
 * resolve to the real `.ts` source file they point at, rather than through a
 * hand-written path heuristic. Import declarations are detected the same way
 * `codometer-cli`'s `TypescriptService.handleImport` does: `ts.isImportDeclaration`
 * on a string-literal module specifier.
 */
@Injectable()
/* v8 ignore stop */
export class TypescriptImportGraphService {
  // 🏗 Dependency Injection

  constructor(
    private readonly typescriptProjectService: TypescriptProjectService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Collects every internal import edge one source file declares. */
  private collectEdgesForFile(args: {
    ownedFileNames: ReadonlySet<string>;
    projectProgram: TypescriptProjectProgram;
    sourceFileName: string;
  }): TypescriptImportGraphEdge[] {
    const { ownedFileNames, projectProgram, sourceFileName } = args;
    const sourceFile = projectProgram.program.getSourceFile(sourceFileName);

    /* v8 ignore next -- sourceFileName always comes from this same program's
       own root file names, so the program always has a source file for it */
    if (sourceFile === undefined) return [];

    const edges: TypescriptImportGraphEdge[] = [];

    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      /* v8 ignore next -- an ImportDeclaration's moduleSpecifier is always a
         string literal by grammar; the guard only narrows the type */
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;

      const targetFileName = this.resolveImportTarget({
        containingFileName: sourceFileName,
        projectProgram,
        specifier: statement.moduleSpecifier.text,
      });

      if (targetFileName === undefined) continue;
      if (!ownedFileNames.has(targetFileName)) continue;
      if (targetFileName === sourceFileName) continue;

      edges.push({
        source: this.toRelativePath(projectProgram, sourceFileName),
        target: this.toRelativePath(projectProgram, targetFileName),
      });
    }

    return edges;
  }

  /** Sorts edges by source then target so a rendered diagram never churns. */
  private compareEdges(
    first: TypescriptImportGraphEdge,
    second: TypescriptImportGraphEdge,
  ): number {
    return (
      first.source.localeCompare(second.source) ||
      first.target.localeCompare(second.target)
    );
  }

  /** Drops duplicate edges, keeping the sorted order they were built in. */
  private dedupeEdges(
    edges: TypescriptImportGraphEdge[],
  ): TypescriptImportGraphEdge[] {
    const byKey = new Map<string, TypescriptImportGraphEdge>();

    for (const edge of edges) {
      byKey.set(`${edge.source}->${edge.target}`, edge);
    }

    return [...byKey.values()].toSorted((first, second) =>
      this.compareEdges(first, second),
    );
  }

  /**
   * Lists a program's own source files, excluding declaration files.
   *
   * `program.getRootFileNames()` is the same file list
   * `TypescriptProjectService.buildProgram` handed to `ts.createProgram` —
   * the project's own files, not the ones it merely pulls in as
   * dependencies.
   */
  private listOwnedSourceFileNames(
    projectProgram: TypescriptProjectProgram,
  ): string[] {
    return [...this.resolveOwnedFileNames(projectProgram)]
      .filter((fileName) => !fileName.endsWith(DECLARATION_FILE_EXTENSION))
      .toSorted((first, second) => first.localeCompare(second));
  }

  /** Renders one file as a mermaid node, labelled with its relative path. */
  private renderNode(fileName: string): string {
    return `  ${this.toNodeIdentifier(fileName)}["${fileName}"]`;
  }

  /** Resolves an import specifier to a real, absolute file path. */
  private resolveImportTarget(args: {
    containingFileName: string;
    projectProgram: TypescriptProjectProgram;
    specifier: string;
  }): string | undefined {
    const { containingFileName, projectProgram, specifier } = args;
    const resolution = ts.resolveModuleName(
      specifier,
      containingFileName,
      projectProgram.options,
      projectProgram.host,
    );
    const resolvedFileName = resolution.resolvedModule?.resolvedFileName;

    return resolvedFileName === undefined
      ? undefined
      : this.typescriptProjectService.toRealPath(resolvedFileName);
  }

  /** Resolves the real, absolute file names a program owns. */
  private resolveOwnedFileNames(
    projectProgram: TypescriptProjectProgram,
  ): Set<string> {
    return new Set(
      projectProgram.program
        .getRootFileNames()
        .map((fileName) => this.typescriptProjectService.toRealPath(fileName)),
    );
  }

  /** Turns a relative file path into an identifier mermaid accepts. */
  private toNodeIdentifier(fileName: string): string {
    return `file_${fileName.replaceAll(/[^\dA-Za-z]/gu, "_")}`;
  }

  /** Expresses an absolute file path relative to its project, POSIX-style. */
  private toRelativePath(
    projectProgram: TypescriptProjectProgram,
    absoluteFileName: string,
  ): string {
    return path
      .relative(projectProgram.project.absoluteRoot, absoluteFileName)
      .split(path.sep)
      .join("/");
  }

  // 🌎 Public Methods

  /** Builds a project's internal file-level import Graph from its program. */
  buildGraph(projectProgram: TypescriptProjectProgram): TypescriptImportGraph {
    const ownedFileNames = this.resolveOwnedFileNames(projectProgram);
    const sourceFileNames = this.listOwnedSourceFileNames(projectProgram);
    const edges = this.dedupeEdges(
      sourceFileNames.flatMap((sourceFileName) =>
        this.collectEdgesForFile({
          ownedFileNames,
          projectProgram,
          sourceFileName,
        }),
      ),
    );
    const connectedFileNames = new Set(
      edges.flatMap((edge) => [edge.source, edge.target]),
    );
    const fileNames = sourceFileNames
      .map((fileName) => this.toRelativePath(projectProgram, fileName))
      .toSorted((first, second) => first.localeCompare(second));

    return {
      edges,
      fileNames,
      isolatedFileNames: fileNames.filter(
        (fileName) => !connectedFileNames.has(fileName),
      ),
      projectName: projectProgram.project.name,
    };
  }

  /** Renders an import graph as a fenced mermaid diagram. */
  renderMermaid(graph: TypescriptImportGraph): string {
    if (graph.edges.length === 0) {
      return TYPESCRIPT_IMPORT_GRAPH_UNCONNECTED;
    }

    const lines = [
      "```mermaid",
      TYPESCRIPT_IMPORT_GRAPH_MERMAID_HEADER,
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
