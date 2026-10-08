import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoundaryCyclesService } from "./boundary-cycles.service";

import type { BoundaryEdge } from "./boundaries.types";

/** Builds edges from `"a>b"` shorthand, so a fixture reads as a graph. */
function buildEdges(shorthand: string[]): BoundaryEdge[] {
  return shorthand.map((entry) => {
    const [source = "", target = ""] = entry.split(">");

    return { source, target };
  });
}

describe(BoundaryCyclesService, () => {
  let service: BoundaryCyclesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [BoundaryCyclesService],
    }).compile();

    service = await module.resolve(BoundaryCyclesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("finds nothing in a graph with no edges", () => {
    expect(
      service.findCycles({ edges: [], nodeIds: new Set(["a", "b"]) }),
    ).toStrictEqual([]);
  });

  it("finds nothing in an acyclic graph", () => {
    expect(
      service.findCycles({
        edges: buildEdges(["a>b", "b>c", "a>c"]),
        nodeIds: new Set(["a", "b", "c"]),
      }),
    ).toStrictEqual([]);
  });

  it("finds a two-node cycle and names its closing edge", () => {
    expect(
      service.findCycles({
        edges: buildEdges(["a>b", "b>a"]),
        nodeIds: new Set(["a", "b"]),
      }),
    ).toStrictEqual([{ path: ["a", "b", "a"], source: "b", target: "a" }]);
  });

  it("finds a node depending on itself", () => {
    expect(
      service.findCycles({
        edges: buildEdges(["a>a"]),
        nodeIds: new Set(["a"]),
      }),
    ).toStrictEqual([{ path: ["a", "a"], source: "a", target: "a" }]);
  });

  it("reports one tangle once rather than once per node in it", () => {
    const cycles = service.findCycles({
      edges: buildEdges(["a>b", "b>c", "c>a"]),
      nodeIds: new Set(["a", "b", "c"]),
    });

    expect(cycles).toHaveLength(1);
    expect(cycles[0]?.path).toStrictEqual(["a", "b", "c", "a"]);
  });

  it("finds two independent cycles", () => {
    const cycles = service.findCycles({
      edges: buildEdges(["a>b", "b>a", "c>d", "d>c"]),
      nodeIds: new Set(["a", "b", "c", "d"]),
    });

    expect(cycles.map((cycle) => cycle.path)).toStrictEqual([
      ["a", "b", "a"],
      ["c", "d", "c"],
    ]);
  });

  it("reports one finding when the same edge is drawn twice", () => {
    const cycles = service.findCycles({
      edges: buildEdges(["a>b", "b>a", "b>a"]),
      nodeIds: new Set(["a", "b"]),
    });

    expect(cycles).toHaveLength(1);
  });

  it("ignores a cycle running through unselected nodes", () => {
    expect(
      service.findCycles({
        edges: buildEdges(["a>b", "b>a"]),
        nodeIds: new Set(["a"]),
      }),
    ).toStrictEqual([]);
  });

  it("ignores an edge naming a node outside the graph", () => {
    expect(
      service.findCycles({
        edges: buildEdges(["a>elsewhere", "elsewhere>a"]),
        nodeIds: new Set(["a"]),
      }),
    ).toStrictEqual([]);
  });
});
