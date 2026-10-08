import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as nestjsGraphs from "./render/nestjs-graphs";
import {
  ATLAS_CHAIN,
  buildNeighborhood,
  readProjects,
  renderNeighborhood,
  renderWorkspaceGraph,
  SUBJECT_PROJECT_NAME,
} from "./render/nx-graphs";
import { resolveExample } from "./render/paths";
import * as pythonImports from "./render/python-imports";
import * as typescriptImports from "./render/typescript-imports";

describe("codependix example graphs", () => {
  describe("nx graphs", () => {
    it("leaves the workspace root project out", () => {
      expect.hasAssertions();
      expect(
        readProjects(ATLAS_CHAIN).map((project) => project.name),
      ).toStrictEqual(["atlas-application", "atlas-core", "atlas-service"]);
    });

    it("holds one hop in each direction and no further", () => {
      expect.hasAssertions();

      const neighborhood = buildNeighborhood(ATLAS_CHAIN, SUBJECT_PROJECT_NAME);

      expect(neighborhood?.dependencies).toStrictEqual(["atlas-core"]);
      expect(neighborhood?.dependents).toStrictEqual(["atlas-application"]);
    });

    it("highlights the project the diagram is centered on", () => {
      expect.hasAssertions();
      expect(renderNeighborhood(ATLAS_CHAIN, SUBJECT_PROJECT_NAME)).toContain(
        "class atlas_service subject",
      );
    });

    it("draws the whole chain in the workspace graph, highlighting nothing", () => {
      expect.hasAssertions();

      const diagram = renderWorkspaceGraph(ATLAS_CHAIN);

      expect(diagram).toContain("atlas_application --> atlas_service");
      expect(diagram).toContain("atlas_service --> atlas_core");
      expect(diagram).not.toContain("classDef subject");
    });
  });

  describe("nestjs module graphs", () => {
    it("names a global module ambient once the container is big enough", async () => {
      expect.hasAssertions();

      const graph = await nestjsGraphs.buildContainerGraph([
        "ambient-modules",
        "global-container",
      ]);

      expect(graph.ambientModuleNames).toStrictEqual(["SettingsModule"]);
      expect(graph.edges).toStrictEqual([]);
    });

    it("resolves ambient module names deterministically under concurrent load", async () => {
      expect.hasAssertions();

      const graphs = await Promise.all(
        Array.from({ length: 8 }, async () =>
          nestjsGraphs.buildContainerGraph([
            "ambient-modules",
            "global-container",
          ]),
        ),
      );

      for (const graph of graphs) {
        expect(graph.ambientModuleNames).toStrictEqual(["SettingsModule"]);
        expect(graph.edges).toStrictEqual([]);
      }
    });

    it("leaves a global module's edges drawn below the minimum module count", async () => {
      expect.hasAssertions();

      const graph = await nestjsGraphs.buildContainerGraph([
        "ambient-modules",
        "small-container",
      ]);

      expect(graph.ambientModuleNames).toStrictEqual([]);
      expect(graph.edges.length).toBeGreaterThan(0);
    });

    it("counts inbound edges rather than reading decorators", async () => {
      expect.hasAssertions();

      const graph = await nestjsGraphs.buildContainerGraph([
        "ambient-modules",
        "boundary-container",
      ]);

      expect(graph.ambientModuleNames).toStrictEqual(["SettingsModule"]);
    });

    it("reports a project that defines no modules instead of drawing one", async () => {
      expect.hasAssertions();
      await expect(
        nestjsGraphs.renderContainer(["ambient-modules", "empty-container"]),
      ).resolves.toBe("_This project defines no NestJS modules to graph._");
    });

    it("graphs a container whose options factory refuses to run", async () => {
      expect.hasAssertions();

      const graph = await nestjsGraphs.buildContainerGraph([
        "preview-mode",
        "container",
      ]);

      const moduleNames = graph.nodes.map((node) => node.name);

      expect(moduleNames).toContain("CatalogModule");
      expect(moduleNames).toContain("ConnectionModule");
    });

    it("explores a rooted project outward from its own MainModule", async () => {
      expect.hasAssertions();

      const graph = await nestjsGraphs.buildContainerGraph([
        "container-rooting",
        "rooted-application",
      ]);

      expect(graph.nodes.map((node) => node.name)).toStrictEqual([
        "CatalogModule",
        "InventoryModule",
        "MainModule",
      ]);
    });

    it("carries project-relative declaring files on module nodes", async () => {
      expect.hasAssertions();

      const graph = await nestjsGraphs.buildContainerGraph([
        "container-rooting",
        "rooted-application",
      ]);

      expect(graph.nodes).toStrictEqual([
        { declaringFile: "src/catalog.module.ts", name: "CatalogModule" },
        { declaringFile: "src/inventory.module.ts", name: "InventoryModule" },
        { declaringFile: "src/main.module.ts", name: "MainModule" },
      ]);
    });

    it("keeps the synthetic root and its config scaffolding out of the graph", async () => {
      expect.hasAssertions();

      const graph = await nestjsGraphs.buildContainerGraph([
        "ambient-modules",
        "global-container",
      ]);

      const moduleNames = graph.nodes.map((node) => node.name);

      expect(moduleNames).not.toContain("SyntheticRootModule");
      expect(moduleNames).not.toContain("ConfigModule");
    });

    it("isolates one project's failure from every other project", async () => {
      expect.hasAssertions();

      const explorations = await nestjsGraphs.exploreAll([
        ["container-rooting", "rooted-application"],
        ["container-rooting", "failing-container"],
        ["container-rooting", "library-package"],
      ]);

      expect(
        explorations.map((exploration) => exploration.outcome),
      ).toStrictEqual(["explored", "failed", "explored"]);
    });

    it("describes a raised value whether or not it was an Error", () => {
      expect.hasAssertions();
      expect(nestjsGraphs.describeError(new TypeError("no root"))).toBe(
        "TypeError: no root",
      );
      expect(nestjsGraphs.describeError("no root")).toBe("no root");
    });
  });

  describe("typescript import graphs", () => {
    it("lands a NodeNext `.js` specifier on the `.ts` file it names", () => {
      expect.hasAssertions();
      expect(
        typescriptImports.buildProjectGraph("resolution").edges,
      ).toContainEqual({ source: "src/index.ts", target: "src/catalog.ts" });
    });

    it("resolves a tsconfig path alias the way the compiler resolves it", () => {
      expect.hasAssertions();
      expect(
        typescriptImports.buildProjectGraph("resolution").edges,
      ).toContainEqual({ source: "src/catalog.ts", target: "src/settings.ts" });
    });

    it("leaves declaration files out of the graph", () => {
      expect.hasAssertions();
      expect(
        typescriptImports.buildProjectGraph("resolution").fileNames,
      ).not.toContain("src/ambient.d.ts");
    });

    it.each([
      ["src/re-exported.ts"],
      ["src/deferred.ts"],
      ["src/required.ts"],
      ["src/external.ts"],
    ])("draws nothing from %s", (fileName) => {
      expect.hasAssertions();
      expect(
        typescriptImports
          .buildProjectGraph("resolution")
          .edges.filter((edge) => edge.source === fileName),
      ).toStrictEqual([]);
    });

    it("reports a tsconfig the compiler refuses to parse", () => {
      expect.hasAssertions();

      const outcome = typescriptImports.buildOutcome("broken");

      expect(outcome.outcome).toBe("failed");
      expect(typescriptImports.describeOutcome(outcome)).toContain(
        "TypescriptProjectConfigurationError",
      );
    });

    it("keeps an absolute path out of a committed diagnostic", () => {
      expect.hasAssertions();
      expect(
        typescriptImports.describeOutcome(
          typescriptImports.buildOutcome("broken"),
        ),
      ).toContain("<examples>/typescript-resolution");
    });

    it("reports a project whose program builds", () => {
      expect.hasAssertions();

      const outcome = typescriptImports.buildOutcome("resolution");

      expect(outcome.outcome).toBe("built");
      expect(typescriptImports.describeOutcome(outcome)).toContain("built");
    });

    it("refuses a directory carrying no tsconfig.json", () => {
      expect.hasAssertions();
      expect(() => typescriptImports.describeProjectAt("/nowhere")).toThrow(
        "tsconfig.json",
      );
    });

    it("describes a raised value whether or not it was an Error", () => {
      expect.hasAssertions();
      expect(typescriptImports.describeError(new TypeError("bad"))).toBe(
        "TypeError: bad",
      );
      expect(typescriptImports.describeError("bad")).toBe("bad");
    });
  });

  describe("python import graphs", () => {
    it.each([
      ["main.py", "shared/constants.py"],
      ["main.py", "shared/helpers.py"],
      ["main.py", "catalog.py"],
      ["main.py", "__init__.py"],
      ["parenthesized.py", "shared/constants.py"],
      ["continued.py", "shared/helpers.py"],
      ["shared/deep/cousin.py", "shared/constants.py"],
      ["shared/deep/cousin.py", "shared/deep/__init__.py"],
    ])("draws %s → %s", (source, target) => {
      expect.hasAssertions();
      expect(pythonImports.buildProjectGraph("scanner").edges).toContainEqual({
        source,
        target,
      });
    });

    it("walks no import that does not start at column zero", () => {
      expect.hasAssertions();
      expect(
        pythonImports.buildProjectGraph("scanner").isolatedFileNames,
      ).toContain("nested.py");
    });

    it("resolves a bare relative import to the package, never to the name it binds", () => {
      expect.hasAssertions();

      const targets = pythonImports
        .buildProjectGraph("scanner")
        .edges.filter((edge) => edge.source === "main.py")
        .map((edge) => edge.target);

      expect(targets).toContain("__init__.py");
      expect(targets).not.toContain("sibling.py");
    });

    it("draws no edge for a module this project does not own", () => {
      expect.hasAssertions();
      expect(
        pythonImports
          .buildProjectGraph("scanner")
          .edges.map((edge) => edge.target),
      ).not.toContain("third_party_package.py");
    });

    it("discovers nothing at all when the language:python tag is absent", () => {
      expect.hasAssertions();
      expect(() =>
        pythonImports.describeProjectAt(
          resolveExample("python-scanner", "scanner"),
          [],
        ),
      ).toThrow("language:python");
    });

    describe("excluded directories", () => {
      const cacheDirectory = resolveExample(
        "python-scanner",
        "scanner",
        "__pycache__",
      );

      beforeAll(() => {
        mkdirSync(cacheDirectory, { recursive: true });
        writeFileSync(
          path.join(cacheDirectory, "ghost.py"),
          "import shared\n",
          "utf8",
        );
      });

      afterAll(() => {
        writeFileSync(path.join(cacheDirectory, "ghost.py"), "", "utf8");
      });

      it("never walks into a __pycache__ directory", () => {
        expect.hasAssertions();
        expect(
          pythonImports.buildProjectGraph("scanner").fileNames,
        ).not.toContain("__pycache__/ghost.py");
      });
    });
  });
});
