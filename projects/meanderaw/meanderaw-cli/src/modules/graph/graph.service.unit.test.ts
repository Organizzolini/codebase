import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GraphService } from "./graph.service";

import type { InkAdjacency } from "./graph.types";

// 🔧 Configuration

/**
 * An adjacency over plain string nodes, built from undirected edges written
 * as `"a-b"`.
 *
 * Strings rather than either caller's own point type on purpose: what this
 * service knows about a graph is that its nodes can be enumerated, followed,
 * and told apart, and a test that reached for a lattice point or a Code
 * position would be asserting that alongside the walk.
 */
const adjacency = (
  nodes: readonly string[],
  edges: readonly string[],
): InkAdjacency<string> => {
  const neighbors = new Map<string, string[]>();

  for (const edge of edges) {
    const [from = "", to = ""] = edge.split("-");

    neighbors.set(from, [...(neighbors.get(from) ?? []), to]);
    neighbors.set(to, [...(neighbors.get(to) ?? []), from]);
  }

  return {
    key: (node) => node,
    neighbors: (node) => neighbors.get(node) ?? [],
    nodes,
  };
};

// 🧪 Tests

describe(GraphService, () => {
  let service: GraphService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [GraphService],
    }).compile();

    service = await module.resolve(GraphService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("components", () => {
    it("counts an empty graph as no pieces at all", () => {
      expect(service.components(adjacency([], []))).toBe(0);
    });

    it("counts a node joined to nothing as a piece of its own, which is what makes an inked dot a component", () => {
      expect(service.components(adjacency(["a", "b", "c"], []))).toBe(3);
    });

    it("counts a run of joined nodes as one piece however long it is", () => {
      expect(
        service.components(
          adjacency(["a", "b", "c", "d"], ["a-b", "b-c", "c-d"]),
        ),
      ).toBe(1);
    });

    it("counts two joined runs as two pieces", () => {
      expect(
        service.components(adjacency(["a", "b", "c", "d"], ["a-b", "c-d"])),
      ).toBe(2);
    });

    it("counts a closed loop as one piece, so arriving back at a node already walked is not a second piece", () => {
      expect(
        service.components(adjacency(["a", "b", "c"], ["a-b", "b-c", "c-a"])),
      ).toBe(1);
    });

    it("counts a self-loop's node once, since an edge from a node to itself reaches nothing new", () => {
      expect(service.components(adjacency(["a"], ["a-a"]))).toBe(1);
    });

    it("treats two arrivals at one node as one node, which is the whole of what a key is for", () => {
      const shared: InkAdjacency<{ readonly at: string }> = {
        key: ({ at }) => at,
        neighbors: ({ at }) => (at === "a" ? [{ at: "b" }, { at: "b" }] : []),
        nodes: [{ at: "a" }, { at: "b" }],
      };

      expect(service.components(shared)).toBe(1);
    });
  });
});
