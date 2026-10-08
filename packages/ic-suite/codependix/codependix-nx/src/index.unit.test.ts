import { createMock } from "@golevelup/ts-vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import codependixPlugin from "./index";

import type { PluginService } from "./modules/plugin/plugin.service";
import type { InferredTargets } from "./modules/plugin/plugin.types";
import type { CreateNodesContext } from "@nx/devkit";

const pluginService = createMock<PluginService>();

vi.mock("./modules/plugin/plugin-context.utilities", () => ({
  resolveGateService: vi.fn<() => void>(),
  resolvePluginService: async (): Promise<PluginService> =>
    await Promise.resolve(pluginService),
}));

/** One project's inferred gate. */
const TARGETS: InferredTargets = {
  "codependix-gate": {
    cache: true,
    executor: "@codependix/nx:gate",
    inputs: ["default"],
    options: {},
  },
};

/** Runs the plugin's `createNodes` callback over the given matched files. */
async function createNodes(
  projectConfigurationFiles: string[],
): Promise<unknown> {
  const [, callback] = codependixPlugin.createNodes;

  return await callback(
    projectConfigurationFiles,
    { gateTargetName: "codependix-gate" },
    createMock<CreateNodesContext>({ workspaceRoot: "/workspace" }),
  );
}

describe("codependixPlugin", () => {
  beforeEach(() => {
    pluginService.inferTargets.mockReturnValue(new Map());
  });

  it("declares the glob and name Nx registers it under", () => {
    expect.hasAssertions();

    const [glob] = codependixPlugin.createNodes;

    expect(codependixPlugin.name).toBe("@codependix/nx");
    expect(glob).toBe("**/{project.json,codependix.config.*}");
  });

  it("attaches inferred targets to the project root that owns them", async () => {
    expect.hasAssertions();

    pluginService.inferTargets.mockReturnValue(
      new Map([["packages/alpha", TARGETS]]),
    );

    await expect(
      createNodes(["packages/alpha/project.json"]),
    ).resolves.toStrictEqual([
      [
        "packages/alpha/project.json",
        { projects: { "packages/alpha": { targets: TARGETS } } },
      ],
    ]);
  });

  it("drops a matched file that inference gave no targets", async () => {
    expect.hasAssertions();

    pluginService.inferTargets.mockReturnValue(
      new Map([["packages/alpha", TARGETS]]),
    );

    await expect(
      createNodes([
        "packages/alpha/project.json",
        "project.json",
        "configuration/codependix.config.ts",
      ]),
    ).resolves.toHaveLength(1);
  });

  it("infers the whole workspace in one call, handing it the registration", async () => {
    expect.hasAssertions();

    await createNodes([
      "packages/alpha/project.json",
      "packages/beta/project.json",
    ]);

    expect(pluginService.inferTargets).toHaveBeenCalledTimes(1);
    expect(pluginService.inferTargets).toHaveBeenCalledWith({
      options: { gateTargetName: "codependix-gate" },
      projectConfigurationFiles: [
        "packages/alpha/project.json",
        "packages/beta/project.json",
      ],
      workspaceRoot: "/workspace",
    });
  });
});
