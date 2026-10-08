import { Injectable } from "@nestjs/common";

import type { EdgeCollection } from "../edges/edges.types";
import type { CallGraph } from "./graph.types";
import type { CallableId } from "@callidescope/core";

/**
 * Assembles the resolved edges into a graph indexed in both directions.
 *
 * Callers are indexed as well as callees because addressing one callable asks
 * who calls it as often as it asks what it calls, and answering that from an
 * index costs nothing once the edges exist.
 */
@Injectable()
export class GraphService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Appends a value to the list stored under a key. */
  private append(args: {
    index: Map<CallableId, CallableId[]>;
    key: CallableId;
    value: CallableId;
  }): void {
    const existing = args.index.get(args.key);

    if (existing === undefined) {
      args.index.set(args.key, [args.value]);
    } else if (!existing.includes(args.value)) {
      existing.push(args.value);
    }
  }

  // 🌎 Public Methods

  /** Builds the two-way index over one run's edges. */
  public assemble(collection: EdgeCollection): CallGraph {
    const calleeIdsByCaller = new Map<CallableId, CallableId[]>();
    const callerIdsByCallee = new Map<CallableId, CallableId[]>();

    for (const edge of collection.edges) {
      // Self-edges are dropped: direct recursion is real, but as a graph edge
      // it only ever makes a one-member cycle that adds nothing a report can
      // act on, and it complicates every traversal that follows.
      if (edge.callerId === edge.calleeId) {
        continue;
      }

      this.append({
        index: calleeIdsByCaller,
        key: edge.callerId,
        value: edge.calleeId,
      });
      this.append({
        index: callerIdsByCallee,
        key: edge.calleeId,
        value: edge.callerId,
      });
    }

    return {
      calleeIdsByCaller,
      callerIdsByCallee,
      edges: collection.edges,
      unresolvedCallerIds: new Set(
        collection.unresolvedCalls.map((call) => call.callerId),
      ),
      unresolvedCalls: collection.unresolvedCalls,
    };
  }
}
