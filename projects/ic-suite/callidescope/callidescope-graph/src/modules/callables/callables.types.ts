// 🏷️ Types

import type { ProjectProgram } from "../program/program.types";
import type { FileFilter } from "../workspace/workspace.types";
import type { CallableId, CallableNode } from "@callidescope/core";
import type ts from "typescript";

/** Everything the walk over owned files produced. */
export interface CallableCollection {
  readonly byId: ReadonlyMap<CallableId, DiscoveredCallable>;
  readonly fileCount: number;
  /** How many files each project contributed, for its own report. */
  readonly fileCountByProject: ReadonlyMap<string, number>;
}

/** Any declaration the tool treats as a frame on a call stack. */
export type CallableDeclaration =
  | ts.ArrowFunction
  | ts.ConstructorDeclaration
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.GetAccessorDeclaration
  | ts.MethodDeclaration
  | ts.SetAccessorDeclaration;

/** Arguments for collecting every callable a run will trace. */
export interface CollectCallablesArguments {
  readonly fileFilter: FileFilter;
  /** What a project that declared no entry-point rules of its own is judged by. */
  readonly includeTests: boolean;
  /**
   * The answer each project declared for itself, keyed by project name.
   *
   * A project absent here is judged by `includeTests`, exactly the way a
   * project absent from `entryPointsByProject` is judged by the run's own
   * entry-point rules — this is the same declaration read at the one layer
   * that can act on it, since which files a run even looks at is settled here
   * rather than when roots are chosen.
   */
  readonly includeTestsByProject: ReadonlyMap<string, boolean>;
  readonly ownerByFilePath: ReadonlyMap<string, ProjectProgram>;
  readonly workspaceRoot: string;
}

/** Arguments for naming one declaration. */
export interface DescribeCallableArguments {
  readonly declaration: CallableDeclaration;
  readonly projectProgram: ProjectProgram;
  readonly workspaceRelativePath: string;
}

/** One discovered callable, kept alongside the node it was found at. */
export interface DiscoveredCallable {
  readonly declaration: CallableDeclaration;
  readonly node: CallableNode;
  readonly projectProgram: ProjectProgram;
}
