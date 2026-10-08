// 🏷️ Types

import type ts from "typescript";

/**
 * A TypeScript project's internal file-level import Graph: which of its own
 * files import which other of its own files.
 *
 * Only edges resolving to a file inside the project are kept — an import of
 * an external package or of another workspace project resolves outside
 * `fileNames` and is left out, the same way `Neighborhood` only draws edges
 * between projects it already knows about.
 */
export interface TypescriptImportGraph {
  /** Every drawn import relationship, sorted so the diagram never churns. */
  readonly edges: TypescriptImportGraphEdge[];
  /** Every source file in the graph, project-relative and sorted. */
  readonly fileNames: string[];
  /** Files left with no drawn edge in either direction. */
  readonly isolatedFileNames: string[];
  /** The project the graph was built from. */
  readonly projectName: string;
}

/** One file importing another, both paths project-relative. */
export interface TypescriptImportGraphEdge {
  readonly source: string;
  readonly target: string;
}

/**
 * A workspace project whose own `tsconfig.json` can be turned into a program.
 *
 * Every workspace project is a candidate, unlike `codependix-nestjs-modules`'s
 * `NestjsProject`, which is gated to projects tagged `framework:nestjs` — a
 * file-level import graph is meaningful for any TypeScript project.
 */
export interface TypescriptProject {
  /** Absolute path of the project directory. */
  readonly absoluteRoot: string;
  /** Project directory name, which is also the Nx project name. */
  readonly name: string;
  /** Absolute path of the project's `tsconfig.json`. */
  readonly tsconfigPath: string;
}

/**
 * One project's program together with the compiler host and options that
 * built it.
 *
 * The host and options travel with the program rather than being rebuilt by
 * `TypescriptImportGraphService`: resolving an import specifier through
 * `ts.resolveModuleName` needs the exact same host and options the program
 * itself was built with, or module resolution could silently disagree with
 * what the program actually parsed.
 */
export interface TypescriptProjectProgram {
  readonly host: ts.CompilerHost;
  readonly options: ts.CompilerOptions;
  readonly program: ts.Program;
  readonly project: TypescriptProject;
}
