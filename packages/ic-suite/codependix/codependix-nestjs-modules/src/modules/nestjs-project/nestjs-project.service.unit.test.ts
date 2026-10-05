import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { ModulesContainer, NestFactory } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { MainModule } from "../../../testing/main.module";

import { NestjsProjectService } from "./nestjs-project.service";

import type { NestjsProject } from "./nestjs-project.types";
import type { INestApplicationContext } from "@nestjs/common";

/** Paths the mocked workspace reports as existing. */
const existingPaths = new Set<string>();

/** Entries the mocked workspace reports beneath a directory, by basename. */
const workspaceEntries = new Map<string, string[]>();

/** Entry names the mocked workspace reports as files rather than directories. */
const workspaceFileEntries = new Set<string>();

/** The part of a NestJS `Module` the explorer reads. */
interface ContainerModule {
  readonly imports: Set<ContainerModule>;
  readonly name: string;
}

/**
 * Modules the mocked container holds, in registration order, each with the
 * names of the modules it imports.
 */
let containerModules: [name: string, imports: string[]][] = [];

/** Root modules the mocked container was built from, in call order. */
const exploredRootModules: unknown[] = [];

vi.mock("node:fs", async (importOriginal) => {
  const importedModule = await importOriginal();
  const module =
    typeof importedModule === "object" && importedModule !== null
      ? importedModule
      : {};

  return {
    ...module,
    existsSync: vi.fn<(target: string) => boolean>((target: string) =>
      existingPaths.has(target),
    ),
    readdirSync: vi.fn<
      (target: string) => { isDirectory: () => boolean; name: string }[]
    >((target: string) =>
      (workspaceEntries.get(path.basename(target)) ?? []).map((name) => ({
        isDirectory: () => !workspaceFileEntries.has(name),
        name,
      })),
    ),
  };
});

/** Builds a project graph node with the given tags. */
/** One discovered project, as `codependix-nx-projects` hands it over. */
function buildTaggedProject(
  name: string,
  tags: string[],
): { absoluteRoot: string; name: string; tags: string[] } {
  return { absoluteRoot: `/workspace/packages/${name}`, name, tags };
}

describe(NestjsProjectService, () => {
  let logger: LoggerService;
  let service: NestjsProjectService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NestjsProjectService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    logger = await module.resolve(LoggerService);
    service = await module.resolve(NestjsProjectService);
  });

  beforeEach(() => {
    existingPaths.clear();
    workspaceEntries.clear();
    workspaceFileEntries.clear();
    containerModules = [];
    exploredRootModules.length = 0;
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        NestjsProjectService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    const localLogger = await module.resolve(LoggerService);

    expect(localLogger.setContext).toHaveBeenCalledWith("NestjsProjectService");
  });

  describe("isNestjsProject", () => {
    it("reports true when a project's tags include framework:nestjs", () => {
      expect(
        service.isNestjsProject(
          buildTaggedProject("caelundas", ["framework:nestjs"]),
        ),
      ).toBe(true);
    });

    it("reports false when a project's tags do not include framework:nestjs", () => {
      expect(
        service.isNestjsProject(
          buildTaggedProject("lexico", ["framework:react"]),
        ),
      ).toBe(false);
    });

    it("reports false for a project carrying no tags at all", () => {
      expect(service.isNestjsProject(buildTaggedProject("unknown", []))).toBe(
        false,
      );
    });
  });

  describe("describeProject", () => {
    it("records the root module file of a project that bootstraps one", () => {
      const absoluteRoot = "/workspace/applications/caelundas";
      existingPaths.add(path.join(absoluteRoot, "src/main.module.ts"));

      expect(service.describeProject(absoluteRoot, "caelundas")).toStrictEqual({
        absoluteRoot,
        name: "caelundas",
        rootModuleFile: path.join(absoluteRoot, "src/main.module.ts"),
      });
    });

    it("leaves the root module file undefined for a library package", () => {
      expect(
        service.describeProject("/workspace/packages/logging", "logger")
          .rootModuleFile,
      ).toBeUndefined();
    });
  });

  describe("discoverProjects", () => {
    it("keeps only the projects tagged framework:nestjs", () => {
      const discovered = service.discoverProjects([
        {
          absoluteRoot: "/workspace/applications/caelundas",
          name: "caelundas",
          tags: ["framework:nestjs"],
        },
        {
          absoluteRoot: "/workspace/applications/lexico",
          name: "lexico",
          tags: ["framework:react"],
        },
      ]);

      expect(discovered.map((project) => project.name)).toStrictEqual([
        "caelundas",
      ]);
    });

    it("describes each discovered project", () => {
      const discovered = service.discoverProjects([
        {
          absoluteRoot: "/workspace/packages/logging",
          name: "logger",
          tags: ["framework:nestjs"],
        },
      ]);

      expect(discovered).toStrictEqual([
        {
          absoluteRoot: "/workspace/packages/logging",
          name: "logger",
          rootModuleFile: undefined,
        },
      ]);
    });
  });

  describe("exploreProject", () => {
    /** Points at this project so the dynamic import resolves. */
    function buildProject(rootModuleFile: string | undefined): NestjsProject {
      return {
        absoluteRoot: process.cwd(),
        name: "codependix-nestjs-modules",
        rootModuleFile:
          rootModuleFile === undefined
            ? undefined
            : path.join(process.cwd(), rootModuleFile),
      };
    }

    /**
     * Builds the `ModulesContainer` the mocked container hands out, linking
     * each module to the ones it imports the way NestJS does: by reference.
     */
    function buildModulesContainer(): Map<string, ContainerModule> {
      const modules = new Map<string, ContainerModule>(
        containerModules.map(([name]) => [name, { imports: new Set(), name }]),
      );

      for (const [name, imports] of containerModules) {
        for (const importedName of imports) {
          const importedModule = modules.get(importedName);

          if (importedModule !== undefined) {
            modules.get(name)?.imports.add(importedModule);
          }
        }
      }

      return modules;
    }

    /** Records the root module the container was asked to build. */
    function mockApplicationContext(): void {
      vi.spyOn(NestFactory, "createApplicationContext").mockImplementation(
        async (rootModule: unknown): Promise<INestApplicationContext> => {
          await Promise.resolve();
          exploredRootModules.push(rootModule);

          return createMock<INestApplicationContext>({
            get: vi.fn<(token: unknown) => Map<string, ContainerModule>>(
              (token: unknown) => {
                expect(token).toBe(ModulesContainer);

                return buildModulesContainer();
              },
            ),
          });
        },
      );
    }

    it("explores the root module a project exports", async () => {
      mockApplicationContext();
      containerModules = [["MainModule", []]];

      const tree = await service.exploreProject(
        buildProject("testing/main.module.ts"),
      );

      expect(tree).toStrictEqual([
        {
          declaringFile: "testing/main.module.ts",
          imports: [],
          name: "MainModule",
        },
      ]);
      expect(exploredRootModules[0]).toBe(MainModule);
      expect(exploredRootModules[0]).toHaveProperty("name", "MainModule");
    });

    it("logs before closing the project's container", async () => {
      mockApplicationContext();

      await service.exploreProject(buildProject("testing/main.module.ts"));

      expect(logger.debug).toHaveBeenCalledWith(
        "🚀 Booted a project's container",
        undefined,
        { project: "codependix-nestjs-modules" },
      );
    });

    it("builds the container in preview mode so nothing is instantiated", async () => {
      mockApplicationContext();

      await service.exploreProject(buildProject("testing/main.module.ts"));

      expect(NestFactory.createApplicationContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ preview: true }),
      );
    });

    it("rejects a root module file that exports no MainModule", async () => {
      mockApplicationContext();

      await expect(
        service.exploreProject(
          buildProject("src/modules/module-graph/module-graph.module.ts"),
        ),
      ).rejects.toThrow("MainModule");
    });

    /**
     * Mirrors this project's own `module-graph` module folder so the module
     * files the walk finds are real, and the dynamic import that follows
     * resolves.
     */
    function mockPackageTree(): void {
      existingPaths.add(path.join(process.cwd(), "src"));
      existingPaths.add(path.join(process.cwd(), "src/modules"));
      existingPaths.add(path.join(process.cwd(), "src/modules/module-graph"));
      workspaceEntries.set("src", ["modules"]);
      workspaceEntries.set("modules", ["module-graph"]);
      workspaceEntries.set("module-graph", [
        "module-graph.service.ts",
        "module-graph.module.ts",
      ]);
      workspaceFileEntries.add("module-graph.service.ts");
      workspaceFileEntries.add("module-graph.module.ts");
    }

    it("attaches declaring files to explored library modules", async () => {
      mockApplicationContext();
      mockPackageTree();
      containerModules = [["ModuleGraphModule", []]];

      const tree = await service.exploreProject(buildProject(undefined));

      expect(tree).toStrictEqual([
        {
          declaringFile: "src/modules/module-graph/module-graph.module.ts",
          imports: [],
          name: "ModuleGraphModule",
        },
      ]);
    });

    it("roots a library package in a synthetic module built from its own", async () => {
      mockApplicationContext();
      mockPackageTree();

      await service.exploreProject(buildProject(undefined));

      expect(exploredRootModules[0]).toHaveProperty(
        "module.name",
        "SyntheticRootModule",
      );
    });

    it("imports every module the package defines into the synthetic root", async () => {
      mockApplicationContext();
      mockPackageTree();

      await service.exploreProject(buildProject(undefined));

      // The config scaffolding is imported first, then the package's own.
      expect(exploredRootModules[0]).toHaveProperty(
        "imports.1.name",
        "ModuleGraphModule",
      );
    });

    it("keeps the synthetic root's config scaffolding out of the graph", async () => {
      mockApplicationContext();
      existingPaths.add(path.join(process.cwd(), "src"));
      workspaceEntries.set("src", []);
      containerModules = [
        ["SyntheticRootModule", ["ConfigModule"]],
        ["ConfigModule", []],
      ];

      const tree = await service.exploreProject(buildProject(undefined));

      expect(tree).toStrictEqual([]);
    });

    it("finds no modules in a package with no source directory", async () => {
      mockApplicationContext();

      await service.exploreProject(buildProject(undefined));

      expect(exploredRootModules[0]).toHaveProperty(
        "module.name",
        "SyntheticRootModule",
      );
      expect(exploredRootModules[0]).not.toHaveProperty("imports.1");
    });

    it("leaves ConfigModule in the graph of a project that declares it", async () => {
      mockApplicationContext();
      containerModules = [
        ["MainModule", ["ConfigModule"]],
        ["ConfigModule", []],
      ];

      const tree = await service.exploreProject(
        buildProject("testing/main.module.ts"),
      );

      expect(tree.map((node) => node.name)).toStrictEqual([
        "MainModule",
        "ConfigModule",
      ]);
    });

    it("reports each module's imports by name, in the container's order", async () => {
      mockApplicationContext();
      containerModules = [
        ["MainModule", ["LeafModule", "SharedModule"]],
        ["LeafModule", ["SharedModule"]],
        ["SharedModule", []],
      ];

      const tree = await service.exploreProject(
        buildProject("testing/main.module.ts"),
      );

      expect(
        tree.map((node) => ({ imports: node.imports, name: node.name })),
      ).toStrictEqual([
        { imports: ["LeafModule", "SharedModule"], name: "MainModule" },
        { imports: ["SharedModule"], name: "LeafModule" },
        { imports: [], name: "SharedModule" },
      ]);
    });

    it("leaves NestJS's own InternalCoreModule out of the graph and its imports", async () => {
      mockApplicationContext();
      containerModules = [
        ["InternalCoreModule", []],
        ["MainModule", ["InternalCoreModule"]],
      ];

      const tree = await service.exploreProject(
        buildProject("testing/main.module.ts"),
      );

      expect(tree).toStrictEqual([
        {
          declaringFile: "testing/main.module.ts",
          imports: [],
          name: "MainModule",
        },
      ]);
    });

    it("leaves an ignored module out of every other module's imports", async () => {
      mockApplicationContext();
      containerModules = [
        ["MainModule", ["ConfigHostModule", "LeafModule"]],
        ["ConfigHostModule", []],
        ["LeafModule", []],
      ];

      const tree = await service.exploreProject(
        buildProject("testing/main.module.ts"),
      );

      expect(tree.map((node) => node.name)).toStrictEqual([
        "MainModule",
        "LeafModule",
      ]);
      expect(tree[0]?.imports).toStrictEqual(["LeafModule"]);
    });
  });
});
