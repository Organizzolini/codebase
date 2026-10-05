import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildDiscoveredCallable,
  buildSourceLocation,
} from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";
import {
  buildFixtureProgram,
  buildFixtureServices,
  collectFixtureCallables,
  FIXTURE_ROOT,
} from "../../../testing/programs";
import { AddressService } from "../callables/address.service";
import { GraphService } from "../graph/graph.service";

import { EntriesService } from "./entries.service";

import type { DiscoveredCallable } from "../callables/callables.types";
import type { CallGraph } from "../graph/graph.types";
import type { EntryPointCollection } from "./entries.types";
import type { ResolvedCallidescopeEntryPoints } from "@callidescope/configuration";
import type { EntryPointKind } from "@callidescope/core";
import type { LoggerService } from "@codebase/logging";
import type { DeepMocked } from "@golevelup/ts-vitest";

/** An empty call graph, for tests that never reach an edge. */
const EMPTY_GRAPH: CallGraph = {
  calleeIdsByCaller: new Map(),
  callerIdsByCallee: new Map(),
  edges: [],
  unresolvedCallerIds: new Set(),
  unresolvedCalls: [],
};

/** What every entry-point fixture in this suite can vary. */
interface EntriesFixture {
  readonly entryPoints?: Partial<ResolvedCallidescopeEntryPoints> | undefined;
  readonly entryPointsByProject?:
    | ReadonlyMap<string, ResolvedCallidescopeEntryPoints>
    | undefined;
  readonly files: Record<string, string>;
}

/** Entry-point rules with everything a test does not vary already chosen. */
function buildRules(
  overrides: Partial<ResolvedCallidescopeEntryPoints> = {},
): ResolvedCallidescopeEntryPoints {
  return {
    addresses: [],
    decorators: ["Command", "Get", "Option"],
    includeExportedFunctions: true,
    includeOrphans: true,
    includeTests: true,
    ...overrides,
  };
}

/** Resolves the entry points of a handful of already-described callables. */
function resolveDescribedEntries(args: {
  callables: readonly DiscoveredCallable[];
  entryPoints?: Partial<ResolvedCallidescopeEntryPoints> | undefined;
  entryPointsByProject?:
    | ReadonlyMap<string, ResolvedCallidescopeEntryPoints>
    | undefined;
}): EntryPointCollection {
  return new EntriesService(
    new AddressService(),
    createMock<LoggerService>(),
  ).resolve({
    callablesById: new Map(
      args.callables.map((callable) => [callable.node.id, callable]),
    ),
    entryPoints: buildRules({
      includeExportedFunctions: false,
      includeOrphans: false,
      ...args.entryPoints,
    }),
    entryPointsByProject: args.entryPointsByProject ?? new Map(),
    graph: EMPTY_GRAPH,
    workspaceRoot: FIXTURE_ROOT,
  });
}

/** Resolves the entry points of an in-memory workspace. */
function resolveEntries(
  args: EntriesFixture & {
    relabelProject?: ((filePath: string) => string) | undefined;
  },
): { collection: EntryPointCollection; nameById: ReadonlyMap<string, string> } {
  const projectProgram = buildFixtureProgram(args.files);
  const services = buildFixtureServices({ projectProgram });
  const collected = collectFixtureCallables({ projectProgram, services });
  const relabel = args.relabelProject;
  // The service is handed callables already tagged with the project that owns
  // them, so a second project is a second tag rather than a second program.
  const callablesById =
    relabel === undefined
      ? collected.byId
      : new Map(
          [...collected.byId].map(([id, callable]) => [
            id,
            {
              ...callable,
              node: {
                ...callable.node,
                projectName: relabel(callable.node.location.filePath),
              },
            },
          ]),
        );
  const graph = new GraphService().assemble(
    services.edges.build({
      callablesById,
      excludeCallees: [],
      includeConstructorEdges: true,
      workspaceRoot: FIXTURE_ROOT,
    }),
  );

  return {
    collection: new EntriesService(
      new AddressService(),
      createMock<LoggerService>(),
    ).resolve({
      callablesById,
      entryPoints: buildRules(args.entryPoints),
      entryPointsByProject: args.entryPointsByProject ?? new Map(),
      graph,
      workspaceRoot: FIXTURE_ROOT,
    }),
    nameById: new Map(
      [...callablesById].map(([id, callable]) => [
        id,
        callable.node.displayName,
      ]),
    ),
  };
}

/** The roots of an in-memory workspace, as the kind and name of each. */
function resolveEntryPoints(
  args: EntriesFixture & {
    relabelProject?: ((filePath: string) => string) | undefined;
  },
): { kind: EntryPointKind; name: string }[] {
  const { collection, nameById } = resolveEntries(args);

  return collection.entryPoints.map((entryPoint) => ({
    kind: entryPoint.kind,
    name: nameById.get(entryPoint.callableId) ?? "unknown",
  }));
}

describe(EntriesService, () => {
  let service: EntriesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [EntriesService],
    }).compile();

    service = await module.resolve(EntriesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("logs how many entry points it resolved, orphans included", () => {
    const logger = createMock<LoggerService>();
    const projectProgram = buildFixtureProgram({
      "packages/example/src/index.ts": "export function publicApi(): void {}",
    });
    const services = buildFixtureServices({ projectProgram });
    const collection = collectFixtureCallables({ projectProgram, services });
    const graph = new GraphService().assemble(
      services.edges.build({
        callablesById: collection.byId,
        excludeCallees: [],
        includeConstructorEdges: true,
        workspaceRoot: FIXTURE_ROOT,
      }),
    );

    new EntriesService(new AddressService(), logger).resolve({
      callablesById: collection.byId,
      entryPoints: buildRules({ decorators: [] }),
      entryPointsByProject: new Map(),
      graph,
      workspaceRoot: FIXTURE_ROOT,
    });

    expect(logger.info).toHaveBeenCalledWith(
      "🔭 Resolved entry points",
      undefined,
      { total: 1 },
    );
  });

  it("logs how many entry points it resolved, orphans excluded", () => {
    const logger: DeepMocked<LoggerService> = createMock<LoggerService>();

    new EntriesService(new AddressService(), logger).resolve({
      callablesById: new Map(),
      entryPoints: buildRules({
        decorators: [],
        includeExportedFunctions: false,
        includeOrphans: false,
      }),
      entryPointsByProject: new Map(),
      graph: EMPTY_GRAPH,
      workspaceRoot: FIXTURE_ROOT,
    });

    expect(logger.info).toHaveBeenCalledWith(
      "🔭 Resolved entry points",
      undefined,
      { total: 0 },
    );
  });

  it("roots a method carrying a configured decorator", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          function Get(): MethodDecorator { return () => undefined; }
          export class Resolver {
            @Get()
            public read(): void {}
          }
        `,
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "decorated-method",
      name: "Resolver.read",
    });
  });

  it("roots the run method of a decorated command class", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/modules/a/a.command.ts": `
          function Command(): ClassDecorator { return () => undefined; }
          @Command()
          export class ExampleCommand {
            public run(): void {}
          }
        `,
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "decorated-method",
      name: "ExampleCommand.run",
    });
  });

  it("roots a lifecycle hook nothing in the repository calls", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export class Service {
            public onModuleInit(): void {}
          }
        `,
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "lifecycle",
      name: "Service.onModuleInit",
    });
  });

  it("roots a bootstrap function in a project's main file", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/main.ts": "export function main(): void {}",
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "module-bootstrap",
      name: "main",
    });
  });

  it("roots a function exported from a package barrel", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/index.ts": "export function publicApi(): void {}",
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "exported-function",
      name: "publicApi",
    });
  });

  it("does not root barrel exports when they are turned off", () => {
    const entryPoints = resolveEntryPoints({
      entryPoints: {
        includeExportedFunctions: false,
        includeOrphans: false,
      },
      files: {
        "packages/example/src/index.ts": "export function publicApi(): void {}",
      },
    });

    expect(entryPoints).toStrictEqual([]);
  });

  it("promotes a callable nothing calls to an orphan root", () => {
    // The safety net: a rule this list is missing shows up here rather than
    // silently removing a whole subtree from every measurement.
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/modules/a/a.service.ts":
          "export class Service { public unused(): void {} }",
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "orphan-root",
      name: "Service.unused",
    });
  });

  it("does not promote orphans when they are turned off", () => {
    const entryPoints = resolveEntryPoints({
      entryPoints: { includeOrphans: false },
      files: {
        "packages/example/src/modules/a/a.service.ts":
          "export class Service { public unused(): void {} }",
      },
    });

    expect(entryPoints).toStrictEqual([]);
  });

  it("does not promote a callable that already has a caller", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/main.ts": `
          function helper(): void {}
          export function main(): void { helper(); }
        `,
      },
    });

    expect(
      entryPoints.filter((entry) => entry.name === "helper"),
    ).toStrictEqual([]);
  });

  it("roots each callable only once", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/index.ts": "export function publicApi(): void {}",
      },
    });

    expect(
      entryPoints.filter((entry) => entry.name === "publicApi"),
    ).toHaveLength(1);
  });

  it("roots a method decorated without a call", () => {
    const entryPoints = resolveEntryPoints({
      entryPoints: { includeOrphans: false },
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          declare const Get: MethodDecorator;
          export class Resolver {
            @Get
            public read(): void {}
          }
        `,
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "decorated-method",
      name: "Resolver.read",
    });
  });

  it("ignores a decorator that is not written as a plain name", () => {
    const entryPoints = resolveEntryPoints({
      entryPoints: { includeOrphans: false },
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          declare const decorators: { Get: MethodDecorator };
          export class Resolver {
            @decorators.Get
            public read(): void {}
          }
        `,
      },
    });

    expect(entryPoints).toStrictEqual([]);
  });

  it("ignores a decorator that was not configured", () => {
    const entryPoints = resolveEntryPoints({
      entryPoints: { includeOrphans: false },
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          function Memoize(): MethodDecorator { return () => undefined; }
          export class Service {
            @Memoize()
            public read(): void {}
          }
        `,
      },
    });

    expect(entryPoints).toStrictEqual([]);
  });

  // 📮 Roots a configuration declared by address

  it("roots a callable a configuration declared by address", () => {
    const entryPoints = resolveEntryPoints({
      entryPoints: {
        addresses: ["packages/example/src/modules/a/a.service.ts#Service.read"],
        includeOrphans: false,
      },
      files: {
        "packages/example/src/modules/a/a.service.ts":
          "export class Service { public read(): void {} }",
      },
    });

    expect(entryPoints).toStrictEqual([
      { kind: "declared", name: "Service.read" },
    ]);
  });

  it("keeps the rule's kind for an address the rules already rooted", () => {
    // One root, not two: the rules ran first, so the address lands on a
    // callable already claimed and adds nothing.
    const entryPoints = resolveEntryPoints({
      entryPoints: {
        addresses: ["packages/example/src/index.ts#publicApi"],
        includeOrphans: false,
      },
      files: {
        "packages/example/src/index.ts": "export function publicApi(): void {}",
      },
    });

    expect(entryPoints).toStrictEqual([
      { kind: "exported-function", name: "publicApi" },
    ]);
  });

  it("does not promote a declared root as an orphan as well", () => {
    const entryPoints = resolveEntryPoints({
      entryPoints: {
        addresses: ["packages/example/src/modules/a/a.service.ts#Service.read"],
      },
      files: {
        "packages/example/src/modules/a/a.service.ts":
          "export class Service { public read(): void {} }",
      },
    });

    expect(entryPoints).toStrictEqual([
      { kind: "declared", name: "Service.read" },
    ]);
  });

  it("still promotes an orphan a declaration did not name", () => {
    // Declaring one root must not turn the safety net off for the rest.
    const entryPoints = resolveEntryPoints({
      entryPoints: {
        addresses: ["packages/example/src/modules/a/a.service.ts#Service.read"],
      },
      files: {
        "packages/example/src/modules/a/a.service.ts":
          "export class Service { public read(): void {} public other(): void {} }",
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "orphan-root",
      name: "Service.other",
    });
  });

  it("resolves a declared address through its line disambiguator", () => {
    const collection = resolveDescribedEntries({
      callables: [
        buildDiscoveredCallable({
          displayName: "FooService.bar",
          id: "packages/example/src/foo.service.ts#0",
          location: buildSourceLocation({
            filePath: "packages/example/src/foo.service.ts",
            line: 12,
          }),
        }),
        buildDiscoveredCallable({
          displayName: "FooService.bar",
          id: "packages/example/src/foo.service.ts#1",
          location: buildSourceLocation({
            filePath: "packages/example/src/foo.service.ts",
            line: 40,
          }),
        }),
      ],
      entryPoints: {
        addresses: ["packages/example/src/foo.service.ts#FooService.bar:40"],
      },
    });

    expect(collection.entryPoints).toStrictEqual([
      { callableId: "packages/example/src/foo.service.ts#1", kind: "declared" },
    ]);
  });

  it("roots two spellings of one callable as a single root", () => {
    const collection = resolveDescribedEntries({
      callables: [
        buildDiscoveredCallable({
          displayName: "FooService.bar",
          id: "packages/example/src/foo.service.ts#0",
          location: buildSourceLocation({
            filePath: "packages/example/src/foo.service.ts",
            line: 12,
          }),
        }),
      ],
      entryPoints: {
        addresses: [
          "packages/example/src/foo.service.ts#FooService.bar",
          "packages/example/src/foo.service.ts#FooService.bar:12",
        ],
      },
    });

    expect(collection.entryPoints).toStrictEqual([
      { callableId: "packages/example/src/foo.service.ts#0", kind: "declared" },
    ]);
  });

  // 🚨 Reports a declared address that named no single callable

  it("reports a declared address matching no callable at all", () => {
    const collection = resolveDescribedEntries({
      callables: [buildDiscoveredCallable()],
      entryPoints: { addresses: ["packages/example/src/gone.ts#Gone.away"] },
    });

    expect(collection.unresolvedAddresses).toStrictEqual([
      {
        address: "packages/example/src/gone.ts#Gone.away",
        projectName: undefined,
        resolution: { kind: "not-found" },
      },
    ]);
    expect(collection.entryPoints).toStrictEqual([]);
  });

  it("reports every candidate a declared ambiguous address could have meant", () => {
    const location = buildSourceLocation({
      filePath: "packages/example/src/foo.service.ts",
      line: 12,
    });
    const collection = resolveDescribedEntries({
      callables: [
        buildDiscoveredCallable({
          displayName: "FooService.bar",
          id: "packages/example/src/foo.service.ts#0",
          location,
        }),
        buildDiscoveredCallable({
          displayName: "FooService.bar",
          id: "packages/example/src/foo.service.ts#1",
          location: { ...location, line: 40 },
        }),
      ],
      entryPoints: {
        addresses: ["packages/example/src/foo.service.ts#FooService.bar"],
      },
    });

    expect(collection.unresolvedAddresses).toStrictEqual([
      {
        address: "packages/example/src/foo.service.ts#FooService.bar",
        projectName: undefined,
        resolution: {
          candidates: [
            { id: "packages/example/src/foo.service.ts#0", location },
            {
              id: "packages/example/src/foo.service.ts#1",
              location: { ...location, line: 40 },
            },
          ],
          kind: "ambiguous",
        },
      },
    ]);
  });

  it("reports a declared address that is not an address at all", () => {
    const collection = resolveDescribedEntries({
      callables: [buildDiscoveredCallable()],
      entryPoints: { addresses: ["FooService.bar"] },
    });

    expect(collection.unresolvedAddresses[0]?.resolution.kind).toBe("invalid");
  });

  it("names the project whose own configuration declared the address", () => {
    const collection = resolveDescribedEntries({
      callables: [buildDiscoveredCallable()],
      entryPointsByProject: new Map([
        [
          "example",
          buildRules({ addresses: ["packages/example/src/gone.ts#Gone.away"] }),
        ],
      ]),
    });

    expect(collection.unresolvedAddresses).toStrictEqual([
      {
        address: "packages/example/src/gone.ts#Gone.away",
        projectName: "example",
        resolution: { kind: "not-found" },
      },
    ]);
  });

  // 🏘️ Judges each callable by the rules of the project that owns it

  it("judges a callable by the rules of the project owning it", () => {
    // A project reached through another one's dependency closure is still
    // judged by its own configuration, never by whoever reached it.
    const entryPoints = resolveEntryPoints({
      entryPointsByProject: new Map([
        ["quiet", buildRules({ includeOrphans: false })],
      ]),
      files: {
        "packages/example/src/modules/a/a.service.ts":
          "export class Loud { public unused(): void {} }",
        "packages/quiet/src/modules/b/b.service.ts":
          "export class Quiet { public unused(): void {} }",
      },
      relabelProject: (filePath) =>
        filePath.startsWith("packages/quiet/") ? "quiet" : "example",
    });

    expect(entryPoints).toStrictEqual([
      { kind: "orphan-root", name: "Loud.unused" },
    ]);
  });

  it("falls back to the workspace rules for a project declaring none", () => {
    const entryPoints = resolveEntryPoints({
      entryPoints: { includeOrphans: false },
      entryPointsByProject: new Map([
        ["quiet", buildRules({ includeOrphans: true })],
      ]),
      files: {
        "packages/example/src/modules/a/a.service.ts":
          "export class Loud { public unused(): void {} }",
        "packages/quiet/src/modules/b/b.service.ts":
          "export class Quiet { public unused(): void {} }",
      },
      relabelProject: (filePath) =>
        filePath.startsWith("packages/quiet/") ? "quiet" : "example",
    });

    expect(entryPoints).toStrictEqual([
      { kind: "orphan-root", name: "Quiet.unused" },
    ]);
  });
});
