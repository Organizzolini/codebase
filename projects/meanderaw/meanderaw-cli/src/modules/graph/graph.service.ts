import { Injectable } from "@nestjs/common";

import type { InkAdjacency } from "./graph.types";

/**
 * The graph primitives, stated over an adjacency and nothing else.
 *
 * Nothing here knows what was counted. A meander's ink is asked "how many
 * pieces is this" in two coordinate systems that share no vocabulary — a
 * rendered document's bounded lattice, and a repeat unit whose ink wraps east
 * into its own first column — and rendering a unit in order to measure it
 * would answer a different question, since a rendering of `N` repeats shows
 * `N` copies of whatever one repeat contains. {@link InkAdjacency} is what
 * both readings can say, so it is what this service takes.
 *
 * It was the generic half of a service that also measured a rendered
 * document against the charter. The two never shared anything but a file:
 * one is a walk over an abstract adjacency, the other reads path data off an
 * SVG. Separating them is what lets a caller reach the walk without reaching
 * a drawing.
 */
@Injectable()
export class GraphService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Marks every node reachable from `start` along an edge as visited. */
  private walk<Node>(
    adjacency: InkAdjacency<Node>,
    start: Node,
    visited: Set<string>,
  ): void {
    const pending: Node[] = [start];

    visited.add(adjacency.key(start));

    for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
      for (const neighbor of adjacency.neighbors(node)) {
        const key = adjacency.key(neighbor);

        if (!visited.has(key)) {
          visited.add(key);
          pending.push(neighbor);
        }
      }
    }
  }

  // 🌎 Public Methods

  /**
   * How many connected pieces a graph falls into — the one quantity a
   * component count, a cycle count, and the forest and tree predicates
   * cannot be computed without, and the one that costs a walk.
   *
   * A node joined to nothing is a piece of its own, which is what makes an
   * inked dot — a zero-length stroke painting one lattice point — a
   * component rather than nothing.
   */
  components<Node>(adjacency: InkAdjacency<Node>): number {
    const visited = new Set<string>();
    let components = 0;

    for (const node of adjacency.nodes) {
      if (!visited.has(adjacency.key(node))) {
        components += 1;
        this.walk(adjacency, node, visited);
      }
    }

    return components;
  }
}
