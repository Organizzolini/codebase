import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NeighborhoodService } from "@codependix/nx-projects";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { ProjectGraphsService } from "../project-graphs/project-graphs.service";
import { PythonImportsService } from "../python-imports/python-imports.service";
import { WorkspaceGraphsService } from "../workspace-graphs/workspace-graphs.service";

import { GraphRunService } from "./graph-run.service";

import type { GraphRunContext } from "@codependix/boundaries";
import type { GraphRunOutcome } from "@codependix/core";
import type { Neighborhood } from "@codependix/nx-projects";

describe(GraphRunService, () => {
  let service: GraphRunService;
  let neighborhoodService: NeighborhoodService;
  let projectGraphsService: ProjectGraphsService;
  let pythonImportsService: PythonImportsService;
  let workspaceGraphsService: WorkspaceGraphsService;
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
      buildProjects: projects,
      configuration: {
        boundaries: {
          fileImports: { python: [], typescript: [] },
          nestjsModules: [],
          nxProjects: [],
        },
        exclude: [],
        include: ["**"],
        projectGraph: undefined,
        selection: { dependencies: true, projects: [], tags: [] },
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

  /**
   * A fresh, empty `GraphRunOutcome` — never shared, since `GraphRunService`
   * mutates the arrays it reads off a mocked pass's return value in place
   * (pushing the workspace graph's own delivery result onto them).
   */
  function emptyOutcome(): GraphRunOutcome {
    return { failures: [], results: [] };
  }

  beforeAll(async () => {
    neighborhoodService = createMock<NeighborhoodService>();
    projectGraphsService = createMock<ProjectGraphsService>();
    pythonImportsService = createMock<PythonImportsService>();
    workspaceGraphsService = createMock<WorkspaceGraphsService>();

    const module = await Test.createTestingModule({
      providers: [
        GraphRunService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: NeighborhoodService, useValue: neighborhoodService },
        { provide: ProjectGraphsService, useValue: projectGraphsService },
        { provide: PythonImportsService, useValue: pythonImportsService },
        { provide: WorkspaceGraphsService, useValue: workspaceGraphsService },
      ],
    }).compile();

    service = await module.resolve(GraphRunService);
  });

  beforeEach(async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "map-service-"));

    vi.mocked(neighborhoodService.buildNeighborhoods).mockReturnValue(
      new Map<string, Neighborhood>(),
    );
    vi.mocked(projectGraphsService.runNxProjectsGraphs).mockReturnValue(
      emptyOutcome(),
    );
    vi.mocked(projectGraphsService.runFileImportsProjects).mockReturnValue(
      emptyOutcome(),
    );
    vi.mocked(projectGraphsService.runNestjsModulesProjects).mockResolvedValue(
      emptyOutcome(),
    );
    vi.mocked(workspaceGraphsService.runNxWorkspaceGraph).mockReturnValue({
      entry: undefined,
      result: undefined,
    });
    vi.mocked(
      workspaceGraphsService.runFileImportsWorkspaceGraph,
    ).mockReturnValue({ entry: undefined, result: undefined });
    vi.mocked(
      workspaceGraphsService.runNestjsModulesWorkspaceGraph,
    ).mockResolvedValue({ entry: undefined, result: undefined });
    vi.mocked(pythonImportsService.runGraphs).mockReturnValue(emptyOutcome());
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("runNxGraphs", () => {
    it("builds neighborhoods and delegates the per-project pass to ProjectGraphsService", () => {
      const context = buildContext();

      service.runNxGraphs(context);

      expect(neighborhoodService.buildNeighborhoods).toHaveBeenCalledWith(
        context.graph,
        context.projects,
      );
      expect(projectGraphsService.runNxProjectsGraphs).toHaveBeenCalledWith({
        context,
        neighborhoods: new Map<string, Neighborhood>(),
      });
    });

    it("combines the per-project outcome with the workspace graph's entry and result", () => {
      vi.mocked(projectGraphsService.runNxProjectsGraphs).mockReturnValue({
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "a",
            staleExports: [],
            stalePaths: [],
          },
        ],
      });
      vi.mocked(workspaceGraphsService.runNxWorkspaceGraph).mockReturnValue({
        entry: { json: { projectNames: [] }, markdown: "```mermaid\n```" },
        result: {
          isCurrent: true,
          projectName: "workspace",
          staleExports: [],
          stalePaths: [],
        },
      });

      const outcome = service.runNxGraphs(buildContext());

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "a",
            staleExports: [],
            stalePaths: [],
          },
          {
            isCurrent: true,
            projectName: "workspace",
            staleExports: [],
            stalePaths: [],
          },
        ],
        workspaceEntry: {
          json: { projectNames: [] },
          markdown: "```mermaid\n```",
        },
      });
    });

    it("records a failure building the workspace graph without losing the project results", () => {
      vi.mocked(projectGraphsService.runNxProjectsGraphs).mockReturnValue({
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "a",
            staleExports: [],
            stalePaths: [],
          },
        ],
      });
      vi.mocked(workspaceGraphsService.runNxWorkspaceGraph).mockImplementation(
        () => {
          throw new Error("failed to build workspace graph");
        },
      );

      const outcome = service.runNxGraphs(buildContext());

      expect(outcome.results).toStrictEqual([
        {
          isCurrent: true,
          projectName: "a",
          staleExports: [],
          stalePaths: [],
        },
      ]);
      expect(outcome.failures).toStrictEqual([
        { error: "failed to build workspace graph", projectName: "workspace" },
      ]);
      expect(outcome.workspaceEntry).toBeUndefined();
    });
  });

  describe("runImportGraphs", () => {
    it("delegates the per-project pass to ProjectGraphsService", () => {
      const context = buildContext();

      service.runImportGraphs(context);

      expect(projectGraphsService.runFileImportsProjects).toHaveBeenCalledWith(
        context,
      );
    });

    it("combines the per-project outcome with the workspace graph's entry and result", () => {
      vi.mocked(projectGraphsService.runFileImportsProjects).mockReturnValue({
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "a",
            staleExports: [],
            stalePaths: [],
          },
        ],
      });
      vi.mocked(
        workspaceGraphsService.runFileImportsWorkspaceGraph,
      ).mockReturnValue({
        entry: {
          json: { edges: [], fileNames: [] },
          markdown: "```mermaid\n```",
        },
        result: {
          isCurrent: true,
          projectName: "workspace",
          staleExports: [],
          stalePaths: [],
        },
      });

      const outcome = service.runImportGraphs(buildContext());

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "a",
            staleExports: [],
            stalePaths: [],
          },
          {
            isCurrent: true,
            projectName: "workspace",
            staleExports: [],
            stalePaths: [],
          },
        ],
        workspaceEntry: {
          json: { edges: [], fileNames: [] },
          markdown: "```mermaid\n```",
        },
      });
    });

    it("records a failure building the workspace graph without losing the project results", () => {
      vi.mocked(
        workspaceGraphsService.runFileImportsWorkspaceGraph,
      ).mockImplementation(() => {
        throw new Error("failed to build workspace graph");
      });

      const outcome = service.runImportGraphs(buildContext());

      expect(outcome.results).toStrictEqual([]);
      expect(outcome.failures).toStrictEqual([
        { error: "failed to build workspace graph", projectName: "workspace" },
      ]);
      expect(outcome.workspaceEntry).toBeUndefined();
    });
  });

  describe("runNestjsGraphs", () => {
    it("delegates the per-project pass to ProjectGraphsService", async () => {
      const context = buildContext();

      await service.runNestjsGraphs(context);

      expect(
        projectGraphsService.runNestjsModulesProjects,
      ).toHaveBeenCalledWith(context);
    });

    it("combines the per-project outcome with the workspace graph's entry and result", async () => {
      vi.mocked(
        projectGraphsService.runNestjsModulesProjects,
      ).mockResolvedValue({
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "a",
            staleExports: [],
            stalePaths: [],
          },
        ],
      });
      vi.mocked(
        workspaceGraphsService.runNestjsModulesWorkspaceGraph,
      ).mockResolvedValue({
        entry: {
          json: { edges: [], moduleNames: [] },
          markdown: "```mermaid\n```",
        },
        result: {
          isCurrent: true,
          projectName: "workspace",
          staleExports: [],
          stalePaths: [],
        },
      });

      const outcome = await service.runNestjsGraphs(buildContext());

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "a",
            staleExports: [],
            stalePaths: [],
          },
          {
            isCurrent: true,
            projectName: "workspace",
            staleExports: [],
            stalePaths: [],
          },
        ],
        workspaceEntry: {
          json: { edges: [], moduleNames: [] },
          markdown: "```mermaid\n```",
        },
      });
    });

    it("records a failure building the workspace graph without losing the project results", async () => {
      vi.mocked(
        workspaceGraphsService.runNestjsModulesWorkspaceGraph,
      ).mockRejectedValue(new Error("failed to boot container"));

      const outcome = await service.runNestjsGraphs(buildContext());

      expect(outcome.results).toStrictEqual([]);
      expect(outcome.failures).toStrictEqual([
        { error: "failed to boot container", projectName: "workspace" },
      ]);
      expect(outcome.workspaceEntry).toBeUndefined();
    });
  });

  describe("runPythonImportGraphs", () => {
    it("delegates to PythonImportsService with the given context", () => {
      const context = buildContext();
      const outcome: GraphRunOutcome = {
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "affirmancy",
            staleExports: [],
            stalePaths: [],
          },
        ],
      };

      vi.mocked(pythonImportsService.runGraphs).mockReturnValue(outcome);

      expect(service.runPythonImportGraphs(context)).toBe(outcome);
      expect(pythonImportsService.runGraphs).toHaveBeenCalledWith(context);
    });
  });

  describe("run", () => {
    it("aggregates the results and failures from all four passes", async () => {
      vi.mocked(projectGraphsService.runNxProjectsGraphs).mockReturnValue({
        failures: [{ error: "nx-boom", projectName: "a" }],
        results: [
          {
            isCurrent: true,
            projectName: "b",
            staleExports: [],
            stalePaths: [],
          },
        ],
      });
      vi.mocked(
        projectGraphsService.runNestjsModulesProjects,
      ).mockResolvedValue({
        failures: [],
        results: [
          {
            isCurrent: false,
            projectName: "c",
            staleExports: [],
            stalePaths: ["c"],
          },
        ],
      });
      vi.mocked(projectGraphsService.runFileImportsProjects).mockReturnValue({
        failures: [{ error: "import-boom", projectName: "d" }],
        results: [],
      });
      vi.mocked(pythonImportsService.runGraphs).mockReturnValue({
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "e",
            staleExports: [],
            stalePaths: [],
          },
        ],
      });

      const { outcome } = await service.run(buildContext());

      expect(outcome).toStrictEqual({
        failures: [
          { error: "nx-boom", projectName: "a" },
          { error: "import-boom", projectName: "d" },
        ],
        results: [
          {
            isCurrent: true,
            projectName: "b",
            staleExports: [],
            stalePaths: [],
          },
          {
            isCurrent: false,
            projectName: "c",
            staleExports: [],
            stalePaths: ["c"],
          },
          {
            isCurrent: true,
            projectName: "e",
            staleExports: [],
            stalePaths: [],
          },
        ],
      });
    });

    it("collects each active type's whole-workspace entry into combinedGraphs, keyed by graph type", async () => {
      vi.mocked(workspaceGraphsService.runNxWorkspaceGraph).mockReturnValue({
        entry: { json: { nx: true }, markdown: "nx-markdown" },
        result: undefined,
      });
      vi.mocked(
        workspaceGraphsService.runFileImportsWorkspaceGraph,
      ).mockReturnValue({
        entry: { json: { fileImports: true }, markdown: "imports-markdown" },
        result: undefined,
      });
      vi.mocked(
        workspaceGraphsService.runNestjsModulesWorkspaceGraph,
      ).mockResolvedValue({
        entry: { json: { nestjsModules: true }, markdown: "nestjs-markdown" },
        result: undefined,
      });

      const { combinedGraphs } = await service.run(buildContext());

      expect(combinedGraphs).toStrictEqual({
        fileImports: {
          json: { fileImports: true },
          markdown: "imports-markdown",
        },
        nestjsModules: {
          json: { nestjsModules: true },
          markdown: "nestjs-markdown",
        },
        nxProjects: { json: { nx: true }, markdown: "nx-markdown" },
      });
    });

    it("drops a graph type from combinedGraphs when its workspace entry is undefined", async () => {
      const { combinedGraphs } = await service.run(buildContext());

      expect(combinedGraphs).toStrictEqual({});
    });

    it("hands every pass the context it was given", async () => {
      const context = buildContext({ mode: "check" });

      await service.run(context);

      expect(projectGraphsService.runNxProjectsGraphs).toHaveBeenCalledWith({
        context,
        neighborhoods: expect.anything() as Map<string, Neighborhood>,
      });
    });

    // 🎛️ Graph-type toggles

    it("skips the nx pass entirely when nxProjects is disabled", async () => {
      const { outcome } = await service.run(
        buildContext({
          enabledGraphTypes: new Set(["fileImports", "nestjsModules"]),
        }),
      );

      expect(projectGraphsService.runNxProjectsGraphs).not.toHaveBeenCalled();
      expect(outcome).toStrictEqual({ failures: [], results: [] });
    });

    it("skips the nestjs pass entirely when nestjsModules is disabled", async () => {
      await service.run(
        buildContext({
          enabledGraphTypes: new Set(["fileImports", "nxProjects"]),
        }),
      );

      expect(
        projectGraphsService.runNestjsModulesProjects,
      ).not.toHaveBeenCalled();
    });

    it("skips both import passes entirely when fileImports is disabled", async () => {
      await service.run(
        buildContext({
          enabledGraphTypes: new Set(["nestjsModules", "nxProjects"]),
        }),
      );

      expect(
        projectGraphsService.runFileImportsProjects,
      ).not.toHaveBeenCalled();
      expect(pythonImportsService.runGraphs).not.toHaveBeenCalled();
    });
  });
});
