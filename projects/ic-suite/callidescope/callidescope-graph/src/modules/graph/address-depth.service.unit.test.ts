import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildDiscoveredCallable,
  buildSourceLocation,
} from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";
import { DocumentationService } from "../documentation/documentation.service";
import { SignaturesService } from "../signatures/signatures.service";

import { AddressDepthService } from "./address-depth.service";
import { GraphService } from "./graph.service";
import { PathsService } from "./paths.service";

import type { DiscoveredCallable } from "../callables/callables.types";
import type { CallableId, CallEdge, UnresolvedCall } from "@callidescope/core";

/** Builds the callable lookup a traversal reads names from. */
function buildCallables(ids: string[]): Map<CallableId, DiscoveredCallable> {
  return new Map(
    ids.map((id) => [
      id,
      buildDiscoveredCallable({
        displayName: id,
        id,
        location: buildSourceLocation({ filePath: `${id}.ts` }),
      }),
    ]),
  );
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

/** Names the frames of every stack, for a compact assertion. */
function namesOf(
  stacks: readonly { frames: readonly { displayName: string }[] }[],
): string[][] {
  return stacks.map((stack) => stack.frames.map((frame) => frame.displayName));
}

describe(AddressDepthService, () => {
  let service: AddressDepthService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [AddressDepthService, PathsService],
    }).compile();

    service = await module.resolve(AddressDepthService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("walks a chain down to its leaf", () => {
    const ids = ["a", "b", "c"];
    const graph = new GraphService().assemble({
      edges: [edge("a", "b"), edge("b", "c")],
      unresolvedCalls: [],
    });

    const result = service.buildDownwardStacks({
      callablesById: buildCallables(ids),
      graph,
      startId: "a",
    });

    expect(namesOf(result.stacks)).toStrictEqual([["a", "b", "c"]]);
    expect(result.truncated).toBe(false);
  });

  it("branches into one stack per distinct callee", () => {
    const ids = ["a", "b", "c"];
    const graph = new GraphService().assemble({
      edges: [edge("a", "b"), edge("a", "c")],
      unresolvedCalls: [],
    });

    const result = service.buildDownwardStacks({
      callablesById: buildCallables(ids),
      graph,
      startId: "a",
    });

    expect(namesOf(result.stacks)).toStrictEqual([
      ["a", "b"],
      ["a", "c"],
    ]);
  });

  it("closes a cycle rather than looping forever", () => {
    const ids = ["a", "b"];
    const graph = new GraphService().assemble({
      edges: [edge("a", "b"), edge("b", "a")],
      unresolvedCalls: [],
    });

    const result = service.buildDownwardStacks({
      callablesById: buildCallables(ids),
      graph,
      startId: "a",
    });

    expect(namesOf(result.stacks)).toStrictEqual([["a", "b", "a"]]);
    expect(result.stacks[0]?.frames.at(-1)?.isCycle).toBe(true);
  });

  it("stops a path at a callee the collection never described", () => {
    const graph = new GraphService().assemble({
      edges: [edge("a", "unknown")],
      unresolvedCalls: [],
    });

    const result = service.buildDownwardStacks({
      callablesById: buildCallables(["a"]),
      graph,
      startId: "a",
    });

    expect(namesOf(result.stacks)).toStrictEqual([["a"]]);
  });

  it("marks a path holding an unresolved call as a lower bound", () => {
    const unresolvedCalls: UnresolvedCall[] = [
      {
        calleeText: "callback()",
        callerId: "b",
        callSite: { column: 1, filePath: "example.ts", line: 1 },
        reason: "dynamic-value",
      },
    ];
    const graph = new GraphService().assemble({
      edges: [edge("a", "b")],
      unresolvedCalls,
    });

    const result = service.buildDownwardStacks({
      callablesById: buildCallables(["a", "b"]),
      graph,
      startId: "a",
    });

    expect(result.stacks[0]?.isLowerBound).toBe(true);
  });

  it("skips a frame for an id the collection never described", () => {
    const graph = new GraphService().assemble({
      edges: [],
      unresolvedCalls: [],
    });

    const result = service.buildDownwardStacks({
      callablesById: buildCallables(["a"]),
      graph,
      startId: "unknown",
    });

    expect(result.stacks).toStrictEqual([{ frames: [], isLowerBound: false }]);
  });

  it("returns one entry-point-only stack for a leaf", () => {
    const graph = new GraphService().assemble({
      edges: [],
      unresolvedCalls: [],
    });

    const result = service.buildDownwardStacks({
      callablesById: buildCallables(["a"]),
      graph,
      startId: "a",
    });

    expect(namesOf(result.stacks)).toStrictEqual([["a"]]);
  });

  it("caps enumeration and reports the walk as truncated", () => {
    const ids = [
      "a",
      ...Array.from({ length: 250 }, (_, index) => `leaf${index}`),
    ];
    const graph = new GraphService().assemble({
      edges: ids.filter((id) => id !== "a").map((leafId) => edge("a", leafId)),
      unresolvedCalls: [],
    });

    const result = service.buildDownwardStacks({
      callablesById: buildCallables(ids),
      graph,
      startId: "a",
    });

    expect(result.truncated).toBe(true);
    expect(result.stacks.length).toBeLessThan(250);
  });

  it("walks every caller up to a root", () => {
    const ids = ["a", "b", "c"];
    const graph = new GraphService().assemble({
      edges: [edge("a", "b"), edge("b", "c")],
      unresolvedCalls: [],
    });

    const result = service.buildUpwardStacks({
      callablesById: buildCallables(ids),
      graph,
      startId: "c",
    });

    expect(namesOf(result.stacks)).toStrictEqual([["a", "b", "c"]]);
  });

  it("branches into one stack per distinct caller", () => {
    const ids = ["a", "b", "c"];
    const graph = new GraphService().assemble({
      edges: [edge("a", "c"), edge("b", "c")],
      unresolvedCalls: [],
    });

    const result = service.buildUpwardStacks({
      callablesById: buildCallables(ids),
      graph,
      startId: "c",
    });

    expect(namesOf(result.stacks)).toStrictEqual([
      ["a", "c"],
      ["b", "c"],
    ]);
  });

  it("returns one entry-point-only stack for a callable with no callers", () => {
    const graph = new GraphService().assemble({
      edges: [],
      unresolvedCalls: [],
    });

    const result = service.buildUpwardStacks({
      callablesById: buildCallables(["a"]),
      graph,
      startId: "a",
    });

    expect(namesOf(result.stacks)).toStrictEqual([["a"]]);
  });

  it("uses the frame documentation and signature paths service reads", () => {
    const graph = new GraphService().assemble({
      edges: [],
      unresolvedCalls: [],
    });
    const subject = new AddressDepthService(
      new PathsService(new DocumentationService(), new SignaturesService()),
    );

    const result = subject.buildDownwardStacks({
      callablesById: buildCallables(["a"]),
      graph,
      startId: "a",
    });

    expect(result.stacks[0]?.frames[0]).toMatchObject({
      displayName: "a",
      isCycle: false,
    });
  });
});
