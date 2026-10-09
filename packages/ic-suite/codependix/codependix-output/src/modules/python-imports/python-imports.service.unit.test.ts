import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConfigurationService } from "@codependix/configuration";
import { PythonService } from "@codependix/file-imports";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AnchorsService } from "../anchors/anchors.service";
import { DeliveryService } from "../delivery/delivery.service";

import { PythonImportsService } from "./python-imports.service";

import type { GraphRunContext } from "@codependix/boundaries";
import type { PythonImportGraph } from "@codependix/file-imports";

const PYTHON_IMPORT_GRAPH: PythonImportGraph = {
  edges: [{ source: "src/index.py", target: "src/helper.py" }],
  fileNames: ["src/helper.py", "src/index.py"],
  isolatedFileNames: [],
  projectName: "affirmancy",
};

describe(PythonImportsService, () => {
  let service: PythonImportsService;
  let configurationService: ConfigurationService;
  let pythonService: PythonService;
  let projectRoot: string;

  /** Builds a `GraphRunContext` whose one project is `affirmancy`. */
  function buildContext(
    overrides: Partial<GraphRunContext> = {},
  ): GraphRunContext {
    const projects = overrides.projects ?? [
      { absoluteRoot: projectRoot, name: "affirmancy", tags: [] },
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

  beforeAll(async () => {
    configurationService = createMock<ConfigurationService>();
    pythonService = createMock<PythonService>();

    const module = await Test.createTestingModule({
      providers: [
        AnchorsService,
        DeliveryService,
        PythonImportsService,
        {
          provide: ConfigurationService,
          useValue: configurationService,
        },
        { provide: PythonService, useValue: pythonService },
      ],
    }).compile();

    service = await module.resolve(PythonImportsService);
  });

  beforeEach(async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "python-imports-service-"));

    vi.mocked(pythonService.discoverProjects).mockReturnValue([
      { absoluteRoot: projectRoot, name: "affirmancy" },
    ]);
    vi.mocked(pythonService.buildGraph).mockReturnValue(PYTHON_IMPORT_GRAPH);
    vi.mocked(pythonService.renderMermaid).mockReturnValue(
      "```mermaid\ngraph LR\n```",
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("skips a project whose resolved target is none", () => {
    vi.mocked(configurationService.resolveForProject).mockReturnValue({
      json: undefined,
      markdown: undefined,
      target: "none",
    });

    const outcome = service.runGraphs(buildContext());

    expect(outcome).toStrictEqual({ failures: [], results: [] });
  });

  it("builds a graph only for the discovered python projects", () => {
    vi.mocked(configurationService.resolveForProject).mockReturnValue({
      json: { path: "affirmancy.json" },
      markdown: undefined,
      target: "json",
    });

    service.runGraphs(buildContext());

    expect(pythonService.buildGraph).toHaveBeenCalledWith({
      absoluteRoot: projectRoot,
      name: "affirmancy",
    });
  });

  it("writes a project's JSON export", async () => {
    vi.mocked(configurationService.resolveForProject).mockReturnValue({
      json: { path: "affirmancy.json" },
      markdown: undefined,
      target: "json",
    });

    const outcome = service.runGraphs(buildContext());

    expect(outcome).toStrictEqual({
      failures: [],
      results: [
        {
          isCurrent: true,
          projectName: "affirmancy",
          staleExports: [],
          stalePaths: [],
        },
      ],
    });

    const written = JSON.parse(
      await readFile(path.join(projectRoot, "affirmancy.json"), "utf8"),
    ) as unknown;

    expect(written).toStrictEqual(PYTHON_IMPORT_GRAPH);
  });

  it("reports a missing JSON export as stale in check mode", () => {
    vi.mocked(configurationService.resolveForProject).mockReturnValue({
      json: { path: "affirmancy.json" },
      markdown: undefined,
      target: "json",
    });

    const outcome = service.runGraphs(buildContext({ mode: "check" }));

    expect(outcome).toStrictEqual({
      failures: [],
      results: [
        {
          isCurrent: false,
          projectName: "affirmancy",
          staleExports: [
            {
              anchor: undefined,
              difference: "graph",
              path: "affirmancy.json",
            },
          ],
          stalePaths: ["affirmancy.json"],
        },
      ],
    });
  });

  it("splices a diagram into an existing anchor block", async () => {
    const readmePath = path.join(projectRoot, "README.md");

    await writeFile(
      readmePath,
      [
        "# affirmancy",
        '<!-- codependix:start name="python-imports" -->',
        "stale",
        '<!-- codependix:end name="python-imports" -->',
      ].join("\n"),
      "utf8",
    );
    vi.mocked(configurationService.resolveForProject).mockReturnValue({
      json: undefined,
      markdown: { anchor: "python-imports", path: "README.md" },
      target: "markdown",
    });

    const outcome = service.runGraphs(buildContext());

    expect(outcome.results[0]?.isCurrent).toBe(true);

    const written = await readFile(readmePath, "utf8");

    expect(written).toContain("```mermaid\ngraph LR\n```");
    expect(written).not.toContain("stale");
  });

  it("records a non-Error rejection as its string form", () => {
    const nonErrorFailure: unknown = "boom";

    vi.mocked(pythonService.buildGraph).mockImplementation(() => {
      throw nonErrorFailure;
    });
    vi.mocked(configurationService.resolveForProject).mockReturnValue({
      json: { path: "affirmancy.json" },
      markdown: undefined,
      target: "json",
    });

    const outcome = service.runGraphs(buildContext());

    expect(outcome.failures).toStrictEqual([
      { error: "boom", projectName: "affirmancy" },
    ]);
  });

  it("records a project's failure without preventing other projects from being processed", async () => {
    const otherProjectRoot = path.join(projectRoot, "other-python-project");

    await mkdir(otherProjectRoot, { recursive: true });
    vi.mocked(pythonService.discoverProjects).mockReturnValue([
      { absoluteRoot: projectRoot, name: "affirmancy" },
      { absoluteRoot: otherProjectRoot, name: "other-python-project" },
    ]);
    vi.mocked(pythonService.buildGraph).mockImplementation((project) => {
      if (project.name === "affirmancy") {
        throw new Error("failed to build graph");
      }

      return { ...PYTHON_IMPORT_GRAPH, projectName: project.name };
    });
    vi.mocked(configurationService.resolveForProject).mockReturnValue({
      json: { path: "graph.json" },
      markdown: undefined,
      target: "json",
    });

    const outcome = service.runGraphs(
      buildContext({
        projects: [
          { absoluteRoot: projectRoot, name: "affirmancy", tags: [] },
          {
            absoluteRoot: otherProjectRoot,
            name: "other-python-project",
            tags: [],
          },
        ],
      }),
    );

    expect(outcome.failures).toStrictEqual([
      { error: "failed to build graph", projectName: "affirmancy" },
    ]);
    expect(outcome.results).toStrictEqual([
      {
        isCurrent: true,
        projectName: "other-python-project",
        staleExports: [],
        stalePaths: [],
      },
    ]);
  });
});
