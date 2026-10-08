import { createTree } from "nx/src/generators/testing-utils/create-tree";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolvePluginService } from "./modules/plugin/plugin-context.utilities";

import conformetryPlugin, { runConformetryGenerator } from "./index";

import type { CreateNodesContext } from "@nx/devkit";

// The plugin service compiles a NestJS graph and reads the workspace; what
// these entry points own is the shape Nx expects back from them.
vi.mock("./modules/plugin/plugin-context.utilities", () => ({
  resolvePluginService: vi.fn(),
}));

const inferTargets = vi.fn();
const runGenerator = vi.fn();

const TARGET = {
  "conformetry-validate": {
    cache: true,
    executor: "@conformetry/nx:validate",
    options: {},
  },
};

const CONTEXT: CreateNodesContext = {
  nxJsonConfiguration: {},
  workspaceRoot: "/w",
};

/** Invokes the `createNodes` hook the way Nx does, with a batch of files. */
async function createNodes(
  projectConfigurationFiles: string[],
): Promise<unknown> {
  return await conformetryPlugin.createNodes[1](
    projectConfigurationFiles,
    {},
    CONTEXT,
  );
}

describe("conformetryPlugin", () => {
  beforeEach(() => {
    inferTargets.mockResolvedValue(new Map([["packages/widgets", TARGET]]));
    runGenerator.mockResolvedValue(["packages/widgets/src/gears.ts"]);
    // type-coverage:ignore-next-line -- a deliberate stand-in for the service
    vi.mocked(resolvePluginService).mockResolvedValue({
      inferTargets,
      runGenerator,
    } as unknown as Awaited<ReturnType<typeof resolvePluginService>>);
  });

  it("names itself the way the package is named", () => {
    expect(conformetryPlugin.name).toBe("@conformetry/nx");
  });

  describe("createNodes", () => {
    it("attaches the inferred target to the project that holds instances", async () => {
      await expect(
        createNodes(["packages/widgets/project.json"]),
      ).resolves.toStrictEqual([
        [
          "packages/widgets/project.json",
          { projects: { "packages/widgets": { targets: TARGET } } },
        ],
      ]);
    });

    it("returns nothing for a project with no instances to validate", async () => {
      await expect(
        createNodes(["packages/other/project.json"]),
      ).resolves.toStrictEqual([]);
    });

    it("reads the configuration once for the whole batch", async () => {
      await createNodes([
        "packages/widgets/project.json",
        "packages/other/project.json",
      ]);

      expect(inferTargets).toHaveBeenCalledTimes(1);
    });
  });

  describe(runConformetryGenerator, () => {
    it("runs the named generator against the tree", async () => {
      const tree = createTree();
      const generatedFilePaths = await runConformetryGenerator({
        generatorName: "nestjs-service-module",
        options: { name: "gears" },
        tree,
      });

      expect(runGenerator).toHaveBeenCalledWith(
        expect.objectContaining({
          generatorName: "nestjs-service-module",
          options: { name: "gears" },
        }),
      );
      expect(generatedFilePaths).toStrictEqual([
        "packages/widgets/src/gears.ts",
      ]);
    });

    it("runs with no options when the caller passes none", async () => {
      await runConformetryGenerator({
        generatorName: "nestjs-service-module",
        tree: createTree(),
      });

      expect(runGenerator).toHaveBeenCalledWith(
        expect.objectContaining({ options: {} }),
      );
    });
  });
});
