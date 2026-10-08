import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";

import { ComponentsService } from "./components.service";
import { GraphDepthService } from "./graph-depth.service";
import { GraphService } from "./graph.service";

import type { DepthMeasurement } from "./graph.types";
import type { CallableId, CallEdge } from "@callidescope/core";

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

/** Measures a graph described as `from -> to` pairs. */
function measure(args: {
  ids: string[];
  pairs: [string, string][];
  unresolvedCallerId?: string;
}): {
  depthOf: (callableId: CallableId) => number;
  measurement: DepthMeasurement;
  unresolvedAt: (callableId: CallableId) => boolean;
} {
  const graph = new GraphService().assemble({
    edges: args.pairs.map(([from, to]) => edge(from, to)),
    unresolvedCalls:
      args.unresolvedCallerId === undefined
        ? []
        : [
            {
              calleeText: "callback()",
              callerId: args.unresolvedCallerId,
              callSite: { column: 1, filePath: "example.ts", line: 1 },
              reason: "dynamic-value",
            },
          ],
  });
  const condensed = new ComponentsService().condense({
    callableIds: args.ids,
    graph,
  });
  const measurement = new GraphDepthService().measure({ condensed, graph });

  const read = (
    callableId: CallableId,
  ): (typeof measurement.byComponent)[0] => {
    const componentId = condensed.componentIdByCallable.get(callableId) ?? 0;

    return (
      measurement.byComponent[componentId] ?? {
        deepestSuccessor: undefined,
        depth: 0,
        reachesUnresolved: false,
      }
    );
  };

  return {
    depthOf: (callableId) => read(callableId).depth,
    measurement,
    unresolvedAt: (callableId) => read(callableId).reachesUnresolved,
  };
}

describe(GraphDepthService, () => {
  let service: GraphDepthService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [GraphDepthService],
    }).compile();

    service = await module.resolve(GraphDepthService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts a leaf as one frame", () => {
    const { depthOf } = measure({ ids: ["a"], pairs: [] });

    expect(depthOf("a")).toBe(1);
  });

  it("counts a chain as one frame per hop", () => {
    const { depthOf } = measure({
      ids: ["a", "b", "c"],
      pairs: [
        ["a", "b"],
        ["b", "c"],
      ],
    });

    expect(depthOf("a")).toBe(3);
  });

  it("takes the deepest branch rather than the sum of branches", () => {
    const { depthOf } = measure({
      ids: ["a", "b", "c", "d"],
      pairs: [
        ["a", "b"],
        ["a", "c"],
        ["c", "d"],
      ],
    });

    expect(depthOf("a")).toBe(3);
  });

  it("counts a cycle's members once", () => {
    // Two functions calling each other push two frames before the stack
    // repeats; nothing finite describes what happens after that, so two is the
    // honest floor.
    const { depthOf } = measure({
      ids: ["a", "b"],
      pairs: [
        ["a", "b"],
        ["b", "a"],
      ],
    });

    expect(depthOf("a")).toBe(2);
  });

  it("measures the same depth for every member of a cycle", () => {
    const { depthOf } = measure({
      ids: ["a", "b"],
      pairs: [
        ["a", "b"],
        ["b", "a"],
      ],
    });

    expect(depthOf("a")).toBe(depthOf("b"));
  });

  it("adds what hangs below a cycle to the cycle's own cost", () => {
    const { depthOf } = measure({
      ids: ["a", "b", "c"],
      pairs: [
        ["a", "b"],
        ["b", "a"],
        ["b", "c"],
      ],
    });

    expect(depthOf("a")).toBe(3);
  });

  it("propagates an unfollowable call up to everything above it", () => {
    const { unresolvedAt } = measure({
      ids: ["a", "b"],
      pairs: [["a", "b"]],
      unresolvedCallerId: "b",
    });

    expect(unresolvedAt("a")).toBe(true);
  });

  it("leaves a callable clean when nothing below it was unfollowable", () => {
    const { unresolvedAt } = measure({
      ids: ["a", "b"],
      pairs: [["a", "b"]],
    });

    expect(unresolvedAt("a")).toBe(false);
  });

  it("skips a successor the measurement does not hold", () => {
    // Defensive: a condensation naming a component that was never emitted.
    const measurement = new GraphDepthService().measure({
      condensed: {
        componentIdByCallable: new Map([["a", 0]]),
        memberIdsByComponent: [["a"]],
        successorsByComponent: [new Set([99])],
      },
      graph: new GraphService().assemble({ edges: [], unresolvedCalls: [] }),
    });

    expect(measurement.byComponent[0]?.depth).toBe(1);
  });

  it("treats a component with no successor list as a leaf", () => {
    const measurement = new GraphDepthService().measure({
      condensed: {
        componentIdByCallable: new Map([["a", 0]]),
        memberIdsByComponent: [["a"]],
        successorsByComponent: [],
      },
      graph: new GraphService().assemble({ edges: [], unresolvedCalls: [] }),
    });

    expect(measurement.byComponent[0]?.depth).toBe(1);
  });

  it("measures nothing for an empty graph", () => {
    const { measurement } = measure({ ids: [], pairs: [] });

    expect(measurement.byComponent).toStrictEqual([]);
  });
});
