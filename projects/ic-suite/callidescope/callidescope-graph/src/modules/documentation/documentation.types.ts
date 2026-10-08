// 🏷️ Types

import type { CallableDeclaration } from "../callables/callables.types";
import type ts from "typescript";

/** Arguments for reading the documentation comment above a callable. */
export interface ReadDocumentationArguments {
  readonly checker: ts.TypeChecker;
  readonly declaration: CallableDeclaration;
}
