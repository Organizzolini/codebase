import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildDiscoveredCallable,
  buildSourceLocation,
} from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";
import { DocumentationService } from "../documentation/documentation.service";
import { SignaturesService } from "../signatures/signatures.service";

import { ComponentsService } from "./components.service";
import { GraphDepthService } from "./graph-depth.service";
import { GraphService } from "./graph.service";
import { PathsService } from "./paths.service";

import type { DiscoveredCallable } from "../callables/callables.types";
import type { CallableId, CallEdge } from "@callidescope/core";

/** Builds the callable lookup a path reconstruction reads names from. */
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

/** Rebuilds the deepest path below an entry point. */
function buildPath(args: {
  entryPointId: string;
  ids: string[];
  pairs: [string, string][];
}): { displayName: string; isCycle: boolean }[] {
  const graph = new GraphService().assemble({
    edges: args.pairs.map(([from, to]) => edge(from, to)),
    unresolvedCalls: [],
  });
  const condensed = new ComponentsService().condense({
    callableIds: args.ids,
    graph,
  });
  const measurement = new GraphDepthService().measure({
    condensed,
    graph,
  });

  return new PathsService(new DocumentationService(), new SignaturesService())
    .buildDeepestPath({
      callablesById: buildCallables(args.ids),
      condensed,
      entryPointId: args.entryPointId,
      measurement,
    })
    .map((frame) => ({
      displayName: frame.displayName,
      isCycle: frame.isCycle,
    }));
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

describe(PathsService, () => {
  let service: PathsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [PathsService],
    }).compile();

    service = await module.resolve(PathsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns the entry point alone when nothing hangs below it", () => {
    expect(
      buildPath({ entryPointId: "a", ids: ["a"], pairs: [] }),
    ).toStrictEqual([{ displayName: "a", isCycle: false }]);
  });

  it("walks a chain from the entry point to the leaf", () => {
    const frames = buildPath({
      entryPointId: "a",
      ids: ["a", "b", "c"],
      pairs: [
        ["a", "b"],
        ["b", "c"],
      ],
    });

    expect(frames.map((frame) => frame.displayName)).toStrictEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("follows the deeper branch when a callable has several", () => {
    const frames = buildPath({
      entryPointId: "a",
      ids: ["a", "b", "c", "d"],
      pairs: [
        ["a", "b"],
        ["a", "c"],
        ["c", "d"],
      ],
    });

    expect(frames.map((frame) => frame.displayName)).toStrictEqual([
      "a",
      "c",
      "d",
    ]);
  });

  it("marks every frame of a cycle", () => {
    const frames = buildPath({
      entryPointId: "a",
      ids: ["a", "b"],
      pairs: [
        ["a", "b"],
        ["b", "a"],
      ],
    });

    expect(frames.every((frame) => frame.isCycle)).toBe(true);
  });

  it("starts a cycle at the member the path actually entered", () => {
    const frames = buildPath({
      entryPointId: "a",
      ids: ["a", "b"],
      pairs: [
        ["a", "b"],
        ["b", "a"],
      ],
    });

    expect(frames[0]?.displayName).toBe("a");
  });

  it("terminates rather than looping forever on a cycle", () => {
    const frames = buildPath({
      entryPointId: "a",
      ids: ["a", "b", "c"],
      pairs: [
        ["a", "b"],
        ["b", "a"],
        ["b", "c"],
      ],
    });

    expect(frames).toHaveLength(3);
  });

  it("skips a member it has no description for", () => {
    // Defensive: a condensation holding an identifier the collection dropped.
    const frames = new PathsService(
      new DocumentationService(),
      new SignaturesService(),
    ).buildDeepestPath({
      callablesById: buildCallables(["known"]),
      condensed: {
        componentIdByCallable: new Map([["known", 0]]),
        memberIdsByComponent: [["known", "unknown"]],
        successorsByComponent: [new Set()],
      },
      entryPointId: "known",
      measurement: {
        byComponent: [
          {
            deepestSuccessor: undefined,
            depth: 2,
            reachesUnresolved: false,
          },
        ],
      },
    });

    expect(frames.map((frame) => frame.displayName)).toStrictEqual(["known"]);
  });

  it("leaves a cycle in place when it was entered at its first member", () => {
    const frames = new PathsService(
      new DocumentationService(),
      new SignaturesService(),
    ).buildDeepestPath({
      callablesById: buildCallables(["first", "second"]),
      condensed: {
        componentIdByCallable: new Map([
          ["first", 0],
          ["second", 0],
        ]),
        memberIdsByComponent: [["first", "second"]],
        successorsByComponent: [new Set()],
      },
      entryPointId: "first",
      measurement: {
        byComponent: [
          {
            deepestSuccessor: undefined,
            depth: 2,
            reachesUnresolved: false,
          },
        ],
      },
    });

    expect(frames.map((frame) => frame.displayName)).toStrictEqual([
      "first",
      "second",
    ]);
  });

  it("stops at a component the condensation does not describe", () => {
    const frames = new PathsService(
      new DocumentationService(),
      new SignaturesService(),
    ).buildDeepestPath({
      callablesById: buildCallables(["a"]),
      condensed: {
        componentIdByCallable: new Map([["a", 7]]),
        memberIdsByComponent: [],
        successorsByComponent: [],
      },
      entryPointId: "a",
      measurement: { byComponent: [] },
    });

    expect(frames).toStrictEqual([]);
  });

  it("leaves a cycle in place when the entered member is not one of them", () => {
    const frames = new PathsService(
      new DocumentationService(),
      new SignaturesService(),
    ).buildDeepestPath({
      callablesById: buildCallables(["first", "second"]),
      condensed: {
        componentIdByCallable: new Map([["outside", 0]]),
        memberIdsByComponent: [["first", "second"]],
        successorsByComponent: [new Set()],
      },
      entryPointId: "outside",
      measurement: {
        byComponent: [
          {
            deepestSuccessor: undefined,
            depth: 2,
            reachesUnresolved: false,
          },
        ],
      },
    });

    expect(frames.map((frame) => frame.displayName)).toStrictEqual([
      "first",
      "second",
    ]);
  });

  it("rotates a cycle to start where the path entered it", () => {
    // Within a cycle there is no single true order, but starting at the member
    // execution actually reached is what makes the printed stack match how it
    // got there.
    const frames = new PathsService(
      new DocumentationService(),
      new SignaturesService(),
    ).buildDeepestPath({
      callablesById: buildCallables(["first", "second", "third"]),
      condensed: {
        componentIdByCallable: new Map([
          ["first", 0],
          ["second", 0],
          ["third", 0],
        ]),
        memberIdsByComponent: [["first", "second", "third"]],
        successorsByComponent: [new Set()],
      },
      entryPointId: "third",
      measurement: {
        byComponent: [
          {
            deepestSuccessor: undefined,
            depth: 3,
            reachesUnresolved: false,
          },
        ],
      },
    });

    expect(frames.map((frame) => frame.displayName)).toStrictEqual([
      "third",
      "first",
      "second",
    ]);
  });

  it("returns nothing for a callable the graph never saw", () => {
    expect(
      buildPath({ entryPointId: "missing", ids: ["a"], pairs: [] }),
    ).toStrictEqual([]);
  });
});
