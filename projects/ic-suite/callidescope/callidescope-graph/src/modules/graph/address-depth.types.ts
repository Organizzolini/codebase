// 🏷️ Types

import type { DiscoveredCallable } from "../callables/callables.types";
import type { CallGraph } from "./graph.types";
import type { CallableId, StackFrame } from "@callidescope/core";

/** What one direction's walk reads a neighbor from, and what it may render. */
export interface AddressDepthTraversalContext {
  readonly adjacency: ReadonlyMap<CallableId, readonly CallableId[]>;
  readonly callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
}

/** One partly walked path, kept on an explicit stack rather than recursion. */
export interface AddressDepthTraversalFrame {
  /** The path's last member, kept alongside it rather than re-read from it. */
  readonly currentId: CallableId;
  nextIndex: number;
  readonly path: readonly CallableId[];
}

/** Arguments for tracing every path in one direction from a callable. */
export interface BuildCallAddressStacksArguments {
  readonly callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
  readonly graph: CallGraph;
  readonly startId: CallableId;
}

/** One simple path traced above or below an addressed callable. */
export interface CallAddressStack {
  readonly frames: readonly StackFrame[];
  /**
   * True when a frame on this path holds an unresolved call, making the path
   * a floor rather than a complete picture of what lies beyond it.
   */
  readonly isLowerBound: boolean;
}

/** Every path traced in one direction, and whether the walk was capped. */
export interface CallAddressTreeResult {
  readonly stacks: readonly CallAddressStack[];
  /** True when `MAXIMUM_CALL_ADDRESS_STACKS` was reached before the walk finished. */
  readonly truncated: boolean;
}
