// 🏷️ Types

import type { DiscoveredCallable } from "../callables/callables.types";
import type {
  CallableId,
  CallEdge,
  UnresolvedCall,
  UnresolvedReason,
} from "@callidescope/core";
import type ts from "typescript";

/** Arguments for turning every callable's body into edges. */
export interface BuildEdgesArguments {
  readonly callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
  readonly excludeCallees: readonly string[];
  readonly includeConstructorEdges: boolean;
  readonly workspaceRoot: string;
}

/** A call expression found inside one callable's own body. */
export interface CallSite {
  readonly expression: ts.CallExpression | ts.NewExpression;
  /** Function literals passed as arguments, each its own frame. */
  readonly functionArguments: readonly ts.SignatureDeclaration[];
}

/** Every edge a run resolved, and every call site it could not. */
export interface EdgeCollection {
  readonly edges: readonly CallEdge[];
  readonly unresolvedCalls: readonly UnresolvedCall[];
}

/** What resolving one call site produced. */
export interface ResolvedCallSite {
  readonly declarations: readonly ts.Declaration[];
  readonly reason: undefined | UnresolvedReason;
  readonly resolution: "alias" | "direct" | "implementation" | "super";
}
