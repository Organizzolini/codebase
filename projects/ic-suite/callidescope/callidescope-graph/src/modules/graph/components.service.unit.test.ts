import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";

import { ComponentsService } from "./components.service";
import { GraphService } from "./graph.service";

import type { CondensedGraph } from "./graph.types";
import type { CallEdge } from "@callidescope/core";

/** Condenses a graph described as `from -> to` pairs. */
function condense(args: {
  ids: string[];
  pairs: [string, string][];
}): CondensedGraph {
  const graph = new GraphService().assemble({
    edges: args.pairs.map(([from, to]) => edge(from, to)),
    unresolvedCalls: [],
  });

  return new ComponentsService().condense({ callableIds: args.ids, graph });
}

/** Builds an edge between two identifiers. */
function edge(from: string, to: string): CallEdge {
  return {
    calleeId: to,
    callerId: from,
    callSite: { column: 1, filePath: "example.ts", line: 1 },
    candidateCount: 1,
    resolution: "direct",
  };
}

describe(ComponentsService, () => {
  let service: ComponentsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [ComponentsService],
    }).compile();

    service = await module.resolve(ComponentsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("gives every callable in an acyclic graph its own component", () => {
    const condensed = condense({
      ids: ["a", "b", "c"],
      pairs: [
        ["a", "b"],
        ["b", "c"],
      ],
    });

    expect(condensed.memberIdsByComponent).toHaveLength(3);
  });

  it("collapses mutual recursion into one component", () => {
    const condensed = condense({
      ids: ["a", "b"],
      pairs: [
        ["a", "b"],
        ["b", "a"],
      ],
    });

    expect(condensed.memberIdsByComponent).toHaveLength(1);
    expect(condensed.memberIdsByComponent[0]).toHaveLength(2);
  });

  it("collapses a three-way cycle into one component", () => {
    const condensed = condense({
      ids: ["a", "b", "c"],
      pairs: [
        ["a", "b"],
        ["b", "c"],
        ["c", "a"],
      ],
    });

    expect(condensed.memberIdsByComponent[0]).toHaveLength(3);
  });

  it("emits components so every successor comes first", () => {
    // This ordering is what lets depth be measured in one forward sweep rather
    // than a traversal, so it is asserted rather than assumed.
    const condensed = condense({
      ids: ["a", "b", "c", "d"],
      pairs: [
        ["a", "b"],
        ["b", "c"],
        ["c", "d"],
      ],
    });

    condensed.successorsByComponent.forEach((successors, componentId) => {
      for (const successor of successors) {
        expect(successor).toBeLessThan(componentId);
      }
    });
  });

  it("does not make a component its own successor", () => {
    const condensed = condense({
      ids: ["a", "b"],
      pairs: [
        ["a", "b"],
        ["b", "a"],
      ],
    });

    expect(condensed.successorsByComponent[0]?.has(0)).toBe(false);
  });

  it("visits a callable nothing points at", () => {
    const condensed = condense({ ids: ["a", "b"], pairs: [] });

    expect(condensed.componentIdByCallable.size).toBe(2);
  });

  it("ignores a callee no component claims", () => {
    const graph = new GraphService().assemble({
      edges: [edge("a", "unknown")],
      unresolvedCalls: [],
    });

    const successors = new ComponentsService().buildSuccessors({
      componentIdByCallable: new Map([["a", 0]]),
      graph,
      memberIdsByComponent: [["a"]],
    });

    expect(successors[0]?.size).toBe(0);
  });

  it("keeps a cycle separate from what hangs below it", () => {
    const condensed = condense({
      ids: ["a", "b", "c"],
      pairs: [
        ["a", "b"],
        ["b", "a"],
        ["b", "c"],
      ],
    });

    const cycle = condensed.memberIdsByComponent.find(
      (members) => members.length > 1,
    );

    expect(cycle).toHaveLength(2);
    expect(cycle).not.toContain("c");
  });
});
