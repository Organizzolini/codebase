import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { PythonImportGraphService } from "./python-import-graph.service";
import { PythonProjectService } from "./python-project.service";
import { PythonService } from "./python.service";

import type { PythonImportGraph, PythonProject } from "./python.types";

describe(PythonService, () => {
  let service: PythonService;
  let pythonImportGraphService: PythonImportGraphService;
  let pythonProjectService: PythonProjectService;

  beforeAll(async () => {
    pythonImportGraphService = createMock<PythonImportGraphService>();
    pythonProjectService = createMock<PythonProjectService>();

    const module = await Test.createTestingModule({
      providers: [
        PythonService,
        {
          provide: PythonImportGraphService,
          useValue: pythonImportGraphService,
        },
        { provide: PythonProjectService, useValue: pythonProjectService },
      ],
    }).compile();

    service = await module.resolve(PythonService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("delegates buildGraph to PythonImportGraphService", () => {
    const project = createMock<PythonProject>();
    const graph = createMock<PythonImportGraph>();

    vi.mocked(pythonImportGraphService.buildGraph).mockReturnValue(graph);

    expect(service.buildGraph(project)).toBe(graph);
    expect(pythonImportGraphService.buildGraph).toHaveBeenCalledWith(project);
  });

  it("delegates discoverProjects to PythonProjectService", () => {
    const projects = [
      {
        absoluteRoot: "/workspace/affirmancy",
        name: "affirmancy",
        tags: ["language:python"],
      },
    ];
    const discovered = [createMock<PythonProject>()];

    vi.mocked(pythonProjectService.discoverProjects).mockReturnValue(
      discovered,
    );

    expect(service.discoverProjects(projects)).toBe(discovered);
    expect(pythonProjectService.discoverProjects).toHaveBeenCalledWith(
      projects,
    );
  });

  it("delegates renderMermaid to PythonImportGraphService", () => {
    const graph = createMock<PythonImportGraph>();

    vi.mocked(pythonImportGraphService.renderMermaid).mockReturnValue(
      "```mermaid\ngraph LR\n```",
    );

    expect(service.renderMermaid(graph)).toBe("```mermaid\ngraph LR\n```");
    expect(pythonImportGraphService.renderMermaid).toHaveBeenCalledWith(graph);
  });
});
