// 🏷️ Types

import type { CallableDeclaration } from "../callables/callables.types";
import type ts from "typescript";

/** Arguments for reading what a callable takes and returns. */
export interface ReadSignatureArguments {
  readonly checker: ts.TypeChecker;
  readonly declaration: CallableDeclaration;
}
