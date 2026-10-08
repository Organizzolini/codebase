import path from "node:path";

import {
  ConfigurationModule,
  ConfigurationService,
  DEFAULT_MAXIMUM_DEPTH,
  ProjectConfigurationMissingError,
} from "@callidescope/configuration";
import { FileFilterService, WorkspaceService } from "@callidescope/graph";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { LimitsService } from "./limits.service";

import type {
  CallidescopeConfiguration,
  CallidescopeLimits,
  LoadConfigurationArguments,
  LoadedCallidescopeConfiguration,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";
import type { MockInstance } from "vitest";

/** The workspace configuration file this suite's runs are pointed at. */
const WORKSPACE_CONFIGURATION_PATH = path.join(
  process.cwd(),
  "configuration/callidescope.config.ts",
);

/** A project that declares limits of its own. */
const DECLARING_PROJECT = "packages/alpha";

/** A project whose own file overrides nothing the defaults gave it. */
const QUIET_PROJECT = "packages/beta";

/** The configuration file `packages/alpha` declares its limits in. */
const DECLARING_PROJECT_CONFIGURATION_PATH = path.join(
  process.cwd(),
  DECLARING_PROJECT,
  "callidescope.config.ts",
);

/** The configuration file `packages/beta` spreads the defaults into. */
const QUIET_PROJECT_CONFIGURATION_PATH = path.join(
  process.cwd(),
  QUIET_PROJECT,
  "callidescope.config.ts",
);

/** Which file each project root answers with, keyed by absolute root. */
const CONFIGURATION_PATH_BY_PROJECT_ROOT = new Map([
  [
    path.join(process.cwd(), DECLARING_PROJECT),
    DECLARING_PROJECT_CONFIGURATION_PATH,
  ],
  [path.join(process.cwd(), QUIET_PROJECT), QUIET_PROJECT_CONFIGURATION_PATH],
]);

/** A resolved configuration with every field a run reads filled in. */
function buildConfiguration(
  overrides: Partial<ResolvedCallidescopeConfiguration> = {},
): ResolvedCallidescopeConfiguration {
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
      maximumDepth: DEFAULT_MAXIMUM_DEPTH,
    },
    write: {
      json: undefined,
      markdown: undefined,
      mermaid: undefined,
    },
    ...overrides,
  };
}

/**
 * One loaded configuration file, as the loader answers with it.
 *
 * The resolved limits are derived from the authored ones rather than supplied
 * beside them, so a fixture cannot pair a number a file wrote with a different
 * number resolution reports — which is the very disagreement the workspace row
 * is built to survive. `maximumDepth` is defaulted exactly as resolution
 * defaults it; `maximumBreadth` has no default and stays absent.
 */
function buildLoadedFile(args: {
  authored: CallidescopeConfiguration;
  path: string | undefined;
}): {
  authored: CallidescopeConfiguration;
  configuration: ResolvedCallidescopeConfiguration;
  path: string | undefined;
} {
  const authoredLimits: CallidescopeLimits = {
    maximumBreadth: undefined,
    ...args.authored.limits,
  };

  return {
    authored: {
      // Every field a project must set, so a fixture staging one project's
      // limits is not also staging a file the loader refuses as incomplete.
      entryPoints: {
        addresses: [],
        decorators: [],
        includeExportedFunctions: true,
        includeOrphans: true,
        includeTests: false,
      },
      exclude: [],
      write: { markdown: undefined, mermaid: undefined },
      ...args.authored,
      limits: authoredLimits,
    },
    configuration: buildConfiguration({
      limits: {
        ...buildConfiguration().limits,
        maximumBreadth: authoredLimits.maximumBreadth,
        maximumDepth: authoredLimits.maximumDepth ?? DEFAULT_MAXIMUM_DEPTH,
      },
    }),
    path: args.path,
  };
}

describe(LimitsService, () => {
  let configurationService: ConfigurationService;
  let findConfigurationFileAt: MockInstance<
    ConfigurationService["findConfigurationFileAt"]
  >;
  let loadConfigurationFile: MockInstance<
    (
      args?: LoadConfigurationArguments,
    ) => Promise<LoadedCallidescopeConfiguration>
  >;
  let logger: ReturnType<typeof createMock<LoggerService>>;
  let service: LimitsService;
  let fileFilterService: ReturnType<typeof createMock<FileFilterService>>;
  let workspaceService: ReturnType<typeof createMock<WorkspaceService>>;

  /** Declares which projects the walk finds, in the order it finds them. */
  function discover(projects: readonly string[]): void {
    workspaceService.discoverProjects.mockReturnValue(
      projects.map((project) => ({
        configurationPath: path.join(process.cwd(), project, "tsconfig.json"),
        hasPackageManifest: true,
        name: project,
        root: project,
      })),
    );
  }

  // The real limit resolver, mocked only where it reaches the filesystem: a
  // listing that resolved inheritance its own way could disagree with the gate
  // about the same number, so the suite asserts the one resolver's answer.
  beforeAll(async () => {
    logger = createMock<LoggerService>();
    fileFilterService = createMock<FileFilterService>();
    workspaceService = createMock<WorkspaceService>();

    const module = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [
        LimitsService,
        { provide: LoggerService, useValue: logger },
        { provide: FileFilterService, useValue: fileFilterService },
        { provide: WorkspaceService, useValue: workspaceService },
      ],
    }).compile();

    service = await module.resolve(LimitsService);
    // The real facade, with only its two file reads stubbed. The project
    // loader behind it reads through the facade it was handed, so stubbing
    // this one object is stubbing the whole layer's view of the disk — and
    // the resolver that decides the numbers stays the tool's own.
    configurationService = await module.resolve(ConfigurationService);
    findConfigurationFileAt = vi.spyOn(
      configurationService,
      "findConfigurationFileAt",
    );
    loadConfigurationFile = vi.spyOn(
      configurationService,
      "loadConfigurationFile",
    );
  });

  // The service holds no state, so one instance serves the suite; what each
  // test needs fresh is what the filesystem answers with.
  beforeEach(() => {
    findConfigurationFileAt.mockReset();
    loadConfigurationFile.mockReset();
    logger.info.mockClear();
    fileFilterService.buildFileFilter.mockReset();
    workspaceService.discoverProjects.mockReset();

    fileFilterService.buildFileFilter.mockReturnValue({
      isExcluded: () => false,
    });
    discover([DECLARING_PROJECT, QUIET_PROJECT]);

    findConfigurationFileAt.mockImplementation((directory: string) =>
      CONFIGURATION_PATH_BY_PROJECT_ROOT.get(directory),
    );
    declareProjectLimits({ maximumDepth: 17 });
  });

  /**
   * Answers each traced project's own complete file, and the workspace's.
   *
   * Keyed on the path asked for rather than queued in call order, because
   * every traced project declares a file now: a queue would have to be as long
   * as the walk, and would answer the wrong file the moment a test discovered
   * a different set.
   */
  function declareProjectLimits(limits: CallidescopeLimits): void {
    const byPath = new Map([
      [DECLARING_PROJECT_CONFIGURATION_PATH, limits],
      [QUIET_PROJECT_CONFIGURATION_PATH, { maximumDepth: 17 }],
    ]);

    loadConfigurationFile.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/require-await
      async (args?: { configurationPath?: string | undefined }) => {
        const requested = args?.configurationPath;
        const authored =
          requested === undefined ? undefined : byPath.get(requested);

        return authored === undefined
          ? buildLoadedFile({
              authored: { limits: { maximumDepth: 17 } },
              path: WORKSPACE_CONFIGURATION_PATH,
            })
          : buildLoadedFile({
              authored: { limits: authored },
              path: requested,
            });
      },
    );
  }

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("names the workspace's own numbers, in the file they are written in", async () => {
    discover([]);

    const rows = await service.list({});

    expect(rows).toStrictEqual([
      {
        limit: "maximumDepth",
        path: "configuration/callidescope.config.ts",
        project: undefined,
        value: 17,
      },
      {
        limit: "maximumBreadth",
        path: undefined,
        project: undefined,
        value: undefined,
      },
    ]);
  });

  it("claims no file for a workspace that has no configuration at all", async () => {
    discover([]);
    loadConfigurationFile.mockResolvedValue(
      buildLoadedFile({ authored: {}, path: undefined }),
    );

    const rows = await service.list({});

    expect(rows).toStrictEqual([
      {
        limit: "maximumDepth",
        path: undefined,
        project: undefined,
        value: DEFAULT_MAXIMUM_DEPTH,
      },
      {
        limit: "maximumBreadth",
        path: undefined,
        project: undefined,
        value: undefined,
      },
    ]);
  });

  // The one case where a path alone would lie: resolution defaults
  // `maximumDepth` for every run, so a path stamped unconditionally would name
  // a file for a number that file never wrote.
  it("claims no file for a limit the workspace file never wrote itself", async () => {
    discover([]);
    loadConfigurationFile.mockResolvedValue(
      buildLoadedFile({
        authored: { excludeFrom: ["configuration/.callidescopeignore"] },
        path: WORKSPACE_CONFIGURATION_PATH,
      }),
    );

    const rows = await service.list({});

    expect(rows).toStrictEqual([
      {
        limit: "maximumDepth",
        path: undefined,
        project: undefined,
        value: DEFAULT_MAXIMUM_DEPTH,
      },
      {
        limit: "maximumBreadth",
        path: undefined,
        project: undefined,
        value: undefined,
      },
    ]);
  });

  it("names the quiet project's own file, the defaults having been spread into it", async () => {
    const rows = await service.list({});

    expect(rows.filter((row) => row.project === QUIET_PROJECT)).toStrictEqual([
      {
        limit: "maximumDepth",
        path: "packages/beta/callidescope.config.ts",
        project: QUIET_PROJECT,
        value: 17,
      },
      {
        limit: "maximumBreadth",
        path: undefined,
        project: QUIET_PROJECT,
        value: undefined,
      },
    ]);
  });

  it("refuses a listing over a project that has no configuration file", async () => {
    // The listing is at its least trustworthy exactly when a project's
    // configuration is missing, so it ends the run rather than printing a
    // number that project never wrote.
    findConfigurationFileAt.mockReturnValue(undefined);

    await expect(service.list({})).rejects.toThrow(
      ProjectConfigurationMissingError,
    );
  });

  it("names a project that declared both limits as declaring them, in its own file", async () => {
    declareProjectLimits({ maximumBreadth: 6, maximumDepth: 10 });

    const rows = await service.list({});

    expect(
      rows.filter((row) => row.project === DECLARING_PROJECT),
    ).toStrictEqual([
      {
        limit: "maximumDepth",
        path: "packages/alpha/callidescope.config.ts",
        project: DECLARING_PROJECT,
        value: 10,
      },
      {
        limit: "maximumBreadth",
        path: "packages/alpha/callidescope.config.ts",
        project: DECLARING_PROJECT,
        value: 6,
      },
    ]);
  });

  it("lists the workspace default ahead of every project it walked", async () => {
    const rows = await service.list({});

    expect(rows.map((row) => row.project)).toStrictEqual([
      undefined,
      undefined,
      DECLARING_PROJECT,
      DECLARING_PROJECT,
      QUIET_PROJECT,
      QUIET_PROJECT,
    ]);
  });

  it("reads the configuration file the command line named", async () => {
    discover([]);

    await service.list({ config: "configuration/callidescope.config.ts" });

    expect(loadConfigurationFile).toHaveBeenCalledWith({
      configurationPath: "configuration/callidescope.config.ts",
      searchDirectory: process.cwd(),
    });
  });

  it("walks with the exclusions the configuration declares", async () => {
    discover([]);
    loadConfigurationFile.mockReset();
    loadConfigurationFile.mockResolvedValue({
      authored: {},
      configuration: buildConfiguration({
        exclude: ["packages/ignored/**"],
        excludeFrom: ["configuration/.callidescopeignore"],
      }),
      path: WORKSPACE_CONFIGURATION_PATH,
    });

    await service.list({});

    expect(fileFilterService.buildFileFilter).toHaveBeenCalledWith({
      exclude: ["packages/ignored/**"],
      excludeFrom: ["configuration/.callidescopeignore"],
      workspaceRoot: process.cwd(),
    });
  });

  it("counts the projects it walked and the ones that declared anything", async () => {
    declareProjectLimits({ maximumDepth: 10 });

    await service.list({});

    expect(logger.info).toHaveBeenCalledWith(
      "🔭 Listed every project's limits",
      undefined,
      { declaringProjectCount: 2, projectCount: 2 },
    );
  });
});
