import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildDiscoveredCallable } from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";

import { BreadthService } from "./breadth.service";
import { GraphService } from "./graph.service";

import type { BreadthMeasurement, CallableBreadth } from "./graph.types";
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
function measure(args: { ids: string[]; pairs: [string, string][] }): {
  breadthOf: (callableId: CallableId) => number;
  calleesOf: (callableId: CallableId) => readonly CallableId[];
  measurement: BreadthMeasurement;
} {
  const graph = new GraphService().assemble({
    edges: args.pairs.map(([from, to]) => edge(from, to)),
    unresolvedCalls: [],
  });
  const measurement = new BreadthService().measure({
    callableIds: args.ids,
    graph,
  });

  const read = (callableId: CallableId): CallableBreadth =>
    measurement.byCallable.get(callableId) ?? { breadth: 0, calleeIds: [] };

  return {
    breadthOf: (callableId) => read(callableId).breadth,
    calleesOf: (callableId) => read(callableId).calleeIds,
    measurement,
  };
}

describe(BreadthService, () => {
  let service: BreadthService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [BreadthService],
    }).compile();

    service = await module.resolve(BreadthService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts a leaf as zero", () => {
    const { breadthOf } = measure({ ids: ["a"], pairs: [] });

    expect(breadthOf("a")).toBe(0);
  });

  it("counts each distinct direct callee", () => {
    const { breadthOf } = measure({
      ids: ["a", "b", "c"],
      pairs: [
        ["a", "b"],
        ["a", "c"],
      ],
    });

    expect(breadthOf("a")).toBe(2);
  });

  it("does not count a transitive callee", () => {
    const { breadthOf } = measure({
      ids: ["a", "b", "c"],
      pairs: [
        ["a", "b"],
        ["b", "c"],
      ],
    });

    expect(breadthOf("a")).toBe(1);
  });

  it("counts repeated calls to the same callee once", () => {
    const { breadthOf } = measure({
      ids: ["a", "b"],
      pairs: [
        ["a", "b"],
        ["a", "b"],
      ],
    });

    expect(breadthOf("a")).toBe(1);
  });

  it("excludes a callable's call to itself", () => {
    const { breadthOf } = measure({
      ids: ["a"],
      pairs: [["a", "a"]],
    });

    expect(breadthOf("a")).toBe(0);
  });

  it("lists the distinct callees pushing a callable's breadth up", () => {
    const { calleesOf } = measure({
      ids: ["a", "b", "c"],
      pairs: [
        ["a", "b"],
        ["a", "c"],
      ],
    });

    expect(calleesOf("a")).toStrictEqual(["b", "c"]);
  });

  it("measures nothing for an empty graph", () => {
    const { measurement } = measure({ ids: [], pairs: [] });

    expect(measurement.byCallable.size).toBe(0);
  });

  // 🔁 Direct calls

  it("names the direct callees and direct callers of one callable", () => {
    const graph = new GraphService().assemble({
      edges: [edge("a", "b"), edge("c", "b")],
      unresolvedCalls: [],
    });
    const callablesById = new Map(
      ["a", "b", "c"].map((id) => [
        id,
        buildDiscoveredCallable({ displayName: id, id }),
      ]),
    );

    const directCalls = new BreadthService().describeDirectCalls({
      callablesById,
      graph,
      id: "b",
    });

    expect(directCalls.callees).toStrictEqual([]);
    expect(
      directCalls.callers.map((reference) => reference.displayName),
    ).toStrictEqual(["a", "c"]);
  });

  it("drops a direct call to a callable the collection never described", () => {
    const graph = new GraphService().assemble({
      edges: [edge("a", "unknown")],
      unresolvedCalls: [],
    });
    const callablesById = new Map([
      ["a", buildDiscoveredCallable({ displayName: "a", id: "a" })],
    ]);

    const directCalls = new BreadthService().describeDirectCalls({
      callablesById,
      graph,
      id: "a",
    });

    expect(directCalls.callees).toStrictEqual([]);
  });

  it("returns nothing for a callable with no direct calls either way", () => {
    const graph = new GraphService().assemble({
      edges: [],
      unresolvedCalls: [],
    });
    const callablesById = new Map([
      ["a", buildDiscoveredCallable({ displayName: "a", id: "a" })],
    ]);

    const directCalls = new BreadthService().describeDirectCalls({
      callablesById,
      graph,
      id: "a",
    });

    expect(directCalls).toStrictEqual({ callees: [], callers: [] });
  });
});
