import { createMock } from "@golevelup/ts-vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import gateExecutor from "./executor";

import type { GateService } from "../../modules/gate/gate.service";
import type { ExecutorContext } from "@nx/devkit";

const gateService = createMock<GateService>();

vi.mock("../../modules/plugin/plugin-context.utilities", () => ({
  resolveGateService: async (): Promise<GateService> =>
    await Promise.resolve(gateService),
}));

/**
 * An executor context for a run against one project, or against none.
 *
 * Built literally rather than mocked: `createMock` fabricates every property
 * it is not handed, so Nx omitting `projectName` cannot be expressed with it.
 */
function buildContext(projectName?: string): ExecutorContext {
  return {
    cwd: "/workspace",
    isVerbose: false,
    nxJsonConfiguration: {},
    projectGraph: { dependencies: {}, nodes: {} },
    projectsConfigurations: { projects: {}, version: 2 },
    root: "/workspace",
    ...(projectName === undefined ? {} : { projectName }),
  };
}

describe(gateExecutor, () => {
  beforeEach(() => {
    gateService.run.mockResolvedValue(true);
  });

  it("hands the options, the target's project, and the workspace root to the gate", async () => {
    expect.hasAssertions();

    await gateExecutor({ dependencies: false }, buildContext("alpha"));

    expect(gateService.run).toHaveBeenCalledWith({
      options: { dependencies: false },
      projectName: "alpha",
      workspaceRoot: "/workspace",
    });
  });

  it("passes the task when the gate passed", async () => {
    expect.hasAssertions();

    await expect(
      gateExecutor({}, buildContext("alpha")),
    ).resolves.toStrictEqual({ success: true });
  });

  it("fails the task when the gate failed", async () => {
    expect.hasAssertions();

    gateService.run.mockResolvedValue(false);

    await expect(
      gateExecutor({}, buildContext("alpha")),
    ).resolves.toStrictEqual({ success: false });
  });

  it("runs against no project when Nx names none", async () => {
    expect.hasAssertions();

    await gateExecutor({ tags: ["type:package"] }, buildContext());

    expect(gateService.run).toHaveBeenCalledWith(
      expect.objectContaining({ projectName: undefined }),
    );
  });
});
