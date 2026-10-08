// 🏷️ Types

import type { ProjectProgram } from "../program/program.types";
import type ts from "typescript";

/** Arguments for building the class-hierarchy index. */
export interface BuildHierarchyArguments {
  readonly programs: readonly ProjectProgram[];
}

/** What resolving an interface member to implementations produced. */
export interface ImplementationLookup {
  /** Concrete member declarations, empty when none could be resolved. */
  readonly declarations: readonly ts.Declaration[];
  /** True when the candidate set was larger than the cap. */
  readonly exceededCandidateLimit: boolean;
}
