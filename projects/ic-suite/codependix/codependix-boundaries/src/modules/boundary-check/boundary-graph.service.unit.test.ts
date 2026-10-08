import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoundaryGraphService } from "./boundary-graph.service";

describe(BoundaryGraphService, () => {
  let service: BoundaryGraphService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [BoundaryGraphService],
    }).compile();

    service = await module.resolve(BoundaryGraphService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("carries an Nx project's tags, root, and name", () => {
    const graph = service.buildNxGraph({
      projects: [
        {
          absoluteRoot:
            "/workspace/packages/ic-suite/codependix/codependix-cli",
          name: "codependix-cli",
          tags: ["type:package"],
        },
      ],
      scope: "workspace",
      workingDirectory: "/workspace",
      workspaceGraph: {
        edges: [
          {
            implicit: false,
            source: "codependix-cli",
            target: "codependix-nx-projects",
          },
        ],
        projectNames: ["codependix-cli"],
      },
    });

    expect(graph).toStrictEqual({
      edges: [
        {
          implicit: false,
          source: "codependix-cli",
          target: "codependix-nx-projects",
        },
      ],
      level: "nxProjects",
      nodes: [
        {
          id: "codependix-cli",
          path: "packages/ic-suite/codependix/codependix-cli",
          project: "codependix-cli",
          tags: ["type:package"],
        },
      ],
      scope: "workspace",
    });
  });

  it("leaves a project's path unset when no discovered project carries it", () => {
    const graph = service.buildNxGraph({
      projects: [],
      scope: "workspace",
      workingDirectory: "/workspace",
      workspaceGraph: { edges: [], projectNames: ["codependix-nx-projects"] },
    });

    expect(graph.nodes[0]).toStrictEqual({
      id: "codependix-nx-projects",
      path: undefined,
      project: "codependix-nx-projects",
      tags: undefined,
    });
  });

  it("gives a NestJS module its name, declaring file, and project", () => {
    const graph = service.buildNestjsGraph({
      ambientModuleNames: [],
      edges: [{ source: "MapModule", target: "DeliveryModule" }],
      isolatedModuleNames: [],
      nodes: [
        { declaringFile: "src/delivery.module.ts", name: "DeliveryModule" },
        { declaringFile: "src/map.module.ts", name: "MapModule" },
      ],
      projectName: "codependix-cli",
    });

    expect(graph).toStrictEqual({
      edges: [{ source: "MapModule", target: "DeliveryModule" }],
      level: "nestjsModules",
      nodes: [
        {
          id: "DeliveryModule",
          path: "src/delivery.module.ts",
          project: "codependix-cli",
        },
        {
          id: "MapModule",
          path: "src/map.module.ts",
          project: "codependix-cli",
        },
      ],
      scope: "codependix-cli",
    });
  });

  it("gives a TypeScript file its path and its project", () => {
    const graph = service.buildTypescriptImportGraph({
      edges: [{ source: "src/a.ts", target: "src/b.ts" }],
      fileNames: ["src/a.ts", "src/b.ts"],
      isolatedFileNames: [],
      projectName: "codependix-cli",
    });

    expect(graph).toStrictEqual({
      edges: [{ source: "src/a.ts", target: "src/b.ts" }],
      level: "typescript",
      nodes: [
        { id: "src/a.ts", path: "src/a.ts", project: "codependix-cli" },
        { id: "src/b.ts", path: "src/b.ts", project: "codependix-cli" },
      ],
      scope: "codependix-cli",
    });
  });

  it("gives a Python file the same shape at its own level", () => {
    const graph = service.buildPythonImportGraph({
      edges: [],
      fileNames: ["main.py"],
      isolatedFileNames: ["main.py"],
      projectName: "affirmancy",
    });

    expect(graph.level).toBe("python");
    expect(graph.nodes).toStrictEqual([
      { id: "main.py", path: "main.py", project: "affirmancy" },
    ]);
  });
});
