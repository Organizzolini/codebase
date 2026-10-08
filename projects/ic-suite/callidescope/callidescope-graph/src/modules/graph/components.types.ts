// 🏷️ Types

import type { CallableId } from "@callidescope/core";

/**
 * The bookkeeping Tarjan's algorithm carries.
 *
 * Threaded as one object so the traversal can be split into small steps
 * without any of them taking a long parameter list.
 */
export interface TarjanState {
  readonly componentIdByCallable: Map<CallableId, number>;
  readonly frames: TraversalFrame[];
  readonly lowLink: Map<CallableId, number>;
  readonly memberIdsByComponent: CallableId[][];
  readonly onStack: Set<CallableId>;
  readonly order: Map<CallableId, number>;
  readonly pending: CallableId[];
  sequence: number;
}

/** One frame of the explicit stack the iterative traversal walks. */
export interface TraversalFrame {
  readonly callableId: CallableId;
  /** How many successors of this node have been visited so far. */
  successorIndex: number;
}
