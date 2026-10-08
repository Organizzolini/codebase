// 🏷️ Types

import type { WorkspaceProject } from "../workspace/workspace.types";
import type ts from "typescript";

/** Arguments for building a program for every project in a closure. */
export interface BuildProgramsArguments {
  /**
   * The projects a run was asked to trace. Every one of them gets a program,
   * and so does every project their imports transitively reach.
   */
  readonly startingProjects: readonly WorkspaceProject[];
  /**
   * Every project the workspace holds, which is what lets a file one program
   * pulled in name the project that owns it — including a project no starting
   * root mentions. Nothing here is built unless the closure reaches it.
   */
  readonly workspaceProjects: readonly WorkspaceProject[];
  readonly workspaceRoot: string;
}

/** The programs a run built, and the ownership decisions behind them. */
export interface ProgramSet {
  /** Absolute real path to the program that owns it. */
  readonly ownerByFilePath: ReadonlyMap<string, ProjectProgram>;
  readonly programs: readonly ProjectProgram[];
}

/**
 * One project's program, its checker, and the files it owns.
 *
 * A file's declarations are walked exactly once, in the program that owns it.
 * Files pulled in as dependencies are still reachable through the checker, but
 * walking them here as well would double every callable in the graph.
 */
export interface ProjectProgram {
  readonly checker: ts.TypeChecker;
  /** Absolute real paths this program is responsible for walking. */
  readonly ownedFilePaths: ReadonlySet<string>;
  readonly program: ts.Program;
  readonly project: WorkspaceProject;
}
