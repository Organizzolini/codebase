import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildDiscoveredCallable,
  buildSourceLocation,
} from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";

import { AddressService } from "./address.service";

import type { DiscoveredCallable } from "./callables.types";

const WORKSPACE_ROOT = "/workspace";

/** Builds a `callablesById` map from a list of discovered callables. */
function toMap(
  callables: readonly DiscoveredCallable[],
): ReadonlyMap<string, DiscoveredCallable> {
  return new Map(callables.map((callable) => [callable.node.id, callable]));
}

describe(AddressService, () => {
  let service: AddressService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [AddressService],
    }).compile();

    service = await module.resolve(AddressService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 📇 Listing every address

  it("writes every traced callable as an address, in sorted order", () => {
    const first = buildDiscoveredCallable({
      displayName: "ZedService.run",
      id: "z.ts#0",
      location: buildSourceLocation({ filePath: "src/z.service.ts" }),
    });
    const second = buildDiscoveredCallable({
      displayName: "AlphaService.run",
      id: "a.ts#0",
      location: buildSourceLocation({ filePath: "src/a.service.ts" }),
    });

    expect(service.listAddresses(toMap([first, second]))).toStrictEqual([
      "src/a.service.ts#AlphaService.run",
      "src/z.service.ts#ZedService.run",
    ]);
  });

  // Nothing this returns may come back ambiguous, or the list would not be
  // safe to pick from without reading the file first.
  it("disambiguates a name declared twice in one file by its line", () => {
    const first = buildDiscoveredCallable({
      displayName: "FooService.bar",
      id: "foo.ts#0",
      location: buildSourceLocation({ filePath: "src/foo.ts", line: 12 }),
    });
    const second = buildDiscoveredCallable({
      displayName: "FooService.bar",
      id: "foo.ts#1",
      location: buildSourceLocation({ filePath: "src/foo.ts", line: 40 }),
    });

    const addresses = service.listAddresses(toMap([first, second]));

    expect(addresses).toStrictEqual([
      "src/foo.ts#FooService.bar:12",
      "src/foo.ts#FooService.bar:40",
    ]);

    // And each one resolves back to exactly the callable it names.
    for (const address of addresses) {
      expect(
        service.resolve({
          address,
          callablesById: toMap([first, second]),
          workspaceRoot: WORKSPACE_ROOT,
        }).kind,
      ).toBe("resolved");
    }
  });

  it("lists nothing for a workspace with no callables", () => {
    expect(service.listAddresses(toMap([]))).toStrictEqual([]);
  });

  it("resolves an address matching exactly one callable", () => {
    const callable = buildDiscoveredCallable({
      displayName: "FooService.bar",
      id: "packages/example/src/foo.service.ts#0",
      location: buildSourceLocation({
        filePath: "packages/example/src/foo.service.ts",
      }),
    });

    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts#FooService.bar",
      callablesById: toMap([callable]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution).toStrictEqual({
      id: "packages/example/src/foo.service.ts#0",
      kind: "resolved",
    });
  });

  it("resolves a file path given relative to the workspace root", () => {
    const callable = buildDiscoveredCallable({
      displayName: "FooService.bar",
      location: buildSourceLocation({
        filePath: "packages/example/src/foo.service.ts",
      }),
    });

    const resolution = service.resolve({
      address: `${WORKSPACE_ROOT}/packages/example/src/foo.service.ts#FooService.bar`,
      callablesById: toMap([callable]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("resolved");
  });

  it("reports an address with no '#' as invalid", () => {
    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts",
      callablesById: toMap([]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("invalid");
  });

  it("reports an address missing a file path as invalid", () => {
    const resolution = service.resolve({
      address: "#FooService.bar",
      callablesById: toMap([]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("invalid");
  });

  it("reports an address missing a symbol path as invalid", () => {
    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts#",
      callablesById: toMap([]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("invalid");
  });

  it("reports an address matching nothing as not found", () => {
    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts#FooService.bar",
      callablesById: toMap([]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("not-found");
  });

  it("names every candidate when an address matches more than one declaration", () => {
    const location = buildSourceLocation({
      filePath: "packages/example/src/foo.service.ts",
    });
    const first = buildDiscoveredCallable({
      displayName: "FooService.bar",
      id: "packages/example/src/foo.service.ts#0",
      location: { ...location, line: 3 },
    });
    const second = buildDiscoveredCallable({
      displayName: "FooService.bar",
      id: "packages/example/src/foo.service.ts#1",
      location: { ...location, line: 8 },
    });

    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts#FooService.bar",
      callablesById: toMap([first, second]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("ambiguous");
    expect(
      resolution.kind === "ambiguous" && resolution.candidates,
    ).toHaveLength(2);
  });

  it("treats a non-numeric ':' suffix as part of the qualified name", () => {
    const callable = buildDiscoveredCallable({
      displayName: "FooService.bar:baz",
      location: buildSourceLocation({
        filePath: "packages/example/src/foo.service.ts",
      }),
    });

    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts#FooService.bar:baz",
      callablesById: toMap([callable]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("resolved");
  });

  it("disambiguates with a ':<line>' suffix", () => {
    const location = buildSourceLocation({
      filePath: "packages/example/src/foo.service.ts",
    });
    const first = buildDiscoveredCallable({
      displayName: "FooService.bar",
      id: "packages/example/src/foo.service.ts#0",
      location: { ...location, line: 3 },
    });
    const second = buildDiscoveredCallable({
      displayName: "FooService.bar",
      id: "packages/example/src/foo.service.ts#1",
      location: { ...location, line: 8 },
    });

    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts#FooService.bar:8",
      callablesById: toMap([first, second]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution).toStrictEqual({
      id: "packages/example/src/foo.service.ts#1",
      kind: "resolved",
    });
  });

  // 🗣️ Describing what an ambiguous address could have meant

  it("writes each candidate as the address that would have picked it", () => {
    expect(
      service.describeCandidates({
        address: "packages/example/src/foo.service.ts#FooService.bar",
        candidates: [
          {
            id: "packages/example/src/foo.service.ts#0",
            location: {
              column: 3,
              filePath: "packages/example/src/foo.service.ts",
              line: 3,
            },
          },
          {
            id: "packages/example/src/foo.service.ts#1",
            location: {
              column: 3,
              filePath: "packages/example/src/foo.service.ts",
              line: 8,
            },
          },
        ],
      }),
    ).toBe(
      'Candidates: packages/example/src/foo.service.ts#FooService.bar:3, packages/example/src/foo.service.ts#FooService.bar:8. Add ":<line>" to the address to pick one.',
    );
  });

  // A declared address may already carry a disambiguator that did not narrow
  // far enough, and doubling it up would print an address nothing resolves.
  it("replaces a ':<line>' already on the declared address", () => {
    expect(
      service.describeCandidates({
        address: "packages/example/src/foo.service.ts#FooService.bar:3",
        candidates: [
          {
            id: "packages/example/src/foo.service.ts#0",
            location: {
              column: 3,
              filePath: "packages/example/src/foo.service.ts",
              line: 3,
            },
          },
          {
            id: "packages/example/src/foo.service.ts#1",
            location: {
              column: 3,
              filePath: "packages/example/src/foo.service.ts",
              line: 8,
            },
          },
        ],
      }),
    ).toContain(
      "packages/example/src/foo.service.ts#FooService.bar:3, packages/example/src/foo.service.ts#FooService.bar:8.",
    );
  });

  // Two declarations on one line is the case no address can separate: the
  // matcher filters on the line, so both candidates carry the same one.
  it("names the column, and says no line can separate them, when candidates share a line", () => {
    expect(
      service.describeCandidates({
        address: "packages/example/src/foo.service.ts#FooService.bar:3",
        candidates: [
          {
            id: "packages/example/src/foo.service.ts#0",
            location: {
              column: 3,
              filePath: "packages/example/src/foo.service.ts",
              line: 3,
            },
          },
          {
            id: "packages/example/src/foo.service.ts#1",
            location: {
              column: 41,
              filePath: "packages/example/src/foo.service.ts",
              line: 3,
            },
          },
        ],
      }),
    ).toBe(
      'Candidates: packages/example/src/foo.service.ts#FooService.bar:3 (column 3), packages/example/src/foo.service.ts#FooService.bar:3 (column 41). Two declarations on one line cannot be told apart by ":<line>" — rename one, or name a different callable.',
    );
  });
});
