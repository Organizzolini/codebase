import { Injectable } from "@nestjs/common";

import type {
  BoundaryCycle,
  BoundaryEdge,
  CycleWalkState,
  FindCyclesArguments,
} from "./boundaries.types";

/**
 * Finds the cycles in a graph, within a selected set of nodes.
 *
 * A cycle is the one finding no rule reading a single file can make, which is
 * why it is a rule kind of its own rather than an access rule with a clever
 * selector. Scoped to a node set rather than always the whole graph: a rule
 * covering one directory should not fail because of a cycle running entirely
 * through code it was never asked about.
 *
 * One cycle is reported per distinct set of nodes, keyed on the cycle rotated
 * to start at its smallest node — so a three-node cycle is one finding rather
 * than the same finding printed once per node it passes through.
 */
@Injectable()
export class BoundaryCyclesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the outgoing-edge map, keeping only edges inside the node set. */
  private buildAdjacency(args: {
    edges: readonly BoundaryEdge[];
    nodeIds: ReadonlySet<string>;
  }): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();

    for (const edge of args.edges) {
      if (!args.nodeIds.has(edge.source) || !args.nodeIds.has(edge.target)) {
        continue;
      }

      const targets = adjacency.get(edge.source) ?? [];

      targets.push(edge.target);
      adjacency.set(edge.source, targets);
    }

    for (const [source, targets] of adjacency) {
      adjacency.set(source, targets.toSorted());
    }

    return adjacency;
  }

  /**
   * The key every cycle over the same nodes shares.
   *
   * The node set rather than the path: `a → b → a` and `b → a → b` are one
   * finding written two ways, and so are the two directions round a
   * three-node cycle. Reporting the first path found through a set of nodes
   * and nothing else is what keeps one tangle from printing as six findings.
   */
  private buildCycleKey(path: readonly string[]): string {
    return [...new Set(path)].toSorted().join(">");
  }

  /** Records the cycle closed by walking back to a node already on the path. */
  private recordCycle(args: {
    source: string;
    state: CycleWalkState;
    target: string;
  }): void {
    const { source, state, target } = args;
    const path = [...state.stack.slice(state.stack.indexOf(target)), target];
    const key = this.buildCycleKey(path);

    if (state.keys.has(key)) {
      return;
    }

    state.keys.add(key);
    state.cycles.push({ path, source, target });
  }

  /** Walks one node's subtree depth-first, recording every cycle it closes. */
  private walk(args: {
    adjacency: Map<string, string[]>;
    node: string;
    state: CycleWalkState;
  }): void {
    const { adjacency, node, state } = args;

    state.onStack.add(node);
    state.stack.push(node);

    for (const next of adjacency.get(node) ?? []) {
      if (state.onStack.has(next)) {
        this.recordCycle({ source: node, state, target: next });
        continue;
      }

      if (!state.visited.has(next)) {
        this.walk({ adjacency, node: next, state });
      }
    }

    state.stack.pop();
    state.onStack.delete(node);
    state.visited.add(node);
  }

  // 🌎 Public Methods

  /**
   * Every cycle lying entirely inside the given node set.
   *
   * Nodes are walked in sorted order and each cycle is reported starting from
   * the node the walk reached first, so the same graph always produces the
   * same findings in the same order — a report that reshuffles itself between
   * runs is one nobody can diff.
   */
  public findCycles(args: FindCyclesArguments): BoundaryCycle[] {
    const adjacency = this.buildAdjacency(args);
    const state: CycleWalkState = {
      cycles: [],
      keys: new Set(),
      onStack: new Set(),
      stack: [],
      visited: new Set(),
    };

    for (const node of [...args.nodeIds].toSorted()) {
      if (!state.visited.has(node)) {
        this.walk({ adjacency, node, state });
      }
    }

    return state.cycles;
  }
}
