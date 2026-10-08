import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConfigurationService } from "@codependix/configuration";
import { TypescriptService } from "@codependix/file-imports";
import {
  ModuleGraphService,
  NestjsProjectService,
} from "@codependix/nestjs-modules";
import { NeighborhoodService } from "@codependix/nx-projects";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AnchorsService } from "../anchors/anchors.service";
import { DeliveryService } from "../delivery/delivery.service";

import { ProjectGraphsService } from "./project-graphs.service";

import type { GraphRunContext } from "@codependix/boundaries";
import type {
  TypescriptImportGraph,
  TypescriptProjectProgram,
} from "@codependix/file-imports";
import type { NestjsModuleGraph } from "@codependix/nestjs-modules";
import type { Neighborhood } from "@codependix/nx-projects";

const NEIGHBORHOOD: Neighborhood = {
  dependencies: ["logger"],
  dependents: [],
  edges: [{ implicit: false, source: "codependix-nx", target: "logger" }],
  projectName: "codependix-nx",
};

const MODULE_GRAPH: NestjsModuleGraph = {
  ambientModuleNames: [],
  edges: [{ source: "MainModule", target: "LoggerModule" }],
  isolatedModuleNames: [],
  nodes: [
    { declaringFile: "src/logger.module.ts", name: "LoggerModule" },
    { declaringFile: "src/main.module.ts", name: "MainModule" },
  ],
  projectName: "codependix-cli",
};

const TYPESCRIPT_IMPORT_GRAPH: TypescriptImportGraph = {
  edges: [{ source: "src/index.ts", target: "src/helper.ts" }],
  fileNames: ["src/helper.ts", "src/index.ts"],
  isolatedFileNames: [],
  projectName: "codependix-imports",
};

describe(ProjectGraphsService, () => {
  let service: ProjectGraphsService;
  let configurationService: ConfigurationService;
  let moduleGraphService: ModuleGraphService;
  let neighborhoodService: NeighborhoodService;
  let nestjsProjectService: NestjsProjectService;
  let typescriptService: TypescriptService;
  let projectRoot: string;

  /**
   * Builds a `GraphRunContext` a test can override selected fields of.
   *
   * `selectedProjects` follows `projects` unless a test overrides it, which
   * is what a run naming no `--projects`/`--tags` selection resolves to.
   */
  function buildContext(
    overrides: Partial<GraphRunContext> = {},
  ): GraphRunContext {
    const projects = overrides.projects ?? [
      { absoluteRoot: projectRoot, name: "codependix-nx", tags: [] },
    ];

    return {
      configuration: {
        boundaries: {
          fileImports: { python: [], typescript: [] },
          nestjsModules: [],
          nxProjects: [],
        },
        exclude: [],
        include: ["**"],
        projectGraph: undefined,
        selection: { projects: [], tags: [] },
        workspace: {},
      },
      enabledGraphTypes: new Set([
        "fileImports",
        "nestjsModules",
        "nxProjects",
      ]),
      graph: { dependencies: {}, nodes: {} },
      mode: "write",
      projectConfigurations: new Map(),
      projects,
      selectedProjects: projects,
      workingDirectory: projectRoot,
      ...overrides,
    };
  }

  beforeAll(async () => {
    configurationService = createMock<ConfigurationService>();
    moduleGraphService = createMock<ModuleGraphService>();
    neighborhoodService = createMock<NeighborhoodService>();
    nestjsProjectService = createMock<NestjsProjectService>();
    typescriptService = createMock<TypescriptService>();

    const module = await Test.createTestingModule({
      providers: [
        AnchorsService,
        ProjectGraphsService,
        DeliveryService,
        {
          provide: ConfigurationService,
          useValue: configurationService,
        },
        { provide: ModuleGraphService, useValue: moduleGraphService },
        { provide: NeighborhoodService, useValue: neighborhoodService },
        { provide: NestjsProjectService, useValue: nestjsProjectService },
        { provide: TypescriptService, useValue: typescriptService },
      ],
    }).compile();

    service = await module.resolve(ProjectGraphsService);
  });

  beforeEach(async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "project-graphs-service-"));

    vi.mocked(neighborhoodService.renderMermaid).mockReturnValue(
      "```mermaid\ngraph LR\n```",
    );
    vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: projectRoot,
        name: "codependix-cli",
        rootModuleFile: undefined,
      },
    ]);
    vi.mocked(nestjsProjectService.exploreProject).mockResolvedValue([]);
    vi.mocked(moduleGraphService.buildGraph).mockReturnValue(MODULE_GRAPH);
    vi.mocked(moduleGraphService.renderMermaid).mockReturnValue(
      "```mermaid\nflowchart LR\n```",
    );
    vi.mocked(typescriptService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: projectRoot,
        name: "codependix-imports",
        tsconfigPath: path.join(projectRoot, "tsconfig.json"),
      },
    ]);
    vi.mocked(typescriptService.buildProgram).mockReturnValue(
      createMock<TypescriptProjectProgram>(),
    );
    vi.mocked(typescriptService.buildGraph).mockReturnValue(
      TYPESCRIPT_IMPORT_GRAPH,
    );
    vi.mocked(typescriptService.renderMermaid).mockReturnValue(
      "```mermaid\ngraph LR\n```",
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("runNxProjectsGraphs", () => {
    /** Neighborhoods built for the one fixture project. */
    function neighborhoods(): Map<string, Neighborhood> {
      return new Map([["codependix-nx", NEIGHBORHOOD]]);
    }

    it("skips a project whose resolved target is none", () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: undefined,
        target: "none",
      });

      const outcome = service.runNxProjectsGraphs({
        context: buildContext(),
        neighborhoods: neighborhoods(),
      });

      expect(outcome).toStrictEqual({ failures: [], results: [] });
    });

    it("writes a project's JSON export", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-nx.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = service.runNxProjectsGraphs({
        context: buildContext(),
        neighborhoods: neighborhoods(),
      });

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "codependix-nx",
            staleExports: [],
            stalePaths: [],
          },
        ],
      });

      const written = JSON.parse(
        await readFile(path.join(projectRoot, "codependix-nx.json"), "utf8"),
      ) as unknown;

      expect(written).toStrictEqual({
        dependencies: ["logger"],
        dependents: [],
        edges: [{ implicit: false, source: "codependix-nx", target: "logger" }],
        projectName: "codependix-nx",
      });
    });

    it("reports a missing JSON export as stale in check mode", () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-nx.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = service.runNxProjectsGraphs({
        context: buildContext({ mode: "check" }),
        neighborhoods: neighborhoods(),
      });

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          {
            isCurrent: false,
            projectName: "codependix-nx",
            staleExports: [
              {
                anchor: undefined,
                difference: "graph",
                path: "codependix-nx.json",
              },
            ],
            stalePaths: ["codependix-nx.json"],
          },
        ],
      });
    });

    it("splices a diagram into an existing anchor block", async () => {
      const readmePath = path.join(projectRoot, "README.md");

      await writeFile(
        readmePath,
        [
          "# codependix-nx",
          '<!-- codependix:start name="nx" -->',
          "stale",
          '<!-- codependix:end name="nx" -->',
        ].join("\n"),
        "utf8",
      );
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: { anchor: "nx", path: "README.md" },
        target: "markdown",
      });

      const outcome = service.runNxProjectsGraphs({
        context: buildContext(),
        neighborhoods: neighborhoods(),
      });

      expect(outcome.results[0]?.isCurrent).toBe(true);

      const written = await readFile(readmePath, "utf8");

      expect(written).toContain("```mermaid\ngraph LR\n```");
      expect(written).not.toContain("stale");
    });

    it("records a project's failure as opposed to raising, and still processes the rest", async () => {
      const otherProjectRoot = path.join(projectRoot, "other-project");

      await mkdir(otherProjectRoot, { recursive: true });
      // No README.md is written for `codependix-nx`'s root here, on purpose:
      // a missing anchor in a file that exists now auto-creates the section
      // rather than failing, so the file itself must be absent to still
      // exercise a hard failure — see `AnchorNotFoundError`'s updated JSDoc.
      const twoNeighborhoods = new Map([
        ["codependix-nx", NEIGHBORHOOD],
        ["other-project", { ...NEIGHBORHOOD, projectName: "other-project" }],
      ]);

      vi.mocked(configurationService.resolveForProject).mockImplementation(
        ({ projectName }) =>
          projectName === "codependix-nx"
            ? {
                json: undefined,
                markdown: { anchor: "nx", path: "README.md" },
                target: "markdown",
              }
            : {
                json: { path: "other-project.json" },
                markdown: undefined,
                target: "json",
              },
      );

      const outcome = service.runNxProjectsGraphs({
        context: buildContext({
          projects: [
            { absoluteRoot: projectRoot, name: "codependix-nx", tags: [] },
            { absoluteRoot: otherProjectRoot, name: "other-project", tags: [] },
          ],
        }),
        neighborhoods: twoNeighborhoods,
      });

      expect(outcome.failures).toStrictEqual([
        {
          error: expect.stringContaining('Anchor "nx" not found') as string,
          projectName: "codependix-nx",
        },
      ]);
      expect(outcome.results).toStrictEqual([
        {
          isCurrent: true,
          projectName: "other-project",
          staleExports: [],
          stalePaths: [],
        },
      ]);

      const written = JSON.parse(
        await readFile(
          path.join(otherProjectRoot, "other-project.json"),
          "utf8",
        ),
      ) as unknown;

      expect(written).toMatchObject({ projectName: "other-project" });
    });
  });

  describe("runNestjsModulesProjects", () => {
    /** Builds a context whose one project is `codependix-cli`. */
    function buildNestjsContext(
      overrides: Partial<GraphRunContext> = {},
    ): GraphRunContext {
      return buildContext({
        projects: [
          { absoluteRoot: projectRoot, name: "codependix-cli", tags: [] },
        ],
        ...overrides,
      });
    }

    it("skips a project whose resolved target is none", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: undefined,
        target: "none",
      });

      const outcome =
        await service.runNestjsModulesProjects(buildNestjsContext());

      expect(outcome).toStrictEqual({ failures: [], results: [] });
    });

    it("explores only the discovered nestjs projects", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-cli.json" },
        markdown: undefined,
        target: "json",
      });

      await service.runNestjsModulesProjects(buildNestjsContext());

      expect(nestjsProjectService.exploreProject).toHaveBeenCalledWith({
        absoluteRoot: projectRoot,
        name: "codependix-cli",
        rootModuleFile: undefined,
      });
    });

    it("writes a project's JSON export", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-cli.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome =
        await service.runNestjsModulesProjects(buildNestjsContext());

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "codependix-cli",
            staleExports: [],
            stalePaths: [],
          },
        ],
      });

      const written = JSON.parse(
        await readFile(path.join(projectRoot, "codependix-cli.json"), "utf8"),
      ) as unknown;

      expect(written).toStrictEqual(MODULE_GRAPH);
    });

    it("reports a missing JSON export as stale in check mode", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-cli.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = await service.runNestjsModulesProjects(
        buildNestjsContext({ mode: "check" }),
      );

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          {
            isCurrent: false,
            projectName: "codependix-cli",
            staleExports: [
              {
                anchor: undefined,
                difference: "graph",
                path: "codependix-cli.json",
              },
            ],
            stalePaths: ["codependix-cli.json"],
          },
        ],
      });
    });

    it("splices a diagram into an existing anchor block", async () => {
      const readmePath = path.join(projectRoot, "README.md");

      await writeFile(
        readmePath,
        [
          "# codependix-cli",
          '<!-- codependix:start name="nestjs" -->',
          "stale",
          '<!-- codependix:end name="nestjs" -->',
        ].join("\n"),
        "utf8",
      );
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: { anchor: "nestjs", path: "README.md" },
        target: "markdown",
      });

      const outcome =
        await service.runNestjsModulesProjects(buildNestjsContext());

      expect(outcome.results[0]?.isCurrent).toBe(true);

      const written = await readFile(readmePath, "utf8");

      expect(written).toContain("```mermaid\nflowchart LR\n```");
      expect(written).not.toContain("stale");
    });

    it("writes both a JSON and a markdown export for a both target", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-cli.json" },
        markdown: { anchor: undefined, path: "module-graph.md" },
        target: "both",
      });

      await service.runNestjsModulesProjects(buildNestjsContext());

      await expect(
        readFile(path.join(projectRoot, "codependix-cli.json"), "utf8"),
      ).resolves.toContain("codependix-cli");
      await expect(
        readFile(path.join(projectRoot, "module-graph.md"), "utf8"),
      ).resolves.toContain("mermaid");
    });

    it("records a project's failure without preventing other projects from being processed", async () => {
      const otherProjectRoot = path.join(projectRoot, "other-nestjs-project");

      await mkdir(otherProjectRoot, { recursive: true });
      vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([
        {
          absoluteRoot: projectRoot,
          name: "codependix-cli",
          rootModuleFile: undefined,
        },
        {
          absoluteRoot: otherProjectRoot,
          name: "other-nestjs-project",
          rootModuleFile: undefined,
        },
      ]);
      vi.mocked(nestjsProjectService.exploreProject).mockImplementation(
        async (project) =>
          project.name === "codependix-cli"
            ? Promise.reject(new Error("failed to boot container"))
            : Promise.resolve([]),
      );
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "graph.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = await service.runNestjsModulesProjects(
        buildNestjsContext({
          projects: [
            { absoluteRoot: projectRoot, name: "codependix-cli", tags: [] },
            {
              absoluteRoot: otherProjectRoot,
              name: "other-nestjs-project",
              tags: [],
            },
          ],
        }),
      );

      expect(outcome.failures).toStrictEqual([
        {
          error: "failed to boot container",
          projectName: "codependix-cli",
        },
      ]);
      expect(outcome.results).toStrictEqual([
        {
          isCurrent: true,
          projectName: "other-nestjs-project",
          staleExports: [],
          stalePaths: [],
        },
      ]);
    });
  });

  describe("runFileImportsProjects", () => {
    /** Builds a context whose one project is `codependix-imports`. */
    function buildImportsContext(
      overrides: Partial<GraphRunContext> = {},
    ): GraphRunContext {
      return buildContext({
        projects: [
          { absoluteRoot: projectRoot, name: "codependix-imports", tags: [] },
        ],
        ...overrides,
      });
    }

    it("skips a project whose resolved target is none", () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: undefined,
        target: "none",
      });

      const outcome = service.runFileImportsProjects(buildImportsContext());

      expect(outcome).toStrictEqual({ failures: [], results: [] });
    });

    it("builds a program only for the discovered typescript projects", () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-imports.json" },
        markdown: undefined,
        target: "json",
      });

      service.runFileImportsProjects(buildImportsContext());

      expect(typescriptService.buildProgram).toHaveBeenCalledWith({
        absoluteRoot: projectRoot,
        name: "codependix-imports",
        tsconfigPath: path.join(projectRoot, "tsconfig.json"),
      });
    });

    it("writes a project's JSON export", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-imports.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = service.runFileImportsProjects(buildImportsContext());

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "codependix-imports",
            staleExports: [],
            stalePaths: [],
          },
        ],
      });

      const written = JSON.parse(
        await readFile(
          path.join(projectRoot, "codependix-imports.json"),
          "utf8",
        ),
      ) as unknown;

      expect(written).toStrictEqual(TYPESCRIPT_IMPORT_GRAPH);
    });

    it("reports a missing JSON export as stale in check mode", () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-imports.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = service.runFileImportsProjects(
        buildImportsContext({ mode: "check" }),
      );

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          {
            isCurrent: false,
            projectName: "codependix-imports",
            staleExports: [
              {
                anchor: undefined,
                difference: "graph",
                path: "codependix-imports.json",
              },
            ],
            stalePaths: ["codependix-imports.json"],
          },
        ],
      });
    });

    it("splices a diagram into an existing anchor block", async () => {
      const readmePath = path.join(projectRoot, "README.md");

      await writeFile(
        readmePath,
        [
          "# codependix-imports",
          '<!-- codependix:start name="imports" -->',
          "stale",
          '<!-- codependix:end name="imports" -->',
        ].join("\n"),
        "utf8",
      );
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: { anchor: "imports", path: "README.md" },
        target: "markdown",
      });

      const outcome = service.runFileImportsProjects(buildImportsContext());

      expect(outcome.results[0]?.isCurrent).toBe(true);

      const written = await readFile(readmePath, "utf8");

      expect(written).toContain("```mermaid\ngraph LR\n```");
      expect(written).not.toContain("stale");
    });

    it("writes both a JSON and a markdown export for a both target", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-imports.json" },
        markdown: { anchor: undefined, path: "import-graph.md" },
        target: "both",
      });

      service.runFileImportsProjects(buildImportsContext());

      await expect(
        readFile(path.join(projectRoot, "codependix-imports.json"), "utf8"),
      ).resolves.toContain("codependix-imports");
      await expect(
        readFile(path.join(projectRoot, "import-graph.md"), "utf8"),
      ).resolves.toContain("mermaid");
    });

    it("records a project's failure without preventing other projects from being processed", async () => {
      const otherProjectRoot = path.join(projectRoot, "other-imports-project");

      await mkdir(otherProjectRoot, { recursive: true });
      vi.mocked(typescriptService.discoverProjects).mockReturnValue([
        {
          absoluteRoot: projectRoot,
          name: "codependix-imports",
          tsconfigPath: path.join(projectRoot, "tsconfig.json"),
        },
        {
          absoluteRoot: otherProjectRoot,
          name: "other-imports-project",
          tsconfigPath: path.join(otherProjectRoot, "tsconfig.json"),
        },
      ]);
      vi.mocked(typescriptService.buildProgram).mockImplementation(
        (project) => {
          if (project.name === "codependix-imports") {
            throw new Error("failed to build program");
          }

          return createMock<TypescriptProjectProgram>();
        },
      );
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "graph.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = service.runFileImportsProjects(
        buildImportsContext({
          projects: [
            { absoluteRoot: projectRoot, name: "codependix-imports", tags: [] },
            {
              absoluteRoot: otherProjectRoot,
              name: "other-imports-project",
              tags: [],
            },
          ],
        }),
      );

      expect(outcome.failures).toStrictEqual([
        {
          error: "failed to build program",
          projectName: "codependix-imports",
        },
      ]);
      expect(outcome.results).toStrictEqual([
        {
          isCurrent: true,
          projectName: "other-imports-project",
          staleExports: [],
          stalePaths: [],
        },
      ]);
    });

    it("records a non-Error rejection as its string form", () => {
      const nonErrorFailure: unknown = "boom";

      vi.mocked(typescriptService.buildProgram).mockImplementation(() => {
        throw nonErrorFailure;
      });
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-imports.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = service.runFileImportsProjects(buildImportsContext());

      expect(outcome.failures).toStrictEqual([
        { error: "boom", projectName: "codependix-imports" },
      ]);
    });
  });
});
