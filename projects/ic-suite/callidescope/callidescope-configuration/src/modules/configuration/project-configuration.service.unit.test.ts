import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ConfigurationFileService } from "./configuration-file.service";
import {
  CONFIGURATION_FILE_NAMES,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_MAXIMUM_DEPTH,
  ProjectConfigurationError,
  ProjectConfigurationFieldNotPermittedError,
  ProjectConfigurationIncompleteError,
  ProjectConfigurationMissingError,
} from "./configuration.constants";
import { ProjectConfigurationService } from "./project-configuration.service";

import type {
  CallidescopeLimitOverrides,
  CallidescopeProjectConfiguration,
  ProjectLimitsLookup,
} from "./configuration.types";

/** The spelling `writeWorkspace` stages every configuration under. */
const CONFIGURATION_FILE_NAME = CONFIGURATION_FILE_NAMES[3];

/**
 * A project configuration with every field a project must set.
 *
 * Every test staging a well-formed project file goes through here, so a field
 * that becomes required is added in one place rather than in thirty — and a
 * test asserting something other than completeness cannot accidentally stop
 * asserting it.
 */
function completeConfiguration(
  overrides: Partial<CallidescopeProjectConfiguration> = {},
): CallidescopeProjectConfiguration {
  return {
    entryPoints: {
      addresses: [],
      decorators: [],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    },
    exclude: [],
    limits: { maximumBreadth: undefined, maximumDepth: 6 },
    write: { markdown: undefined, mermaid: undefined },
    ...overrides,
  };
}

/**
 * Resolves a written-out workspace's limits through the whole path a run
 * takes: load the workspace file, load whatever the projects declared, resolve.
 */
async function resolveWrittenLimits(args: {
  configurationService: ConfigurationFileService;
  limitOverrides?: CallidescopeLimitOverrides | undefined;
  projects: readonly string[];
  service: ProjectConfigurationService;
  workspaceRoot: string;
}): Promise<ProjectLimitsLookup> {
  const workspaceConfigurationPath = path.join(
    args.workspaceRoot,
    CONFIGURATION_FILE_NAME,
  );
  const workspace = await args.configurationService.loadConfigurationFile({
    configurationPath: workspaceConfigurationPath,
  });
  const projectConfigurations = await args.service.loadProjectConfigurations(
    {
      projects: args.projects,
      workspaceConfigurationPath,
      workspaceRoot: args.workspaceRoot,
    },
    args.configurationService,
  );

  return args.service.resolveLimits({
    limitOverrides: args.limitOverrides,
    projectConfigurations,
    projects: args.projects,
    workspaceAuthoredLimits: workspace.authored.limits,
    workspaceConfiguration: workspace.configuration,
    workspaceConfigurationPath,
  });
}

/**
 * Writes an object as a JavaScript literal, `undefined` members included.
 *
 * `JSON.stringify` drops a key written as `undefined`, which is precisely the
 * difference these tests are about: a project that wrote the member and a
 * project that forgot it would stage the same file.
 */
function serialize(value: unknown): string {
  if (Array.isArray(value)) {
    const entries: readonly unknown[] = value;

    return `[${entries.map((entry) => serialize(entry)).join(", ")}]`;
  }

  if (typeof value === "object" && value !== null) {
    const members: Readonly<Record<string, unknown>> = { ...value };

    return `{ ${Object.entries(members)
      .map(([key, member]) => `${JSON.stringify(key)}: ${serialize(member)}`)
      .join(", ")} }`;
  }

  return value === undefined ? "undefined" : JSON.stringify(value);
}

/**
 * Copies an object without one key, staging the file a project forgot to
 * finish.
 *
 * Rebuilt from its entries rather than copied and deleted from, because a
 * dynamic `delete` is a lint error here — and a key whose value is `undefined`
 * survives the rebuild, which is exactly the distinction these tests turn on.
 */
function withoutKey(
  value: object,
  key: string,
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(value).filter(([name]) => name !== key),
  );
}

/**
 * Writes a fresh workspace holding one configuration file per named project.
 *
 * An object is written as a JavaScript module and anything else verbatim, so
 * staging a malformed file is as easy as staging a well-formed one. JavaScript
 * rather than JSON because `undefined` is the value a complete configuration
 * writes to gate no breadth or publish no diagram, and JSON cannot spell it.
 */
async function writeWorkspace(
  projects: Record<string, object | string>,
): Promise<string> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "callidescope-workspace-"),
  );

  for (const [project, contents] of Object.entries(projects)) {
    const projectRoot = path.join(workspaceRoot, project);

    await mkdir(projectRoot, { recursive: true });
    await writeFile(
      path.join(projectRoot, CONFIGURATION_FILE_NAME),
      typeof contents === "string"
        ? contents
        : `export default ${serialize(contents)};\n`,
      "utf8",
    );
  }

  return workspaceRoot;
}

describe(ProjectConfigurationService, () => {
  let configurationService: ConfigurationFileService;
  let service: ProjectConfigurationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ConfigurationFileService, ProjectConfigurationService],
    }).compile();

    configurationService = await module.resolve(ConfigurationFileService);
    service = await module.resolve(ProjectConfigurationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🗂️ Discovery

  it("resolves the configuration sitting at a project root", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/gated": completeConfiguration({
        limits: { maximumBreadth: undefined, maximumDepth: 3 },
      }),
    });

    const loaded = await service.loadProjectConfigurations(
      {
        projects: ["packages/gated"],
        workspaceRoot,
      },
      configurationService,
    );

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.project).toBe("packages/gated");
    expect(loaded[0]?.path).toBe(
      path.join(workspaceRoot, "packages", "gated", CONFIGURATION_FILE_NAME),
    );
    expect(loaded[0]?.configuration.limits.maximumDepth).toBe(3);
  });

  it("never walks upward out of a project root", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": completeConfiguration(),
    });
    await mkdir(path.join(workspaceRoot, "packages", "plain"), {
      recursive: true,
    });

    // A project holding no file of its own is refused rather than handed the
    // one above it: walking up would give every project a copy of the
    // workspace's, which is the resolution this arrangement exists to end.
    await expect(
      service.loadProjectConfigurations(
        {
          projects: ["packages/plain"],
          workspaceRoot,
        },
        configurationService,
      ),
    ).rejects.toThrow(ProjectConfigurationMissingError);
  });

  // 🧬 Defaults

  it("merges nothing into a project configuration", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/gated": completeConfiguration({
        limits: { maximumBreadth: undefined, maximumDepth: 3 },
      }),
    });

    const [loaded] = await service.loadProjectConfigurations(
      {
        projects: ["packages/gated"],
        workspaceConfigurationPath: path.join(
          workspaceRoot,
          CONFIGURATION_FILE_NAME,
        ),
        workspaceRoot,
      },
      configurationService,
    );

    // What a project takes from the workspace it takes by spreading
    // `projectDefaults` into its own file, before the loader ever sees it.
    // Nothing here reaches across to a second file, so a field the project
    // never wrote is absent from what it authored.
    expect(loaded?.authored.limits?.maximumDepth).toBe(3);
    expect(loaded?.authored.excludeFrom).toBeUndefined();
    expect(loaded?.configuration.exclude).toStrictEqual([
      ...DEFAULT_EXCLUDE_GLOBS,
    ]);
  });

  it("keeps every limit a project declared for itself", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/gated": completeConfiguration({
        limits: { maximumBreadth: 9, maximumDepth: 3 },
      }),
    });

    const [loaded] = await service.loadProjectConfigurations(
      {
        projects: ["packages/gated"],
        workspaceRoot,
      },
      configurationService,
    );

    expect(loaded?.configuration.limits.maximumBreadth).toBe(9);
  });

  // 🎭 One File, One Role

  it("skips the file already loaded as the run's own configuration", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/examples": {
        write: { json: { path: "report.json" } },
      },
    });

    // Round-tripped through the loader rather than rebuilt by hand: the rule is
    // an equality against the path a run really loaded, and a test constructing
    // both sides the same way cannot fail for the reason the rule can.
    const { path: workspaceConfigurationPath } =
      await configurationService.loadConfigurationFile({
        configurationPath: path.join(
          workspaceRoot,
          "packages",
          "examples",
          CONFIGURATION_FILE_NAME,
        ),
      });

    const loaded = await service.loadProjectConfigurations(
      {
        projects: ["packages/examples"],
        workspaceConfigurationPath,
        workspaceRoot,
      },
      configurationService,
    );

    expect(loaded).toStrictEqual([]);
  });

  it("skips the run's own configuration named relative to the workspace root", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/examples": {
        write: { json: { path: "report.json" } },
      },
    });

    // A command line names its configuration relative to the workspace root, so
    // the skip has to resolve it against that root — the same root every project
    // path here is resolved against, and not the process cwd.
    const loaded = await service.loadProjectConfigurations(
      {
        projects: ["packages/examples"],
        workspaceConfigurationPath: path.join(
          "packages",
          "examples",
          CONFIGURATION_FILE_NAME,
        ),
        workspaceRoot,
      },
      configurationService,
    );

    expect(loaded).toStrictEqual([]);
  });

  it("still resolves every other project's file alongside the skipped one", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/examples": {
        write: { json: { path: "report.json" } },
      },
      "packages/gated": completeConfiguration(),
    });

    const loaded = await service.loadProjectConfigurations(
      {
        projects: ["packages/examples", "packages/gated"],
        workspaceConfigurationPath: path.join(
          workspaceRoot,
          "packages",
          "examples",
          CONFIGURATION_FILE_NAME,
        ),
        workspaceRoot,
      },
      configurationService,
    );

    expect(loaded.map((entry) => entry.project)).toStrictEqual([
      "packages/gated",
    ]);
  });

  // 🚨 Refusals

  it("names the project when its configuration cannot be read", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/broken": "{ not json",
    });

    await expect(
      service.loadProjectConfigurations(
        {
          projects: ["packages/broken"],
          workspaceRoot,
        },
        configurationService,
      ),
    ).rejects.toThrow(ProjectConfigurationError);
  });

  it("names the project when its configuration threw something that is not an error", async () => {
    const workspaceRoot = await mkdtemp(
      path.join(tmpdir(), "callidescope-workspace-"),
    );
    const projectRoot = path.join(workspaceRoot, "packages", "broken");
    await mkdir(projectRoot, { recursive: true });
    await writeFile(
      path.join(projectRoot, "callidescope.config.js"),
      'throw "no configuration here";\n',
      "utf8",
    );

    await expect(
      service.loadProjectConfigurations(
        {
          projects: ["packages/broken"],
          workspaceRoot,
        },
        configurationService,
      ),
    ).rejects.toThrow("It could not be read");
  });

  it("names the project and the file when a configuration is refused", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/broken": completeConfiguration({
        limits: { maximumBreadth: undefined, maximumDepth: 0 },
      }),
    });
    const configurationPath = path.join(
      workspaceRoot,
      "packages",
      "broken",
      CONFIGURATION_FILE_NAME,
    );

    await expect(
      service.loadProjectConfigurations(
        {
          projects: ["packages/broken"],
          workspaceRoot,
        },
        configurationService,
      ),
    ).rejects.toThrow(`packages/broken at ${configurationPath}`);
  });

  // 📋 Completeness

  it("refuses a traced project that has no configuration file", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/gated": completeConfiguration(),
    });
    await mkdir(path.join(workspaceRoot, "packages", "plain"), {
      recursive: true,
    });

    await expect(
      service.loadProjectConfigurations(
        {
          projects: ["packages/gated", "packages/plain"],
          workspaceRoot,
        },
        configurationService,
      ),
    ).rejects.toThrow(
      "packages/plain is traced but has no callidescope.config.ts",
    );
  });

  it.each(["entryPoints", "exclude", "limits", "write"])(
    "refuses a project configuration that leaves %s out",
    async (field) => {
      const partial = withoutKey(completeConfiguration(), field);

      const workspaceRoot = await writeWorkspace({
        "packages/partial": partial,
      });
      const loading = service.loadProjectConfigurations(
        {
          projects: ["packages/partial"],
          workspaceRoot,
        },
        configurationService,
      );

      await expect(loading).rejects.toThrow(
        ProjectConfigurationIncompleteError,
      );
      await expect(loading).rejects.toThrow(`leaves ${field} out`);
    },
  );

  it.each([
    ["entryPoints.includeTests", "entryPoints", "includeTests"],
    ["limits.maximumBreadth", "limits", "maximumBreadth"],
    ["write.mermaid", "write", "mermaid"],
  ])(
    "refuses a project configuration that leaves %s out",
    async (name, field, member) => {
      const complete: Readonly<Record<string, unknown>> = {
        ...completeConfiguration(),
      };
      const value = complete[field];
      const partial = withoutKey(
        typeof value === "object" && value !== null ? value : {},
        member,
      );

      const workspaceRoot = await writeWorkspace({
        "packages/partial": { ...complete, [field]: partial },
      });

      await expect(
        service.loadProjectConfigurations(
          {
            projects: ["packages/partial"],
            workspaceRoot,
          },
          configurationService,
        ),
      ).rejects.toThrow(`leaves ${name} out`);
    },
  );

  it("refuses a field written as undefined, which says nothing about its members", async () => {
    // `limits: undefined` is not the statement `maximumBreadth: undefined` is.
    // A member written as undefined is a project saying it gates no breadth;
    // the field written as undefined says nothing about either number, so it
    // is the same gap as leaving the field out and is refused by that name.
    const workspaceRoot = await writeWorkspace({
      "packages/hollow": `export default {
        entryPoints: {
          addresses: [],
          decorators: [],
          includeExportedFunctions: true,
          includeOrphans: true,
          includeTests: false,
        },
        exclude: [],
        limits: undefined,
        write: { markdown: undefined, mermaid: undefined },
      };\n`,
    });
    const loading = service.loadProjectConfigurations(
      {
        projects: ["packages/hollow"],
        workspaceRoot,
      },
      configurationService,
    );

    await expect(loading).rejects.toThrow(ProjectConfigurationIncompleteError);
    await expect(loading).rejects.toThrow("leaves limits out");
  });

  it("accepts a member written as undefined, which is a decision rather than a gap", async () => {
    // `maximumBreadth: undefined` says this project gates depth and not
    // breadth, and `mermaid: undefined` says it publishes no diagram. Both are
    // written into the file rather than left out of it, which is the whole
    // distinction completeness buys.
    const workspaceRoot = await mkdtemp(
      path.join(tmpdir(), "callidescope-workspace-"),
    );
    const projectRoot = path.join(workspaceRoot, "packages", "quiet");
    await mkdir(projectRoot, { recursive: true });
    await writeFile(
      path.join(projectRoot, "callidescope.config.js"),
      `export default {
        entryPoints: {
          addresses: [],
          decorators: [],
          includeExportedFunctions: true,
          includeOrphans: true,
          includeTests: false,
        },
        exclude: [],
        limits: { maximumBreadth: undefined, maximumDepth: 4 },
        write: { markdown: undefined, mermaid: undefined },
      };\n`,
      "utf8",
    );

    const loaded = await service.loadProjectConfigurations(
      {
        projects: ["packages/quiet"],
        workspaceRoot,
      },
      configurationService,
    );

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.configuration.limits.maximumBreadth).toBeUndefined();
  });

  // 🔒 Permitted Fields

  it.each([
    ["directories", { directories: ["packages/other"] }],
    ["write.json", { write: { json: { path: "report.json" } } }],
    ["excludeFrom", { excludeFrom: [".callidescopeignore"] }],
    ["excludeCallees", { excludeCallees: ["Logger.log"] }],
  ])(
    "refuses a project configuration that sets %s",
    async (field, configuration) => {
      const workspaceRoot = await writeWorkspace({
        "packages/broken": configuration,
      });
      const loading = service.loadProjectConfigurations(
        {
          projects: ["packages/broken"],
          workspaceRoot,
        },
        configurationService,
      );

      await expect(loading).rejects.toThrow(
        ProjectConfigurationFieldNotPermittedError,
      );
      // The name as the reader has to type it to fix the file, dot path and
      // all: which field was refused is the user-facing half of the refusal,
      // and the error class alone says nothing about it.
      await expect(loading).rejects.toThrow(`sets ${field},`);
    },
  );

  it("names the project, the field, and the fields a project may set", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/broken": {
        write: { json: { path: "report.json" } },
      },
    });

    await expect(
      service.loadProjectConfigurations(
        {
          projects: ["packages/broken"],
          workspaceRoot,
        },
        configurationService,
      ),
    ).rejects.toThrow(
      "packages/broken sets write.json, which only the workspace " +
        "configuration may set. A project configuration may set entryPoints, " +
        "exclude, limits, write.markdown, and write.mermaid.",
    );
  });

  it("resolves the written destinations a project declared for itself", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/published": completeConfiguration({
        write: {
          markdown: { heading: "## 🔭 Callidescope", path: "README.md" },
          mermaid: { path: "docs/diagram.md" },
        },
      }),
    });

    const [loaded] = await service.loadProjectConfigurations(
      {
        projects: ["packages/published"],
        workspaceRoot,
      },
      configurationService,
    );

    expect(loaded?.configuration.write.markdown).toMatchObject({
      heading: "## 🔭 Callidescope",
      path: "README.md",
    });
    expect(loaded?.configuration.write.mermaid?.path).toBe("docs/diagram.md");
  });

  it("resolves the addresses a project declared as its own entry points", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/allowed": completeConfiguration({
        entryPoints: {
          addresses: ["packages/allowed/src/index.ts#publicApi"],
          decorators: [],
          includeExportedFunctions: true,
          includeOrphans: true,
          includeTests: false,
        },
      }),
    });

    const [loaded] = await service.loadProjectConfigurations(
      {
        projects: ["packages/allowed"],
        workspaceRoot,
      },
      configurationService,
    );

    expect(loaded?.configuration.entryPoints.addresses).toStrictEqual([
      "packages/allowed/src/index.ts#publicApi",
    ]);
  });

  it("never refuses the run's own workspace configuration for the fields it legitimately sets", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/examples": {
        directories: ["packages"],
        excludeFrom: [".callidescopeignore"],
        write: { json: { path: "report.json" } },
      },
    });

    const { path: workspaceConfigurationPath } =
      await configurationService.loadConfigurationFile({
        configurationPath: path.join(
          workspaceRoot,
          "packages",
          "examples",
          CONFIGURATION_FILE_NAME,
        ),
      });

    const loaded = await service.loadProjectConfigurations(
      {
        projects: ["packages/examples"],
        workspaceConfigurationPath,
        workspaceRoot,
      },
      configurationService,
    );

    expect(loaded).toStrictEqual([]);
  });

  // 🎛️ A command-line limit override, applied where a project declared one

  it("judges a project by an overriding limit rather than by its own", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": { limits: { maximumDepth: 6 } },
      "packages/gated": completeConfiguration({
        limits: { maximumBreadth: 5, maximumDepth: 4 },
      }),
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      limitOverrides: { maximumBreadth: 9, maximumDepth: 2 },
      projects: ["packages/gated"],
      service,
      workspaceRoot,
    });

    // The project's own file is still named: an override changes the number
    // for one invocation and does not change where that number was written.
    expect(limits.byProject.get("packages/gated")).toStrictEqual({
      maximumBreadth: 9,
      maximumDepth: 2,
      path: path.join(
        workspaceRoot,
        "packages",
        "gated",
        CONFIGURATION_FILE_NAME,
      ),
    });
  });

  it("leaves a project that declared no breadth limit without one", async () => {
    // The precedence rule where it is actually enforced: a flag overrides what
    // a project chose and never chooses for a project that chose nothing, so
    // `--maximum-breadth` cannot gate a project that opted out of breadth.
    const workspaceRoot = await writeWorkspace({
      ".": { limits: { maximumDepth: 6 } },
      "packages/unbounded": completeConfiguration({
        limits: { maximumBreadth: undefined, maximumDepth: 4 },
      }),
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      limitOverrides: { maximumBreadth: 9 },
      projects: ["packages/unbounded"],
      service,
      workspaceRoot,
    });

    expect(
      limits.byProject.get("packages/unbounded")?.maximumBreadth,
    ).toBeUndefined();
  });

  // 📏 Limits resolved per project

  it("names the project's own file as the source of both its limits", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": { limits: { maximumDepth: 17 } },
      "packages/gated": completeConfiguration({
        limits: { maximumBreadth: 5, maximumDepth: 4 },
      }),
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      projects: ["packages/gated"],
      service,
      workspaceRoot,
    });

    expect(limits.byProject.get("packages/gated")).toStrictEqual({
      maximumBreadth: 5,
      maximumDepth: 4,
      path: path.join(
        workspaceRoot,
        "packages",
        "gated",
        CONFIGURATION_FILE_NAME,
      ),
    });
  });

  it("keeps a limit higher than the workspace's rather than clamping it", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": { limits: { maximumDepth: 6 } },
      "packages/deep": completeConfiguration({
        limits: { maximumBreadth: undefined, maximumDepth: 12 },
      }),
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      projects: ["packages/deep"],
      service,
      workspaceRoot,
    });

    expect(limits.byProject.get("packages/deep")?.maximumDepth).toBe(12);
  });

  it("never lets a project take the workspace's breadth limit", async () => {
    // The one thing per-field fallback used to do that nothing does now: a
    // project writing `maximumBreadth: undefined` gates no breadth, whatever
    // the workspace declares, because its file is the whole statement.
    const workspaceRoot = await writeWorkspace({
      ".": {
        limits: { maximumBreadth: 9, maximumDepth: 17 },
      },
      "packages/gated": completeConfiguration({
        limits: { maximumBreadth: undefined, maximumDepth: 4 },
      }),
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      projects: ["packages/gated"],
      service,
      workspaceRoot,
    });

    expect(
      limits.byProject.get("packages/gated")?.maximumBreadth,
    ).toBeUndefined();
  });

  it("hands the project holding the run's own configuration the workspace's limits", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": { limits: { maximumDepth: 17 } },
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      projects: [""],
      service,
      workspaceRoot,
    });

    expect(limits.byProject.get("")).toStrictEqual({
      maximumBreadth: undefined,
      maximumDepth: 17,
      path: path.join(workspaceRoot, CONFIGURATION_FILE_NAME),
    });
  });

  // The other half of the same rule: a number resolution manufactured is still
  // the number that project is judged against, and still belongs to no file.
  // Naming one would tell a reader to go and change a line nobody wrote.
  it("names no file for a limit the workspace file never wrote", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": { exclude: ["**/generated/**"] },
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      projects: [""],
      service,
      workspaceRoot,
    });

    expect(limits.workspace).toStrictEqual({
      maximumBreadth: undefined,
      maximumDepth: DEFAULT_MAXIMUM_DEPTH,
      path: undefined,
    });
  });

  it("names every project the run reached", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": { limits: { maximumDepth: 17 } },
      "packages/gated": completeConfiguration({
        limits: { maximumBreadth: undefined, maximumDepth: 4 },
      }),
      "packages/plain": completeConfiguration(),
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      projects: ["packages/gated", "packages/plain"],
      service,
      workspaceRoot,
    });

    expect([...limits.byProject.keys()]).toStrictEqual([
      "packages/gated",
      "packages/plain",
    ]);
    expect(limits.workspace.maximumDepth).toBe(17);
  });
});
