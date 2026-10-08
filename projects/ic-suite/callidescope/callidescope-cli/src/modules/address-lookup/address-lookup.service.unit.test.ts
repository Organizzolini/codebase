import { ConfigurationService } from "@callidescope/configuration";
import { AddressService } from "@callidescope/graph";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CallidescopeService } from "../callidescope/callidescope.service";

import { AddressLookupService } from "./address-lookup.service";

import type { LocateOutcome } from "../callidescope/callidescope.types";
import type { ResolvedCallidescopeConfiguration } from "@callidescope/configuration";

/** Builds a resolved configuration with the defaults this suite assumes. */
function buildConfiguration(): ResolvedCallidescopeConfiguration {
  return {
    directories: [],
    entryPoints: {
      addresses: [],
      decorators: [],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    },
    exclude: [],
    excludeCallees: [],
    excludeFrom: [],
    limits: {
      maximumDepth: 6,
    },
    write: {
      json: undefined,
      markdown: undefined,
      mermaid: undefined,
    },
  };
}

/** Builds an empty located outcome, for tests that only care about the resolution. */
function buildLocated(): LocateOutcome {
  return {
    callablesById: new Map(),
    graph: {
      calleeIdsByCaller: new Map(),
      callerIdsByCallee: new Map(),
      edges: [],
      unresolvedCallerIds: new Set(),
      unresolvedCalls: [],
    },
    startingProjectRoots: new Map(),
  };
}

describe(AddressLookupService, () => {
  let addressService: ReturnType<typeof createMock<AddressService>>;
  let callidescopeService: ReturnType<typeof createMock<CallidescopeService>>;
  let configurationService: ReturnType<typeof createMock<ConfigurationService>>;
  let service: AddressLookupService;

  beforeAll(async () => {
    addressService = createMock<AddressService>();
    callidescopeService = createMock<CallidescopeService>();
    configurationService = createMock<ConfigurationService>();

    const module = await Test.createTestingModule({
      providers: [
        AddressLookupService,
        { provide: AddressService, useValue: addressService },
        { provide: CallidescopeService, useValue: callidescopeService },
        { provide: ConfigurationService, useValue: configurationService },
      ],
    }).compile();

    service = await module.resolve(AddressLookupService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🔍 Looking up an address

  it("resolves the address against what a lookup located", async () => {
    const configuration = buildConfiguration();
    const located = buildLocated();

    configurationService.prepareLookup.mockResolvedValue({
      authoredLimits: undefined,
      configuration,
      configurationPath: undefined,
      format: "markdown",
      workspaceRoot: "/workspace",
    });
    callidescopeService.locate.mockResolvedValue(located);
    addressService.resolve.mockReturnValue({ id: "a#0", kind: "resolved" });

    const workspace = await service.locate({});

    expect(workspace).toStrictEqual({
      configuration,
      format: "markdown",
      located,
      workspaceRoot: "/workspace",
    });
    expect(
      service.resolve({ address: "a.ts#Foo.bar", workspace }),
    ).toStrictEqual({ id: "a#0", kind: "resolved" });
    expect(addressService.resolve).toHaveBeenCalledWith({
      address: "a.ts#Foo.bar",
      callablesById: located.callablesById,
      workspaceRoot: "/workspace",
    });
  });

  // One trace serves both the list a prompt completes against and the lookup
  // that follows it, so offering a choice never costs a second trace.
  it("lists every traced callable as an address, from one trace", async () => {
    const located = buildLocated();

    configurationService.prepareLookup.mockResolvedValue({
      authoredLimits: undefined,
      configuration: buildConfiguration(),
      configurationPath: undefined,
      format: "markdown",
      workspaceRoot: "/workspace",
    });
    callidescopeService.locate.mockResolvedValue(located);
    addressService.listAddresses.mockReturnValue(["a.ts#Foo.bar"]);

    const workspace = await service.locate({});

    expect(service.listAddresses(workspace)).toStrictEqual(["a.ts#Foo.bar"]);
    expect(addressService.listAddresses).toHaveBeenCalledExactlyOnceWith(
      located.callablesById,
    );
    expect(callidescopeService.locate).toHaveBeenCalledTimes(1);
  });

  // The scope is read off the resolved configuration rather than off the
  // options, because the flag and the configured list were already merged by
  // the one resolver that does that. Choosing between them a second time here
  // is how the two came to disagree.
  it("scopes the trace to the directories the resolved configuration names", async () => {
    configurationService.prepareLookup.mockResolvedValue({
      authoredLimits: undefined,
      configuration: { ...buildConfiguration(), directories: ["alpha"] },
      configurationPath: undefined,
      format: "markdown",
      workspaceRoot: "/workspace",
    });
    callidescopeService.locate.mockResolvedValue(buildLocated());
    addressService.resolve.mockReturnValue({ kind: "not-found" });

    await service.locate({ directories: ["ignored-because-already-merged"] });

    expect(
      callidescopeService.locate.mock.calls[0]?.[0].directories,
    ).toStrictEqual(["alpha"]);
  });

  // 🗣️ Describing a problem

  it("says nothing is wrong with a resolved address", () => {
    expect(
      service.describeProblem({
        address: "a.ts#Foo.bar",
        resolution: { id: "a#0", kind: "resolved" },
      }),
    ).toBeUndefined();
  });

  it("states an invalid address's own reason", () => {
    expect(
      service.describeProblem({
        address: "a.ts",
        resolution: { kind: "invalid", reason: "needs a '#'" },
      }),
    ).toBe("needs a '#'");
  });

  it("names the address when nothing matches it", () => {
    expect(
      service.describeProblem({
        address: "a.ts#Foo.bar",
        resolution: { kind: "not-found" },
      }),
    ).toContain("a.ts#Foo.bar");
  });

  // The candidates are rendered by `AddressService`, so a reader is handed
  // the same addresses to paste back here as in the workspace run's own refusal.
  // What is asserted here is that this hands them on; what they say is
  // asserted where they are written.
  it("lists every candidate an ambiguous address matched", () => {
    const candidates = [
      { id: "a#0", location: { column: 1, filePath: "a.ts", line: 3 } },
      { id: "a#1", location: { column: 1, filePath: "a.ts", line: 8 } },
    ];

    addressService.describeCandidates.mockReturnValue(
      `Candidates: a.ts#Foo.bar:3, a.ts#Foo.bar:8. Add ":<line>" to the address to pick one.`,
    );

    const problem = service.describeProblem({
      address: "a.ts#Foo.bar",
      resolution: { candidates, kind: "ambiguous" },
    });

    expect(problem).toBe(
      `"a.ts#Foo.bar" matches more than one declaration. Candidates: a.ts#Foo.bar:3, a.ts#Foo.bar:8. Add ":<line>" to the address to pick one.`,
    );
    expect(addressService.describeCandidates).toHaveBeenCalledExactlyOnceWith({
      address: "a.ts#Foo.bar",
      candidates,
    });
  });
});
