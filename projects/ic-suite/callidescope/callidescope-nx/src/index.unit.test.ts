import { createMock } from "@golevelup/ts-vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import callidescopePlugin from "./index";

import type { PluginService } from "./modules/plugin/plugin.service";
import type { InferredTargets } from "./modules/plugin/plugin.types";
import type { CreateNodesContext } from "@nx/devkit";

const pluginService = createMock<PluginService>();

vi.mock("./modules/plugin/plugin-context.utilities", () => ({
  resolveOptionsService: vi.fn<() => void>(),
  resolvePluginService: async (): Promise<PluginService> =>
    await Promise.resolve(pluginService),
  resolveProjectsService: vi.fn<() => void>(),
}));

/** One project's inferred trace target. */
const TARGETS: InferredTargets = {
  callidescope: {
    cache: true,
    executor: "@callidescope/nx:trace",
    options: {},
  },
};

/** Runs the plugin's `createNodes` callback over the given matched files. */
async function createNodes(
  projectConfigurationFiles: string[],
): Promise<unknown> {
  const [, callback] = callidescopePlugin.createNodes;

  return await callback(
    projectConfigurationFiles,
    {},
    createMock<CreateNodesContext>({ workspaceRoot: "/workspace" }),
  );
}

describe("callidescopePlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginService.inferTargets.mockResolvedValue(new Map());
  });

  it("declares the glob and name Nx registers it under", () => {
    expect.hasAssertions();

    const [glob] = callidescopePlugin.createNodes;

    expect(callidescopePlugin.name).toBe("@callidescope/nx");
    // The configuration joins the glob so that editing a limit re-runs
    // inference rather than leaving the daemon on a stale result.
    expect(glob).toBe("**/{project.json,callidescope.config.*}");
  });

  it("attaches inferred targets to the project root that owns them", async () => {
    expect.hasAssertions();

    pluginService.inferTargets.mockResolvedValue(
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

    pluginService.inferTargets.mockResolvedValue(
      new Map([["packages/alpha", TARGETS]]),
    );

    await expect(
      createNodes([
        "packages/alpha/project.json",
        "applications/affirmancy/project.json",
        "configuration/callidescope.config.ts",
      ]),
    ).resolves.toHaveLength(1);
  });

  it("reads the whole workspace once rather than once per project", async () => {
    expect.hasAssertions();

    await createNodes([
      "packages/alpha/project.json",
      "packages/beta/project.json",
    ]);

    expect(pluginService.inferTargets).toHaveBeenCalledTimes(1);
  });
});
