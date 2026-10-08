import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { TypescriptImportGraphService } from "./typescript-import-graph.service";
import { TypescriptProjectService } from "./typescript-project.service";
import { TypescriptService } from "./typescript.service";

import type {
  TypescriptImportGraph,
  TypescriptProject,
  TypescriptProjectProgram,
} from "./typescript.types";

describe(TypescriptService, () => {
  let service: TypescriptService;
  let typescriptImportGraphService: TypescriptImportGraphService;
  let typescriptProjectService: TypescriptProjectService;

  beforeAll(async () => {
    typescriptImportGraphService = createMock<TypescriptImportGraphService>();
    typescriptProjectService = createMock<TypescriptProjectService>();

    const module = await Test.createTestingModule({
      providers: [
        TypescriptService,
        {
          provide: TypescriptImportGraphService,
          useValue: typescriptImportGraphService,
        },
        {
          provide: TypescriptProjectService,
          useValue: typescriptProjectService,
        },
      ],
    }).compile();

    service = await module.resolve(TypescriptService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("delegates buildGraph to TypescriptImportGraphService", () => {
    const projectProgram = createMock<TypescriptProjectProgram>();
    const graph = createMock<TypescriptImportGraph>();

    vi.mocked(typescriptImportGraphService.buildGraph).mockReturnValue(graph);

    expect(service.buildGraph(projectProgram)).toBe(graph);
    expect(typescriptImportGraphService.buildGraph).toHaveBeenCalledWith(
      projectProgram,
    );
  });

  it("delegates buildProgram to TypescriptProjectService", () => {
    const project = createMock<TypescriptProject>();
    const projectProgram = createMock<TypescriptProjectProgram>();

    vi.mocked(typescriptProjectService.buildProgram).mockReturnValue(
      projectProgram,
    );

    expect(service.buildProgram(project)).toBe(projectProgram);
    expect(typescriptProjectService.buildProgram).toHaveBeenCalledWith(project);
  });

  it("delegates discoverProjects to TypescriptProjectService", () => {
    const projects = [{ absoluteRoot: "/workspace/example", name: "example" }];
    const discovered = [createMock<TypescriptProject>()];

    vi.mocked(typescriptProjectService.discoverProjects).mockReturnValue(
      discovered,
    );

    expect(service.discoverProjects(projects)).toBe(discovered);
    expect(typescriptProjectService.discoverProjects).toHaveBeenCalledWith(
      projects,
    );
  });

  it("delegates renderMermaid to TypescriptImportGraphService", () => {
    const graph = createMock<TypescriptImportGraph>();

    vi.mocked(typescriptImportGraphService.renderMermaid).mockReturnValue(
      "```mermaid\ngraph LR\n```",
    );

    expect(service.renderMermaid(graph)).toBe("```mermaid\ngraph LR\n```");
    expect(typescriptImportGraphService.renderMermaid).toHaveBeenCalledWith(
      graph,
    );
  });
});
