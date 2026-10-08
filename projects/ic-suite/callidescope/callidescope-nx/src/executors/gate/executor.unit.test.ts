import { createMock } from "@golevelup/ts-vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OptionsService } from "../../modules/options/options.service";
import { EMPTY_SCOPE_REPORT } from "../../modules/plugin/plugin.constants";

import gateExecutor from "./executor";

import type { PluginService } from "../../modules/plugin/plugin.service";
import type { ResolvedTraceScope } from "../../modules/plugin/plugin.types";
import type { ExecutorContext } from "@nx/devkit";

const pluginService = createMock<PluginService>();

vi.mock("../../modules/plugin/plugin-context.utilities", () => ({
  resolveOptionsService: async (): Promise<OptionsService> =>
    await Promise.resolve(new OptionsService()),
  resolvePluginService: async (): Promise<PluginService> =>
    await Promise.resolve(pluginService),
}));

/**
 * An executor context for a run against one project, or against none.
 *
 * Built literally rather than mocked: `createMock` fabricates every property
 * it is not handed, so Nx omitting `projectName` when a target is not run
 * against a project cannot be expressed with it at all.
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

/** A resolved scope with nothing refused, overridable per test. */
function buildScope(
  overrides: Partial<ResolvedTraceScope> = {},
): ResolvedTraceScope {
  return {
    directories: ["packages/alpha"],
    knownNames: ["alpha"],
    knownTags: ["type:package"],
    projectNames: ["alpha"],
    selectedDirectories: ["packages/alpha"],
    unknownNames: [],
    unmatchedTags: [],
    ...overrides,
  };
}

describe(gateExecutor, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginService.resolveTraceScope.mockResolvedValue(buildScope());
    pluginService.describeRefusedScope.mockReturnValue("Unknown Nx projects.");
    pluginService.runGate.mockResolvedValue({
      ok: true,
      report: "## Call stacks over the depth limit (0)",
    });
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
  });

  it("gates the project the target belongs to when nothing else is named", async () => {
    expect.hasAssertions();

    await expect(
      gateExecutor({}, buildContext("alpha")),
    ).resolves.toStrictEqual({ success: true });
    expect(pluginService.resolveTraceScope).toHaveBeenCalledWith({
      projectNames: ["alpha"],
      tags: [],
      withDependencies: true,
    });
  });

  it("fails the task when something broke a limit", async () => {
    expect.hasAssertions();

    pluginService.runGate.mockResolvedValue({
      ok: false,
      report: "## Call stacks over the depth limit (1)",
    });

    await expect(
      gateExecutor({}, buildContext("alpha")),
    ).resolves.toStrictEqual({ success: false });
    // The findings still reach stdout: a failing gate is exactly when the
    // reader needs to see what tripped it.
    expect(process.stdout.write).toHaveBeenCalledWith(
      "## Call stacks over the depth limit (1)\n",
    );
  });

  it("prints the findings of a gate that passed", async () => {
    expect.hasAssertions();

    await gateExecutor({}, buildContext("alpha"));

    expect(process.stdout.write).toHaveBeenCalledWith(
      "## Call stacks over the depth limit (0)\n",
    );
  });

  it("prefers a named selection over the target's own project", async () => {
    expect.hasAssertions();

    await gateExecutor(
      { projects: ["beta"], tags: ["type:package"] },
      buildContext("alpha"),
    );

    expect(pluginService.resolveTraceScope).toHaveBeenCalledWith({
      projectNames: ["beta"],
      tags: ["type:package"],
      withDependencies: true,
    });
  });

  it("passes a configuration path straight through to the gate", async () => {
    expect.hasAssertions();

    await gateExecutor(
      { configurationPath: "elsewhere.ts" },
      buildContext("alpha"),
    );

    expect(pluginService.runGate).toHaveBeenCalledWith(
      expect.objectContaining({ configurationPath: "elsewhere.ts" }),
    );
  });

  it("passes withDependencies false straight through", async () => {
    expect.hasAssertions();

    await gateExecutor({ withDependencies: false }, buildContext("alpha"));

    expect(pluginService.resolveTraceScope).toHaveBeenCalledWith(
      expect.objectContaining({ withDependencies: false }),
    );
  });

  it("fails the task when a named project does not exist", async () => {
    expect.hasAssertions();

    pluginService.resolveTraceScope.mockResolvedValue(
      buildScope({ unknownNames: ["absent"] }),
    );

    // Narrowing the run instead would pass while gating less than asked.
    await expect(
      gateExecutor({ projects: ["absent"] }, buildContext("alpha")),
    ).rejects.toThrow("Unknown Nx projects.");
    expect(pluginService.runGate).not.toHaveBeenCalled();
  });

  it("refuses a run with no project and no selection", async () => {
    expect.hasAssertions();

    await expect(gateExecutor({}, buildContext())).rejects.toThrow(
      "must be run against a project",
    );
  });

  it("fails without tracing when the selection resolved to nothing", async () => {
    expect.hasAssertions();

    pluginService.resolveTraceScope.mockResolvedValue(
      buildScope({ directories: [], projectNames: [] }),
    );

    // A gate with nothing to trace has no verdict to record, so it must not
    // record a passing one — and it says so, rather than failing mutely.
    await expect(
      gateExecutor({}, buildContext("alpha")),
    ).resolves.toStrictEqual({ success: false });
    expect(pluginService.runGate).not.toHaveBeenCalled();
    expect(process.stdout.write).toHaveBeenCalledWith(
      `${EMPTY_SCOPE_REPORT}\n`,
    );
  });

  it("forwards the resolved scope to the gate unchanged", async () => {
    expect.hasAssertions();

    await gateExecutor({}, buildContext("alpha"));

    // Pinned exactly rather than partially: the scope-to-gate mapping is the
    // whole of what this executor does with what it resolved.
    expect(pluginService.runGate).toHaveBeenCalledWith({
      directories: ["packages/alpha"],
      judgedProjectNames: ["packages/alpha"],
      workspaceRoot: "/workspace",
    });
  });
});
