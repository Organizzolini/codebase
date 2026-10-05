import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConfigurationService } from "@codependix/configuration";
import {
  FileImportsWorkspaceGraphService,
  PythonService,
  TypescriptService,
} from "@codependix/file-imports";
import {
  ModuleGraphService,
  NestjsModulesWorkspaceGraphService,
  NestjsProjectService,
} from "@codependix/nestjs-modules";
import { WorkspaceGraphService } from "@codependix/nx-projects";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AnchorsService } from "../anchors/anchors.service";
import { DeliveryService } from "../delivery/delivery.service";
import {
  FILE_IMPORTS_GRAPH_TYPE,
  NESTJS_MODULES_GRAPH_TYPE,
  NX_PROJECTS_GRAPH_TYPE,
} from "../graph-run/graph-run.constants";

import { WorkspaceGraphsService } from "./workspace-graphs.service";

import type { GraphRunContext } from "@codependix/boundaries";
import type { TypescriptProjectProgram } from "@codependix/file-imports";

describe(WorkspaceGraphsService, () => {
  let service: WorkspaceGraphsService;
  let configurationService: ConfigurationService;
  let fileImportsWorkspaceGraphService: FileImportsWorkspaceGraphService;
  let moduleGraphService: ModuleGraphService;
  let nestjsModulesWorkspaceGraphService: NestjsModulesWorkspaceGraphService;
  let nestjsProjectService: NestjsProjectService;
  let pythonService: PythonService;
  let typescriptService: TypescriptService;
  let workspaceGraphService: WorkspaceGraphService;
  let projectRoot: string;

  /** Builds a `GraphRunContext` a test can override selected fields of. */
  function buildContext(
    overrides: Partial<GraphRunContext> = {},
  ): GraphRunContext {
    const projects = overrides.projects ?? [
      { absoluteRoot: projectRoot, name: "codebase", tags: [] },
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
        FILE_IMPORTS_GRAPH_TYPE,
        NESTJS_MODULES_GRAPH_TYPE,
        NX_PROJECTS_GRAPH_TYPE,
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
    fileImportsWorkspaceGraphService =
      createMock<FileImportsWorkspaceGraphService>();
    moduleGraphService = createMock<ModuleGraphService>();
    nestjsModulesWorkspaceGraphService =
      createMock<NestjsModulesWorkspaceGraphService>();
    nestjsProjectService = createMock<NestjsProjectService>();
    pythonService = createMock<PythonService>();
    typescriptService = createMock<TypescriptService>();
    workspaceGraphService = createMock<WorkspaceGraphService>();

    const module = await Test.createTestingModule({
      providers: [
        AnchorsService,
        DeliveryService,
        WorkspaceGraphsService,
        {
          provide: ConfigurationService,
          useValue: configurationService,
        },
        {
          provide: FileImportsWorkspaceGraphService,
          useValue: fileImportsWorkspaceGraphService,
        },
        { provide: ModuleGraphService, useValue: moduleGraphService },
        {
          provide: NestjsModulesWorkspaceGraphService,
          useValue: nestjsModulesWorkspaceGraphService,
        },
        { provide: NestjsProjectService, useValue: nestjsProjectService },
        { provide: PythonService, useValue: pythonService },
        { provide: TypescriptService, useValue: typescriptService },
        { provide: WorkspaceGraphService, useValue: workspaceGraphService },
      ],
    }).compile();

    service = await module.resolve(WorkspaceGraphsService);
  });

  beforeEach(async () => {
    projectRoot = await mkdtemp(
      path.join(tmpdir(), "workspace-graphs-service-"),
    );

    vi.mocked(typescriptService.discoverProjects).mockReturnValue([]);
    vi.mocked(typescriptService.buildProgram).mockReturnValue(
      createMock<TypescriptProjectProgram>(),
    );
    vi.mocked(pythonService.discoverProjects).mockReturnValue([]);
    vi.mocked(
      fileImportsWorkspaceGraphService.buildWorkspaceGraph,
    ).mockReturnValue({ edges: [], fileNames: [] });
    vi.mocked(fileImportsWorkspaceGraphService.renderMermaid).mockReturnValue(
      "```mermaid\ngraph LR\n```",
    );
    vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([]);
    vi.mocked(nestjsProjectService.exploreProject).mockResolvedValue([]);
    vi.mocked(
      nestjsModulesWorkspaceGraphService.buildWorkspaceGraph,
    ).mockReturnValue({ edges: [], moduleNames: [] });
    vi.mocked(nestjsModulesWorkspaceGraphService.renderMermaid).mockReturnValue(
      "```mermaid\ngraph LR\n```",
    );
    vi.mocked(workspaceGraphService.buildWorkspaceGraph).mockReturnValue({
      edges: [],
      projectNames: [],
    });
    vi.mocked(workspaceGraphService.renderMermaid).mockReturnValue(
      "```mermaid\ngraph LR\n```",
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("runFileImportsWorkspaceGraph", () => {
    it("leaves the entry and result undefined when the resolved target is none", () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: undefined,
        markdown: undefined,
        target: "none",
      });

      expect(
        service.runFileImportsWorkspaceGraph(buildContext()),
      ).toStrictEqual({ entry: undefined, result: undefined });
    });

    it("builds the graph over the selected typescript and python projects only", () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace-file-imports.json" },
        markdown: undefined,
        target: "json",
      });

      const selected = [
        { absoluteRoot: projectRoot, name: "logger", tags: [] },
      ];

      service.runFileImportsWorkspaceGraph(
        buildContext({ selectedProjects: selected }),
      );

      expect(typescriptService.discoverProjects).toHaveBeenCalledWith(selected);
      expect(pythonService.discoverProjects).toHaveBeenCalledWith(selected);
    });

    it("builds each discovered typescript and python project's own graph before combining them", () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace-file-imports.json" },
        markdown: undefined,
        target: "json",
      });
      vi.mocked(typescriptService.discoverProjects).mockReturnValue([
        {
          absoluteRoot: projectRoot,
          name: "logger",
          tsconfigPath: path.join(projectRoot, "tsconfig.json"),
        },
      ]);
      vi.mocked(pythonService.discoverProjects).mockReturnValue([
        { absoluteRoot: projectRoot, name: "affirmancy" },
      ]);

      service.runFileImportsWorkspaceGraph(buildContext());

      expect(typescriptService.buildProgram).toHaveBeenCalledWith({
        absoluteRoot: projectRoot,
        name: "logger",
        tsconfigPath: path.join(projectRoot, "tsconfig.json"),
      });
      expect(typescriptService.buildGraph).toHaveBeenCalledWith(
        expect.anything(),
      );
      expect(pythonService.buildGraph).toHaveBeenCalledWith({
        absoluteRoot: projectRoot,
        name: "affirmancy",
      });
    });

    it("returns the graph's own data as a combined-output entry, even for a JSON-only target", () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace-file-imports.json" },
        markdown: undefined,
        target: "json",
      });
      vi.mocked(
        fileImportsWorkspaceGraphService.buildWorkspaceGraph,
      ).mockReturnValue({
        edges: [{ source: "logger/a.ts", target: "logger/b.ts" }],
        fileNames: ["logger/a.ts", "logger/b.ts"],
      });

      const { entry } = service.runFileImportsWorkspaceGraph(buildContext());

      expect(entry).toStrictEqual({
        json: {
          edges: [{ source: "logger/a.ts", target: "logger/b.ts" }],
          fileNames: ["logger/a.ts", "logger/b.ts"],
        },
        markdown: "```mermaid\ngraph LR\n```",
      });
    });

    it("writes the workspace graph's JSON export at the workspace root", async () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace-file-imports.json" },
        markdown: undefined,
        target: "json",
      });
      vi.mocked(
        fileImportsWorkspaceGraphService.buildWorkspaceGraph,
      ).mockReturnValue({
        edges: [{ source: "logger/a.ts", target: "logger/b.ts" }],
        fileNames: ["logger/a.ts", "logger/b.ts"],
      });

      const { result } = service.runFileImportsWorkspaceGraph(buildContext());

      expect(result).toStrictEqual({
        isCurrent: true,
        projectName: "workspace",
        staleExports: [],
        stalePaths: [],
      });

      const written = JSON.parse(
        await readFile(
          path.join(projectRoot, "codependix-workspace-file-imports.json"),
          "utf8",
        ),
      ) as unknown;

      expect(written).toStrictEqual({
        edges: [{ source: "logger/a.ts", target: "logger/b.ts" }],
        fileNames: ["logger/a.ts", "logger/b.ts"],
      });
    });

    it("reports a missing JSON export as stale in check mode", () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace-file-imports.json" },
        markdown: undefined,
        target: "json",
      });

      const { result } = service.runFileImportsWorkspaceGraph(
        buildContext({ mode: "check" }),
      );

      expect(result).toStrictEqual({
        isCurrent: false,
        projectName: "workspace",
        staleExports: [
          {
            anchor: undefined,
            difference: "graph",
            path: "codependix-workspace-file-imports.json",
          },
        ],
        stalePaths: ["codependix-workspace-file-imports.json"],
      });
    });
  });

  describe("runNestjsModulesWorkspaceGraph", () => {
    it("leaves the entry and result undefined when the resolved target is none", async () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: undefined,
        markdown: undefined,
        target: "none",
      });

      await expect(
        service.runNestjsModulesWorkspaceGraph(buildContext()),
      ).resolves.toStrictEqual({ entry: undefined, result: undefined });
    });

    it("explores the selected nestjs projects only", async () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace-nestjs-modules.json" },
        markdown: undefined,
        target: "json",
      });

      const selected = [
        { absoluteRoot: projectRoot, name: "codependix-cli", tags: [] },
      ];

      await service.runNestjsModulesWorkspaceGraph(
        buildContext({ selectedProjects: selected }),
      );

      expect(nestjsProjectService.discoverProjects).toHaveBeenCalledWith(
        selected,
      );
    });

    it("explores and builds each discovered nestjs project's own module graph before combining them", async () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace-nestjs-modules.json" },
        markdown: undefined,
        target: "json",
      });
      vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([
        {
          absoluteRoot: projectRoot,
          name: "codependix-cli",
          rootModuleFile: undefined,
        },
      ]);
      vi.mocked(nestjsProjectService.exploreProject).mockResolvedValue([]);

      await service.runNestjsModulesWorkspaceGraph(buildContext());

      expect(nestjsProjectService.exploreProject).toHaveBeenCalledWith({
        absoluteRoot: projectRoot,
        name: "codependix-cli",
        rootModuleFile: undefined,
      });
      expect(moduleGraphService.buildGraph).toHaveBeenCalledWith(
        [],
        "codependix-cli",
      );
    });

    it("returns the graph's own data as a combined-output entry, even for a JSON-only target", async () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace-nestjs-modules.json" },
        markdown: undefined,
        target: "json",
      });
      vi.mocked(
        nestjsModulesWorkspaceGraphService.buildWorkspaceGraph,
      ).mockReturnValue({
        edges: [
          {
            source: "codependix-cli/MainModule",
            target: "codependix-cli/LoggerModule",
          },
        ],
        moduleNames: [
          "codependix-cli/LoggerModule",
          "codependix-cli/MainModule",
        ],
      });

      const { entry } =
        await service.runNestjsModulesWorkspaceGraph(buildContext());

      expect(entry).toStrictEqual({
        json: {
          edges: [
            {
              source: "codependix-cli/MainModule",
              target: "codependix-cli/LoggerModule",
            },
          ],
          moduleNames: [
            "codependix-cli/LoggerModule",
            "codependix-cli/MainModule",
          ],
        },
        markdown: "```mermaid\ngraph LR\n```",
      });
    });

    it("writes the workspace graph's JSON export at the workspace root", async () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace-nestjs-modules.json" },
        markdown: undefined,
        target: "json",
      });
      vi.mocked(
        nestjsModulesWorkspaceGraphService.buildWorkspaceGraph,
      ).mockReturnValue({
        edges: [
          {
            source: "codependix-cli/MainModule",
            target: "codependix-cli/LoggerModule",
          },
        ],
        moduleNames: [
          "codependix-cli/LoggerModule",
          "codependix-cli/MainModule",
        ],
      });

      const { result } =
        await service.runNestjsModulesWorkspaceGraph(buildContext());

      expect(result).toStrictEqual({
        isCurrent: true,
        projectName: "workspace",
        staleExports: [],
        stalePaths: [],
      });

      const written = JSON.parse(
        await readFile(
          path.join(projectRoot, "codependix-workspace-nestjs-modules.json"),
          "utf8",
        ),
      ) as unknown;

      expect(written).toStrictEqual({
        edges: [
          {
            source: "codependix-cli/MainModule",
            target: "codependix-cli/LoggerModule",
          },
        ],
        moduleNames: [
          "codependix-cli/LoggerModule",
          "codependix-cli/MainModule",
        ],
      });
    });

    it("reports a missing JSON export as stale in check mode", async () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace-nestjs-modules.json" },
        markdown: undefined,
        target: "json",
      });

      const { result } = await service.runNestjsModulesWorkspaceGraph(
        buildContext({ mode: "check" }),
      );

      expect(result).toStrictEqual({
        isCurrent: false,
        projectName: "workspace",
        staleExports: [
          {
            anchor: undefined,
            difference: "graph",
            path: "codependix-workspace-nestjs-modules.json",
          },
        ],
        stalePaths: ["codependix-workspace-nestjs-modules.json"],
      });
    });
  });

  describe("runNxWorkspaceGraph", () => {
    it("leaves the entry and result undefined when the resolved target is none", () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: undefined,
        markdown: undefined,
        target: "none",
      });

      expect(service.runNxWorkspaceGraph(buildContext())).toStrictEqual({
        entry: undefined,
        result: undefined,
      });
    });

    it("draws the workspace graph over the selected projects only", () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace.json" },
        markdown: undefined,
        target: "json",
      });

      const selected = [
        { absoluteRoot: projectRoot, name: "logger", tags: [] },
      ];

      service.runNxWorkspaceGraph(buildContext({ selectedProjects: selected }));

      expect(workspaceGraphService.buildWorkspaceGraph).toHaveBeenCalledWith(
        expect.anything(),
        selected,
      );
    });

    it("returns the graph's own data as a combined-output entry, even for a JSON-only target", () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace.json" },
        markdown: undefined,
        target: "json",
      });
      vi.mocked(workspaceGraphService.buildWorkspaceGraph).mockReturnValue({
        edges: [{ implicit: false, source: "lexico", target: "logger" }],
        projectNames: ["lexico", "logger"],
      });

      const { entry } = service.runNxWorkspaceGraph(buildContext());

      expect(entry).toStrictEqual({
        json: {
          edges: [{ implicit: false, source: "lexico", target: "logger" }],
          projectNames: ["lexico", "logger"],
        },
        markdown: "```mermaid\ngraph LR\n```",
      });
    });

    it("writes the workspace graph's JSON export at the workspace root", async () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace.json" },
        markdown: undefined,
        target: "json",
      });
      vi.mocked(workspaceGraphService.buildWorkspaceGraph).mockReturnValue({
        edges: [{ implicit: false, source: "lexico", target: "logger" }],
        projectNames: ["lexico", "logger"],
      });

      const { result } = service.runNxWorkspaceGraph(buildContext());

      expect(result).toStrictEqual({
        isCurrent: true,
        projectName: "workspace",
        staleExports: [],
        stalePaths: [],
      });

      const written = JSON.parse(
        await readFile(
          path.join(projectRoot, "codependix-workspace.json"),
          "utf8",
        ),
      ) as unknown;

      expect(written).toStrictEqual({
        edges: [{ implicit: false, source: "lexico", target: "logger" }],
        projectNames: ["lexico", "logger"],
      });
    });

    it("reports a missing JSON export as stale in check mode", () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: { path: "codependix-workspace.json" },
        markdown: undefined,
        target: "json",
      });

      const { result } = service.runNxWorkspaceGraph(
        buildContext({ mode: "check" }),
      );

      expect(result).toStrictEqual({
        isCurrent: false,
        projectName: "workspace",
        staleExports: [
          {
            anchor: undefined,
            difference: "graph",
            path: "codependix-workspace.json",
          },
        ],
        stalePaths: ["codependix-workspace.json"],
      });
    });

    it("writes no subheading above the anchor, unlike the other two workspace graphs", async () => {
      vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
        json: undefined,
        markdown: { anchor: "codependix-workspace", path: "README.md" },
        target: "markdown",
      });

      const readmePath = path.join(projectRoot, "README.md");

      await writeFile(readmePath, "# Fixture\n", "utf8");

      service.runNxWorkspaceGraph(buildContext());

      const written = await readFile(readmePath, "utf8");

      expect(written).toContain("## 🕸️ Codependix");
      expect(written).not.toContain("### ");
    });
  });
});
