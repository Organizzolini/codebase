import {
  ConfigurationModule,
  ConfigurationService,
} from "@callidescope/configuration";
import {
  AddressService,
  BreadthService,
  ComponentsService,
  DocumentationService,
  EntriesService,
  GraphAssemblyService,
  GraphDepthService,
  GraphService,
  PathsService,
  SignaturesService,
} from "@callidescope/graph";
import { ProjectReportsService } from "@callidescope/output";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import {
  buildFixtureProgram,
  buildFixtureServices,
  collectFixtureCallables,
  FIXTURE_ROOT,
} from "../../../testing/programs";

import { CallidescopeService } from "./callidescope.service";

import type { FixtureServices } from "../../../testing/programs";
import type {
  CallidescopeLimits,
  LoadedProjectConfiguration,
  ProjectLimitsLookup,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";
import type { CallGraphResult } from "@callidescope/core";
import type { DeepMocked } from "@golevelup/ts-vitest";

/** The real configuration facade, resolved once by `beforeAll` below. */
let configurationService: ConfigurationService;

/** Analyzes in-memory files end to end, short of reading the disk. */
function analyze(args: {
  configuration?: ResolvedCallidescopeConfiguration;
  files: Record<string, string>;
  projectLimits?: ProjectLimitsLookup;
}): CallGraphResult {
  const projectProgram = buildFixtureProgram(args.files);
  const fixture = buildFixtureServices({ projectProgram });
  const collection = collectFixtureCallables({
    projectProgram,
    services: fixture,
  });
  const configuration = args.configuration ?? buildConfiguration();

  return buildSubject({ fixture }).analyze({
    callablesById: collection.byId,
    configuration,
    entryPointsByProject: new Map(),
    fileCount: collection.fileCount,
    fileCountByProject: collection.fileCountByProject,
    projectCount: 1,
    projectLimits:
      args.projectLimits ??
      resolveLimits({ workspaceConfiguration: configuration }),
    projectNames: ["example"],
    workspaceRoot: FIXTURE_ROOT,
  }).result;
}

/** Builds a resolved configuration with the defaults this suite assumes. */
function buildConfiguration(
  overrides: Partial<ResolvedCallidescopeConfiguration> = {},
): ResolvedCallidescopeConfiguration {
  return {
    directories: [],
    entryPoints: {
      addresses: [],
      decorators: ["Command", "Get"],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: true,
    },
    exclude: [],
    excludeCallees: [],
    excludeFrom: [],
    limits: {
      maximumDepth: 2,
    },
    write: {
      json: undefined,
      markdown: undefined,
      mermaid: undefined,
    },
    ...overrides,
  };
}

/** Wires a `CallidescopeService` to fixture collaborators. */
function buildSubject(args: {
  fixture: FixtureServices;
  logger?: DeepMocked<LoggerService>;
}): CallidescopeService {
  return new CallidescopeService(
    args.fixture.callables,
    args.fixture.hierarchy,
    new EntriesService(new AddressService(), createMock<LoggerService>()),
    args.fixture.external,
    args.fixture.fileFilter,
    new GraphAssemblyService(
      new BreadthService(),
      new ComponentsService(),
      new GraphDepthService(),
      args.fixture.edges,
      new GraphService(),
    ),
    args.fixture.programService,
    createMock<ConfigurationService>(),
    new ProjectReportsService(
      new PathsService(new DocumentationService(), new SignaturesService()),
      new SignaturesService(),
    ),
    args.fixture.workspace,
    args.logger ?? createMock<LoggerService>(),
  );
}

/**
 * Resolves limits the way a real run does, through the real resolver.
 *
 * The one resolver rather than a second copy of the inheritance rules: a test
 * that worked them out for itself could pass while the tool disagreed.
 */
function resolveLimits(args: {
  projectConfigurations?: readonly LoadedProjectConfiguration[];
  workspaceAuthoredLimits?: CallidescopeLimits | undefined;
  workspaceConfiguration?: ResolvedCallidescopeConfiguration;
}): ProjectLimitsLookup {
  return configurationService.resolveLimits({
    projectConfigurations: args.projectConfigurations ?? [],
    projects: ["example"],
    workspaceAuthoredLimits: args.workspaceAuthoredLimits,
    workspaceConfiguration: args.workspaceConfiguration ?? buildConfiguration(),
    workspaceConfigurationPath: "callidescope.config.ts",
  });
}

describe(CallidescopeService, () => {
  let service: CallidescopeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES, ConfigurationModule],
      providers: [
        CallidescopeService,
        GraphAssemblyService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(CallidescopeService);
    // The real facade, wired by its own module, so `resolveLimits` below runs
    // the tool's own resolver rather than a second copy of its rules.
    configurationService = await module.resolve(ConfigurationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("logs a summary when the analysis finishes", () => {
    const projectProgram = buildFixtureProgram({
      "packages/example/src/index.ts": "export function one(): void {}",
    });
    const fixture = buildFixtureServices({ projectProgram });
    const collection = collectFixtureCallables({
      projectProgram,
      services: fixture,
    });
    const logger = createMock<LoggerService>();

    buildSubject({ fixture, logger }).analyze({
      callablesById: collection.byId,
      configuration: buildConfiguration(),
      entryPointsByProject: new Map(),
      fileCount: collection.fileCount,
      fileCountByProject: collection.fileCountByProject,
      projectCount: 1,
      projectLimits: resolveLimits({}),
      projectNames: ["example"],
      workspaceRoot: FIXTURE_ROOT,
    });

    expect(logger.info).toHaveBeenCalledWith(
      "🔭 Finished an analysis",
      undefined,
      {
        callableCount: 1,
        edgeCount: 0,
        entryPointCount: 1,
        maximumDepthTraced: 1,
      },
    );
  });

  it("names the logged depth for the trace rather than for one project", () => {
    // A scoped run builds programs for its whole dependency closure, so this
    // number routinely belongs to a project the run was never pointed at —
    // `tools/synchronization` printed a traced seventeen while owning ten.
    // Under a bare `maximumDepth` it reads as the number to write into that
    // project's own limit, which would be headroom. Pinned here because the
    // name is the entire fix, and a rename back would be silent.
    const projectProgram = buildFixtureProgram({
      "packages/example/src/index.ts": `
        function inner(): void {}
        export function outer(): void { inner(); }
      `,
    });
    const fixture = buildFixtureServices({ projectProgram });
    const collection = collectFixtureCallables({
      projectProgram,
      services: fixture,
    });
    const logger = createMock<LoggerService>();

    buildSubject({ fixture, logger }).analyze({
      callablesById: collection.byId,
      configuration: buildConfiguration(),
      entryPointsByProject: new Map(),
      fileCount: collection.fileCount,
      fileCountByProject: collection.fileCountByProject,
      projectCount: 1,
      projectLimits: resolveLimits({}),
      projectNames: ["example"],
      workspaceRoot: FIXTURE_ROOT,
    });

    const fields = logger.info.mock.calls[0]?.[2];

    expect(fields).toHaveProperty("maximumDepthTraced");
    expect(fields).not.toHaveProperty("maximumDepth");
  });

  it("reports a stack deeper than the configured limit", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function three(): void {}
          function two(): void { three(); }
          export function one(): void { two(); }
        `,
      },
    });

    expect(result.deepStacks).toHaveLength(1);
    expect(result.deepStacks[0]?.depth).toBe(3);
  });

  it("reports nothing when every stack is within the limit", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": "export function one(): void {}",
      },
    });

    expect(result.deepStacks).toStrictEqual([]);
  });

  it("leaves a project alone when it declared a limit above the workspace's", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function three(): void {}
          function two(): void { three(); }
          export function one(): void { two(); }
        `,
      },
      projectLimits: resolveLimits({
        projectConfigurations: [
          {
            authored: { limits: { maximumDepth: 3 } },
            configuration: buildConfiguration({
              limits: {
                ...buildConfiguration().limits,
                maximumDepth: 3,
              },
            }),
            path: "packages/example/callidescope.config.ts",
            project: "example",
          },
        ],
      }),
    });

    expect(result.deepStacks).toStrictEqual([]);
  });

  it("stamps a finding with the limit the project declared for itself", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function three(): void {}
          function two(): void { three(); }
          export function one(): void { two(); }
        `,
      },
      projectLimits: resolveLimits({
        projectConfigurations: [
          {
            authored: { limits: { maximumDepth: 1 } },
            configuration: buildConfiguration({
              limits: {
                ...buildConfiguration().limits,
                maximumDepth: 1,
              },
            }),
            path: "packages/example/callidescope.config.ts",
            project: "example",
          },
        ],
      }),
    });

    expect(result.deepStacks[0]?.limit).toBe(1);
  });

  it("names every frame of a reported stack", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function three(): void {}
          function two(): void { three(); }
          export function one(): void { two(); }
        `,
      },
    });

    expect(
      result.deepStacks[0]?.frames.map((frame) => frame.displayName),
    ).toStrictEqual(["one", "two", "three"]);
  });

  it("marks a stack running through an unfollowable call as a lower bound", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function three(callback: () => void): void { callback(); }
          function two(): void { three(() => {}); }
          export function one(): void { two(); }
        `,
      },
    });

    expect(result.deepStacks[0]?.isLowerBound).toBe(true);
  });

  it("orders reported stacks deepest first", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function four(): void {}
          function three(): void { four(); }
          function two(): void { three(); }
          export function deep(): void { two(); }
          export function shallow(): void { three(); }
        `,
      },
    });

    const depths = result.deepStacks.map((finding) => finding.depth);

    expect(depths).toStrictEqual([...depths].toSorted((a, b) => b - a));
  });

  it("counts what it traced in the summary", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function helper(): void {}
          export function entry(): void { helper(); }
        `,
      },
    });

    expect(result.summary).toMatchObject({
      callableCount: 2,
      edgeCount: 1,
      fileCount: 1,
      projectCount: 1,
    });
  });

  it("counts the recursive cycles it found", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          export function ping(): void { pong(); }
          export function pong(): void { ping(); }
        `,
      },
    });

    expect(result.summary.cyclicComponentCount).toBe(1);
  });

  it("reports the deepest stack in the workspace", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function three(): void {}
          function two(): void { three(); }
          export function one(): void { two(); }
        `,
      },
    });

    expect(result.summary.maximumDepth).toBe(3);
  });

  // 📮 Roots a callable the configuration declared by address

  it("roots a callable the configuration declared as an entry point", () => {
    const projectProgram = buildFixtureProgram({
      "packages/example/src/modules/a/a.service.ts": `
        export class Service {
          public read(): void { this.parse(); }
          private parse(): void {}
        }
      `,
    });
    const fixture = buildFixtureServices({ projectProgram });
    const collection = collectFixtureCallables({
      projectProgram,
      services: fixture,
    });

    const { result } = buildSubject({ fixture }).analyze({
      callablesById: collection.byId,
      configuration: buildConfiguration({
        entryPoints: {
          addresses: [
            "packages/example/src/modules/a/a.service.ts#Service.read",
          ],
          decorators: [],
          includeExportedFunctions: false,
          includeOrphans: false,
          includeTests: true,
        },
      }),
      entryPointsByProject: new Map(),
      fileCount: collection.fileCount,
      fileCountByProject: collection.fileCountByProject,
      projectCount: 1,
      projectLimits: resolveLimits({}),
      projectNames: ["example"],
      workspaceRoot: FIXTURE_ROOT,
    });

    expect(result.projects[0]?.stacks).toStrictEqual([
      expect.objectContaining({ entryPointKind: "declared" }),
    ]);
  });

  it("reports a declared address that named no callable", () => {
    const projectProgram = buildFixtureProgram({
      "packages/example/src/modules/a/a.service.ts":
        "export class Service { public read(): void {} }",
    });
    const fixture = buildFixtureServices({ projectProgram });
    const collection = collectFixtureCallables({
      projectProgram,
      services: fixture,
    });

    const { unresolvedAddresses } = buildSubject({ fixture }).analyze({
      callablesById: collection.byId,
      configuration: buildConfiguration({
        entryPoints: {
          addresses: ["packages/example/src/modules/a/a.service.ts#Gone.away"],
          decorators: [],
          includeExportedFunctions: false,
          includeOrphans: false,
          includeTests: true,
        },
      }),
      entryPointsByProject: new Map(),
      fileCount: collection.fileCount,
      fileCountByProject: collection.fileCountByProject,
      projectCount: 1,
      projectLimits: resolveLimits({}),
      projectNames: ["example"],
      workspaceRoot: FIXTURE_ROOT,
    });

    expect(unresolvedAddresses).toStrictEqual([
      {
        address: "packages/example/src/modules/a/a.service.ts#Gone.away",
        projectName: undefined,
        resolution: { kind: "not-found" },
      },
    ]);
  });
});
