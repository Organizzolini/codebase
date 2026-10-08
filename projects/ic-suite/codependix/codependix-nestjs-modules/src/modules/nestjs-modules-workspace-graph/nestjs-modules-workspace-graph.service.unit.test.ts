import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { NestjsModulesWorkspaceGraphService } from "./nestjs-modules-workspace-graph.service";

import type { NestjsModuleGraph } from "../module-graph/module-graph.types";

describe(NestjsModulesWorkspaceGraphService, () => {
  let service: NestjsModulesWorkspaceGraphService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [NestjsModulesWorkspaceGraphService],
    }).compile();

    service = await module.resolve(NestjsModulesWorkspaceGraphService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildWorkspaceGraph", () => {
    it("qualifies every module name with the project it belongs to", () => {
      const graph: NestjsModuleGraph = {
        ambientModuleNames: [],
        edges: [],
        isolatedModuleNames: ["AppModule"],
        nodes: [{ declaringFile: "src/app.module.ts", name: "AppModule" }],
        projectName: "codependix-cli",
      };

      const workspaceGraph = service.buildWorkspaceGraph([graph]);

      expect(workspaceGraph.moduleNames).toStrictEqual([
        "codependix-cli/AppModule",
      ]);
    });

    it("keeps two same-named modules in two different projects apart", () => {
      const first: NestjsModuleGraph = {
        ambientModuleNames: [],
        edges: [],
        isolatedModuleNames: ["AppModule"],
        nodes: [{ declaringFile: "src/app.module.ts", name: "AppModule" }],
        projectName: "codependix-cli",
      };
      const second: NestjsModuleGraph = {
        ambientModuleNames: [],
        edges: [],
        isolatedModuleNames: ["AppModule"],
        nodes: [{ declaringFile: "src/app.module.ts", name: "AppModule" }],
        projectName: "codometer-cli",
      };

      const workspaceGraph = service.buildWorkspaceGraph([first, second]);

      expect(workspaceGraph.moduleNames).toStrictEqual([
        "codependix-cli/AppModule",
        "codometer-cli/AppModule",
      ]);
    });

    it("combines edges from every project into one graph", () => {
      const first: NestjsModuleGraph = {
        ambientModuleNames: [],
        edges: [{ source: "MainModule", target: "LoggerModule" }],
        isolatedModuleNames: [],
        nodes: [
          { declaringFile: "src/logger.module.ts", name: "LoggerModule" },
          { declaringFile: "src/main.module.ts", name: "MainModule" },
        ],
        projectName: "codependix-cli",
      };
      const second: NestjsModuleGraph = {
        ambientModuleNames: [],
        edges: [{ source: "MainModule", target: "ChangesModule" }],
        isolatedModuleNames: [],
        nodes: [
          { declaringFile: "src/changes.module.ts", name: "ChangesModule" },
          { declaringFile: "src/main.module.ts", name: "MainModule" },
        ],
        projectName: "codometer-cli",
      };

      const workspaceGraph = service.buildWorkspaceGraph([first, second]);

      expect(workspaceGraph.edges).toStrictEqual([
        {
          source: "codependix-cli/MainModule",
          target: "codependix-cli/LoggerModule",
        },
        {
          source: "codometer-cli/MainModule",
          target: "codometer-cli/ChangesModule",
        },
      ]);
    });

    it("breaks a tie on source by comparing target when sorting edges", () => {
      const graph: NestjsModuleGraph = {
        ambientModuleNames: [],
        edges: [
          { source: "MainModule", target: "LoggerModule" },
          { source: "MainModule", target: "ChangesModule" },
        ],
        isolatedModuleNames: [],
        nodes: [
          { declaringFile: "src/changes.module.ts", name: "ChangesModule" },
          { declaringFile: "src/logger.module.ts", name: "LoggerModule" },
          { declaringFile: "src/main.module.ts", name: "MainModule" },
        ],
        projectName: "codependix-cli",
      };

      const workspaceGraph = service.buildWorkspaceGraph([graph]);

      expect(workspaceGraph.edges).toStrictEqual([
        {
          source: "codependix-cli/MainModule",
          target: "codependix-cli/ChangesModule",
        },
        {
          source: "codependix-cli/MainModule",
          target: "codependix-cli/LoggerModule",
        },
      ]);
    });
  });

  describe("renderMermaid", () => {
    it("renders every qualified module and edge in the workspace", () => {
      const graph: NestjsModuleGraph = {
        ambientModuleNames: [],
        edges: [{ source: "MainModule", target: "LoggerModule" }],
        isolatedModuleNames: [],
        nodes: [
          { declaringFile: "src/logger.module.ts", name: "LoggerModule" },
          { declaringFile: "src/main.module.ts", name: "MainModule" },
        ],
        projectName: "codependix-cli",
      };

      const workspaceGraph = service.buildWorkspaceGraph([graph]);

      expect(service.renderMermaid(workspaceGraph)).toBe(
        [
          "```mermaid",
          "graph LR",
          '  module_codependix_cli_LoggerModule["codependix-cli/LoggerModule"]',
          '  module_codependix_cli_MainModule["codependix-cli/MainModule"]',
          "  module_codependix_cli_MainModule --> module_codependix_cli_LoggerModule",
          "```",
        ].join("\n"),
      );
    });

    it("states in words that the workspace has no NestJS modules", () => {
      const workspaceGraph = service.buildWorkspaceGraph([]);

      expect(service.renderMermaid(workspaceGraph)).toBe(
        "_This workspace has no NestJS modules, in any project._",
      );
    });
  });
});
