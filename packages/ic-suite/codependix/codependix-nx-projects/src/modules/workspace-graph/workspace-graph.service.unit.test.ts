import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { NeighborhoodService } from "../neighborhood/neighborhood.service";

import { WorkspaceGraphService } from "./workspace-graph.service";

import type { NxProject } from "../neighborhood/neighborhood.types";
import type { ProjectGraph } from "@nx/devkit";

/** Builds a project graph from a name-to-dependency-names map. */
function buildGraph(
  dependencies: Record<string, [string, string][]>,
): ProjectGraph {
  const names = new Set([
    ...Object.keys(dependencies),
    ...Object.values(dependencies).flatMap((edges) =>
      edges.map(([target]) => target),
    ),
  ]);

  return {
    dependencies: Object.fromEntries(
      Object.entries(dependencies).map(([source, edges]) => [
        source,
        edges.map(([target, type]) => ({ source, target, type })),
      ]),
    ),
    nodes: Object.fromEntries(
      [...names].map((name) => [
        name,
        { data: { root: `packages/${name}` }, name, type: "lib" },
      ]),
    ),
  };
}

/** Names the projects a graph holds. */
function buildProjects(names: string[]): NxProject[] {
  return names.map((name) => ({
    absoluteRoot: `/workspace/packages/${name}`,
    name,
    tags: [],
  }));
}

describe(WorkspaceGraphService, () => {
  let service: WorkspaceGraphService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [NeighborhoodService, WorkspaceGraphService],
    }).compile();

    service = await module.resolve(WorkspaceGraphService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildWorkspaceGraph", () => {
    it("names every project the workspace holds, sorted", () => {
      const graph = buildGraph({});

      expect(
        service.buildWorkspaceGraph(
          graph,
          buildProjects(["logger", "caelundas"]),
        ).projectNames,
      ).toStrictEqual(["caelundas", "logger"]);
    });

    it("collects every edge between two workspace projects", () => {
      const graph = buildGraph({
        caelundas: [["logger", "static"]],
        lexico: [["lexico-components", "static"]],
      });

      const workspaceGraph = service.buildWorkspaceGraph(
        graph,
        buildProjects(["caelundas", "logger", "lexico", "lexico-components"]),
      );

      expect(workspaceGraph.edges).toStrictEqual([
        { implicit: false, source: "caelundas", target: "logger" },
        { implicit: false, source: "lexico", target: "lexico-components" },
      ]);
    });

    it("leaves out edges to a project outside the workspace", () => {
      const graph = buildGraph({ caelundas: [["npm:rxjs", "static"]] });

      expect(
        service.buildWorkspaceGraph(graph, buildProjects(["caelundas"])).edges,
      ).toStrictEqual([]);
    });

    it("leaves out a project's edge to itself", () => {
      const graph = buildGraph({ caelundas: [["caelundas", "static"]] });

      expect(
        service.buildWorkspaceGraph(graph, buildProjects(["caelundas"])).edges,
      ).toStrictEqual([]);
    });

    // Nx reports the same pair twice when a static import is also declared as
    // an implicit dependency; the import is the stronger statement.
    it("keeps a pair static when it is declared both ways", () => {
      const graph = buildGraph({
        lexico: [
          ["lexico-components", "implicit"],
          ["lexico-components", "static"],
        ],
      });

      expect(
        service.buildWorkspaceGraph(
          graph,
          buildProjects(["lexico", "lexico-components"]),
        ).edges,
      ).toStrictEqual([
        { implicit: false, source: "lexico", target: "lexico-components" },
      ]);
    });

    it("marks an edge Nx only inferred from configuration as implicit", () => {
      const graph = buildGraph({ lexico: [["lexico-components", "implicit"]] });

      expect(
        service.buildWorkspaceGraph(
          graph,
          buildProjects(["lexico", "lexico-components"]),
        ).edges[0]?.implicit,
      ).toBe(true);
    });
  });

  describe("renderMermaid", () => {
    it("renders every project and edge in the workspace", () => {
      const graph = buildGraph({ caelundas: [["logger", "static"]] });
      const workspaceGraph = service.buildWorkspaceGraph(
        graph,
        buildProjects(["caelundas", "logger"]),
      );

      expect(service.renderMermaid(workspaceGraph)).toBe(
        [
          "```mermaid",
          "graph LR",
          '  caelundas["caelundas"]',
          '  logger["logger"]',
          "  caelundas --> logger",
          "```",
        ].join("\n"),
      );
    });

    it("draws an implicit edge dotted and explains it", () => {
      const graph = buildGraph({ lexico: [["lexico-components", "implicit"]] });
      const workspaceGraph = service.buildWorkspaceGraph(
        graph,
        buildProjects(["lexico", "lexico-components"]),
      );

      const diagram = service.renderMermaid(workspaceGraph);

      expect(diagram).toContain("lexico -.-> lexico_components");
      expect(diagram).toContain("_Dashed edges are dependencies Nx inferred");
    });

    it("states in words that the workspace has no dependency edges", () => {
      const workspaceGraph = service.buildWorkspaceGraph(
        buildGraph({}),
        buildProjects(["affirmancy"]),
      );

      expect(service.renderMermaid(workspaceGraph)).toBe(
        "_This workspace has no Nx dependency edges between its projects._",
      );
    });

    it("gives a hyphenated project name an identifier mermaid accepts", () => {
      const graph = buildGraph({ "codometer-cli": [["logger", "static"]] });
      const workspaceGraph = service.buildWorkspaceGraph(
        graph,
        buildProjects(["codometer-cli", "logger"]),
      );

      const diagram = service.renderMermaid(workspaceGraph);

      expect(diagram).toContain('  codometer_cli["codometer-cli"]');
      expect(diagram).toContain("  codometer_cli --> logger");
    });
  });
});
