import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";

import { GraphService } from "./graph.service";

import type { CallEdge } from "@callidescope/core";

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

describe(GraphService, () => {
  let service: GraphService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [GraphService],
    }).compile();

    service = await module.resolve(GraphService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  const subject = new GraphService();

  it("indexes callees by their caller", () => {
    const graph = subject.assemble({
      edges: [edge("a", "b"), edge("a", "c")],
      unresolvedCalls: [],
    });

    expect(graph.calleeIdsByCaller.get("a")).toStrictEqual(["b", "c"]);
  });

  it("indexes callers by their callee", () => {
    const graph = subject.assemble({
      edges: [edge("a", "c"), edge("b", "c")],
      unresolvedCalls: [],
    });

    expect(graph.callerIdsByCallee.get("c")).toStrictEqual(["a", "b"]);
  });

  it("records a repeated call between two callables only once", () => {
    const graph = subject.assemble({
      edges: [edge("a", "b"), edge("a", "b")],
      unresolvedCalls: [],
    });

    expect(graph.calleeIdsByCaller.get("a")).toStrictEqual(["b"]);
  });

  it("drops a self-edge rather than making a one-member cycle", () => {
    const graph = subject.assemble({
      edges: [edge("a", "a")],
      unresolvedCalls: [],
    });

    expect(graph.calleeIdsByCaller.get("a")).toBeUndefined();
  });

  it("keeps every edge in the flat list, self-edges included", () => {
    const graph = subject.assemble({
      edges: [edge("a", "a"), edge("a", "b")],
      unresolvedCalls: [],
    });

    expect(graph.edges).toHaveLength(2);
  });

  it("collects the callers holding a call it could not follow", () => {
    const graph = subject.assemble({
      edges: [],
      unresolvedCalls: [
        {
          calleeText: "callback()",
          callerId: "a",
          callSite: { column: 1, filePath: "example.ts", line: 2 },
          reason: "dynamic-value",
        },
      ],
    });

    expect(graph.unresolvedCallerIds.has("a")).toBe(true);
  });
});
