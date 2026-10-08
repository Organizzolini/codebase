import { ConfigurationService } from "@codependix/configuration";
import { NeighborhoodService } from "@codependix/nx-projects";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { RunContextService } from "./run-context.service";

import type { NxProject } from "@codependix/nx-projects";

/** The projects the mocked workspace reports, tagged for selection. */
const PROJECTS: NxProject[] = [
  {
    absoluteRoot: "/workspace/packages/widgets",
    name: "widgets",
    tags: ["framework:nestjs"],
  },
  {
    absoluteRoot: "/workspace/tools/reporting",
    name: "reporting",
    tags: ["language:python"],
  },
];

describe(RunContextService, () => {
  let configurationService: ConfigurationService;
  let neighborhoodService: NeighborhoodService;
  let service: RunContextService;

  beforeAll(async () => {
    configurationService = createMock<ConfigurationService>();
    neighborhoodService = createMock<NeighborhoodService>();

    const module = await Test.createTestingModule({
      providers: [
        RunContextService,
        { provide: ConfigurationService, useValue: configurationService },
        { provide: NeighborhoodService, useValue: neighborhoodService },
      ],
    }).compile();

    service = await module.resolve(RunContextService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(neighborhoodService.readProjectGraph).mockResolvedValue({
      dependencies: {},
      nodes: {},
    });
    vi.mocked(neighborhoodService.readProjects).mockReturnValue(PROJECTS);
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue({
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
    });
    vi.mocked(configurationService.isProjectSelected).mockReturnValue(true);
    vi.mocked(configurationService.loadProjectConfiguration).mockResolvedValue(
      undefined,
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("loads the configuration and reads the project graph exactly once", async () => {
    await service.build({
      mode: "write",
      options: {},
      workingDirectory: "/workspace",
    });

    expect(configurationService.loadConfiguration).toHaveBeenCalledTimes(1);
    expect(neighborhoodService.readProjectGraph).toHaveBeenCalledTimes(1);
  });

  it("carries the run mode it was given", async () => {
    const context = await service.build({
      mode: "check",
      options: {},
      workingDirectory: "/workspace",
    });

    expect(context.mode).toBe("check");
  });

  it("hands the command line's selection to the configuration loader", async () => {
    await service.build({
      mode: "write",
      options: { projects: "widgets", tags: "framework:nestjs" },
      workingDirectory: "/workspace",
    });

    expect(configurationService.loadConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        selection: { projects: "widgets", tags: "framework:nestjs" },
      }),
    );
  });

  it("hands the command line's --include/--exclude overrides to the configuration loader", async () => {
    await service.build({
      mode: "write",
      options: { exclude: ["fixtures-*"], include: ["applications/**"] },
      workingDirectory: "/workspace",
    });

    expect(configurationService.loadConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: { exclude: ["fixtures-*"], include: ["applications/**"] },
      }),
    );
  });

  // 🎛️ Graph-type toggles

  it("enables every graph type when no toggle flag is given", async () => {
    const context = await service.build({
      mode: "write",
      options: {},
      workingDirectory: "/workspace",
    });

    expect([...context.enabledGraphTypes].toSorted()).toStrictEqual([
      "fileImports",
      "nestjsModules",
      "nxProjects",
    ]);
  });

  it("disables exactly the graph type its --no-* flag named", async () => {
    const context = await service.build({
      mode: "write",
      options: { fileImports: false },
      workingDirectory: "/workspace",
    });

    expect(context.enabledGraphTypes.has("fileImports")).toBe(false);
    expect(context.enabledGraphTypes.has("nestjsModules")).toBe(true);
    expect(context.enabledGraphTypes.has("nxProjects")).toBe(true);
  });

  it("disables every graph type its --no-* flag named at once", async () => {
    const context = await service.build({
      mode: "write",
      options: { nestjsModules: false, nxProjects: false },
      workingDirectory: "/workspace",
    });

    expect([...context.enabledGraphTypes]).toStrictEqual(["fileImports"]);
  });

  it("reads the working directory's own graph when none is supplied", async () => {
    await service.build({
      mode: "write",
      options: {},
      workingDirectory: "/workspace",
    });

    expect(neighborhoodService.readProjectGraph).toHaveBeenCalledWith(
      undefined,
    );
  });

  // A supplied graph is what lets a run graph a workspace it is not standing
  // in. Its path resolves against the same root every export path does.
  it("resolves a supplied graph's path against the workspace root", async () => {
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue({
      boundaries: {
        fileImports: { python: [], typescript: [] },
        nestjsModules: [],
        nxProjects: [],
      },
      exclude: [],
      include: ["**"],
      projectGraph: "artifacts/graph.json",
      selection: { projects: [], tags: [] },
      workspace: {},
    });

    await service.build({
      mode: "write",
      options: {},
      workingDirectory: "/workspace",
    });

    expect(neighborhoodService.readProjectGraph).toHaveBeenCalledWith(
      "/workspace/artifacts/graph.json",
    );
  });

  // What keeps the Workspace Graph whole and the boundary gate judging every
  // project unless a run asked for something narrower.
  it("selects every project when nothing narrows the run", async () => {
    const context = await service.build({
      mode: "write",
      options: {},
      workingDirectory: "/workspace",
    });

    expect(context.selectedProjects).toStrictEqual(PROJECTS);
  });

  it("narrows the selected projects to what the selection matched", async () => {
    vi.mocked(configurationService.isProjectSelected).mockImplementation(
      (args) => args.projectName === "widgets",
    );

    const context = await service.build({
      mode: "write",
      options: { projects: "widgets" },
      workingDirectory: "/workspace",
    });

    expect(context.projects).toStrictEqual(PROJECTS);
    expect(
      context.selectedProjects.map((project) => project.name),
    ).toStrictEqual(["widgets"]);
  });

  it("matches a project's root against the selection as a workspace-relative path", async () => {
    await service.build({
      mode: "write",
      options: { projects: "tools/*" },
      workingDirectory: "/workspace",
    });

    expect(configurationService.isProjectSelected).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: "reporting",
        projectRoot: "tools/reporting",
        projectTags: ["language:python"],
      }),
    );
  });

  it("loads every project's own configuration file, keyed by name", async () => {
    // Called once per project, in `context.projects` order — widgets, then
    // reporting — so two queued resolutions line up with the two calls.
    vi.mocked(configurationService.loadProjectConfiguration)
      .mockResolvedValueOnce({
        nxProjects: { markdown: { anchor: "widgets" }, target: "markdown" },
      })
      .mockResolvedValueOnce(undefined);

    const context = await service.build({
      mode: "write",
      options: {},
      workingDirectory: "/workspace",
    });

    expect(context.projectConfigurations.get("widgets")).toStrictEqual({
      nxProjects: { markdown: { anchor: "widgets" }, target: "markdown" },
    });
    expect(context.projectConfigurations.get("reporting")).toBeUndefined();
    expect(configurationService.loadProjectConfiguration).toHaveBeenCalledWith({
      projectRoot: "/workspace/packages/widgets",
    });
    expect(configurationService.loadProjectConfiguration).toHaveBeenCalledWith({
      projectRoot: "/workspace/tools/reporting",
    });
  });
});
