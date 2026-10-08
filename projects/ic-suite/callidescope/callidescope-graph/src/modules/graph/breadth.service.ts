import { Injectable } from "@nestjs/common";

import type { DiscoveredCallable } from "../callables/callables.types";
import type {
  BreadthMeasurement,
  CallableBreadth,
  CallableDirectCalls,
  CallableReference,
  CallGraph,
  MeasureBreadthArguments,
} from "./graph.types";
import type { CallableId } from "@callidescope/core";

/**
 * Measures how many distinct callables each callable calls directly.
 *
 * Unlike depth, this needs no condensation: a callable's breadth is well
 * defined even when it sits in a cycle, since it only ever looks at its own
 * row in `calleeIdsByCaller` — which `GraphService.assemble` has already
 * deduped and stripped of self-edges.
 */
@Injectable()
export class BreadthService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Names the callables reached by a list of ids, dropping unknown ones. */
  private toReferences(args: {
    callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
    ids: readonly CallableId[];
  }): CallableReference[] {
    const references: CallableReference[] = [];

    for (const id of args.ids) {
      const callable = args.callablesById.get(id);

      if (callable !== undefined) {
        references.push({
          displayName: callable.node.displayName,
          id,
          location: callable.node.location,
        });
      }
    }

    return references;
  }

  // 🌎 Public Methods

  /** Names one callable's direct callees and direct callers. */
  public describeDirectCalls(args: {
    callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
    graph: CallGraph;
    id: CallableId;
  }): CallableDirectCalls {
    return {
      callees: this.toReferences({
        callablesById: args.callablesById,
        ids: args.graph.calleeIdsByCaller.get(args.id) ?? [],
      }),
      callers: this.toReferences({
        callablesById: args.callablesById,
        ids: args.graph.callerIdsByCallee.get(args.id) ?? [],
      }),
    };
  }

  /** Measures the breadth of every named callable. */
  public measure(args: MeasureBreadthArguments): BreadthMeasurement {
    const byCallable = new Map<CallableId, CallableBreadth>();

    for (const callableId of args.callableIds) {
      const calleeIds = args.graph.calleeIdsByCaller.get(callableId) ?? [];

      byCallable.set(callableId, { breadth: calleeIds.length, calleeIds });
    }

    return { byCallable };
  }
}
