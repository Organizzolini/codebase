import { Injectable } from "@nestjs/common";

import { INITIAL_LOW_LINK } from "./components.constants";

import type { TarjanState, TraversalFrame } from "./components.types";
import type { CallGraph, CondensedGraph } from "./graph.types";
import type { CallableId } from "@callidescope/core";

/**
 * Collapses every cycle in the call graph into a single node.
 *
 * Longest path is only defined on an acyclic graph, so recursion has to be
 * dealt with before depth is measured rather than during it. The obvious
 * alternative — detecting a repeat visit while walking — makes the memoized
 * depth depend on which path happened to arrive first, so the same function
 * reports different depths from different entry points and between runs. A
 * linter whose numbers move on their own is not usable as a gate.
 *
 * Condensing instead gives every cycle one cost, counted once: three functions
 * calling each other in a ring contribute three frames, which is an honest
 * floor on a stack that has no ceiling.
 *
 * The traversal is iterative because the graph is deep enough that a recursive
 * one risks blowing the JavaScript stack while measuring stack depth.
 */
@Injectable()
export class ComponentsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Closes a completed node, emitting a component when it is a root.
   *
   * A node whose low link never moved below its own discovery order is the
   * entry point of a strongly connected component, and everything above it on
   * the pending stack belongs to that component.
   */
  private closeNode(args: {
    callableId: CallableId;
    state: TarjanState;
  }): void {
    const { callableId, state } = args;

    if (state.lowLink.get(callableId) !== state.order.get(callableId)) {
      return;
    }

    // Taken in one slice rather than popped one at a time: the node is always
    // on the stack, so a loop would carry an empty-stack case that cannot
    // happen.
    const members = state.pending.splice(state.pending.indexOf(callableId));

    for (const member of members) {
      state.onStack.delete(member);
      state.componentIdByCallable.set(
        member,
        state.memberIdsByComponent.length,
      );
    }

    state.memberIdsByComponent.push(members);
  }

  /** Pops a finished frame, emitting its component and lifting its low link. */
  private finishFrame(args: {
    callableId: CallableId;
    state: TarjanState;
  }): void {
    const { callableId, state } = args;

    state.frames.pop();
    this.closeNode({ callableId, state });

    const parent = state.frames.at(-1);

    if (parent !== undefined) {
      this.liftLowLink({ child: callableId, parent: parent.callableId, state });
    }
  }

  /** Propagates a finished child's low link into its parent. */
  private liftLowLink(args: {
    child: CallableId;
    parent: CallableId;
    state: TarjanState;
  }): void {
    // Both nodes were opened before this runs, so both entries exist; the
    // fallback is what `Map.get` returning `T | undefined` costs, not a case
    // the traversal can reach.
    const parentLow = args.state.lowLink.get(args.parent) ?? INITIAL_LOW_LINK;
    const childLow = args.state.lowLink.get(args.child) ?? INITIAL_LOW_LINK;

    args.state.lowLink.set(args.parent, Math.min(parentLow, childLow));
  }

  /** Records the discovery order of a node and pushes it onto the stack. */
  private openNode(args: { callableId: CallableId; state: TarjanState }): void {
    const { callableId, state } = args;

    state.order.set(callableId, state.sequence);
    state.lowLink.set(callableId, state.sequence);
    state.sequence += 1;
    state.pending.push(callableId);
    state.onStack.add(callableId);
    state.frames.push({ callableId, successorIndex: 0 });
  }

  /** Advances the traversal by one step from the given frame. */
  private step(args: {
    frame: TraversalFrame;
    graph: CallGraph;
    state: TarjanState;
  }): void {
    const { frame, graph, state } = args;
    const successors = graph.calleeIdsByCaller.get(frame.callableId) ?? [];

    if (frame.successorIndex >= successors.length) {
      this.finishFrame({ callableId: frame.callableId, state });

      return;
    }

    const successor = successors[frame.successorIndex];
    frame.successorIndex += 1;

    if (successor !== undefined) {
      this.visitSuccessor({ parentId: frame.callableId, state, successor });
    }
  }

  /** Descends into one successor, or folds it back if already seen. */
  private visitSuccessor(args: {
    parentId: CallableId;
    state: TarjanState;
    successor: CallableId;
  }): void {
    const { parentId, state, successor } = args;

    if (!state.order.has(successor)) {
      this.openNode({ callableId: successor, state });

      return;
    }

    if (state.onStack.has(successor)) {
      this.liftLowLink({ child: successor, parent: parentId, state });
    }
  }

  // 🌎 Public Methods

  /** Lifts the callable-level edges onto the condensed components. */
  public buildSuccessors(args: {
    componentIdByCallable: ReadonlyMap<CallableId, number>;
    graph: CallGraph;
    memberIdsByComponent: readonly (readonly CallableId[])[];
  }): ReadonlySet<number>[] {
    return args.memberIdsByComponent.map((members, componentId) => {
      const successors = new Set<number>();

      for (const member of members) {
        for (const calleeId of args.graph.calleeIdsByCaller.get(member) ?? []) {
          const target = args.componentIdByCallable.get(calleeId);

          if (target !== undefined && target !== componentId) {
            successors.add(target);
          }
        }
      }

      return successors;
    });
  }

  /** Condenses the graph, returning components in reverse topological order. */
  public condense(args: {
    callableIds: Iterable<CallableId, undefined, undefined>;
    graph: CallGraph;
  }): CondensedGraph {
    const state: TarjanState = {
      componentIdByCallable: new Map(),
      frames: [],
      lowLink: new Map(),
      memberIdsByComponent: [],
      onStack: new Set(),
      order: new Map(),
      pending: [],
      sequence: 0,
    };

    for (const callableId of args.callableIds) {
      if (state.order.has(callableId)) {
        continue;
      }

      this.openNode({ callableId, state });

      for (
        let frame = state.frames.at(-1);
        frame !== undefined;
        frame = state.frames.at(-1)
      ) {
        this.step({ frame, graph: args.graph, state });
      }
    }

    return {
      componentIdByCallable: state.componentIdByCallable,
      memberIdsByComponent: state.memberIdsByComponent,
      successorsByComponent: this.buildSuccessors({
        componentIdByCallable: state.componentIdByCallable,
        graph: args.graph,
        memberIdsByComponent: state.memberIdsByComponent,
      }),
    };
  }
}
