import { createMock } from "@golevelup/ts-vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OptionsService } from "../../modules/options/options.service";

import traceExecutor from "./executor";

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
 * it is not handed, through a proxy that regenerates them on access, so the
 * one case that matters here — Nx omitting `projectName` when a target is not
 * run against a project — cannot be expressed with it at all.
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

describe(traceExecutor, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginService.resolveTraceScope.mockResolvedValue(buildScope());
    pluginService.describeRefusedScope.mockReturnValue("Unknown Nx projects.");
    pluginService.runTrace.mockResolvedValue({ ok: true, report: "# Report" });
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
  });

  it("traces the project the target belongs to when nothing else is named", async () => {
    expect.hasAssertions();

    await expect(
      traceExecutor({}, buildContext("alpha")),
    ).resolves.toStrictEqual({ success: true });
    expect(pluginService.resolveTraceScope).toHaveBeenCalledWith({
      projectNames: ["alpha"],
      tags: [],
      withDependencies: true,
    });
  });

  it("hands the trace the closure to read and the selection to judge", async () => {
    expect.hasAssertions();

    pluginService.resolveTraceScope.mockResolvedValue(
      buildScope({
        directories: ["packages/alpha", "packages/beta"],
        projectNames: ["alpha", "beta"],
        selectedDirectories: ["packages/alpha"],
      }),
    );

    await traceExecutor({}, buildContext("alpha"));

    expect(pluginService.runTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        directories: ["packages/alpha", "packages/beta"],
        judgedProjectNames: ["packages/alpha"],
      }),
    );
  });

  it("prints the report to stdout", async () => {
    expect.hasAssertions();

    await traceExecutor({}, buildContext("alpha"));

    expect(process.stdout.write).toHaveBeenCalledWith("# Report\n");
  });

  it("prefers a named selection over the target's own project", async () => {
    expect.hasAssertions();

    await traceExecutor(
      { projects: ["beta"], tags: ["type:package"] },
      buildContext("alpha"),
    );

    expect(pluginService.resolveTraceScope).toHaveBeenCalledWith({
      projectNames: ["beta"],
      tags: ["type:package"],
      withDependencies: true,
    });
  });

  it("passes withDependencies false straight through", async () => {
    expect.hasAssertions();

    await traceExecutor({ withDependencies: false }, buildContext("alpha"));

    expect(pluginService.resolveTraceScope).toHaveBeenCalledWith(
      expect.objectContaining({ withDependencies: false }),
    );
  });

  it("passes a configuration path straight through to the trace", async () => {
    expect.hasAssertions();

    await traceExecutor(
      { configurationPath: "elsewhere.ts" },
      buildContext("alpha"),
    );

    expect(pluginService.runTrace).toHaveBeenCalledWith(
      expect.objectContaining({ configurationPath: "elsewhere.ts" }),
    );
  });

  it("fails the task when a named project does not exist", async () => {
    expect.hasAssertions();

    pluginService.resolveTraceScope.mockResolvedValue(
      buildScope({ unknownNames: ["absent"] }),
    );

    // Narrowing the run instead would pass while measuring less than asked.
    await expect(
      traceExecutor({ projects: ["absent"] }, buildContext("alpha")),
    ).rejects.toThrow("Unknown Nx projects.");
    expect(pluginService.runTrace).not.toHaveBeenCalled();
  });

  it("fails the task when a named tag matches nothing", async () => {
    expect.hasAssertions();

    pluginService.resolveTraceScope.mockResolvedValue(
      buildScope({ unmatchedTags: ["typ:package"] }),
    );

    await expect(
      traceExecutor({ tags: ["typ:package"] }, buildContext("alpha")),
    ).rejects.toThrow("Unknown Nx projects.");
  });

  it("names an unknown project and an unmatched tag in one failure", async () => {
    expect.hasAssertions();

    pluginService.resolveTraceScope.mockResolvedValue(
      buildScope({ unknownNames: ["absent"], unmatchedTags: ["typ:package"] }),
    );

    await expect(
      traceExecutor(
        { projects: ["absent"], tags: ["typ:package"] },
        buildContext("alpha"),
      ),
    ).rejects.toThrow("Unknown Nx projects.");
    expect(pluginService.describeRefusedScope).toHaveBeenCalledWith(
      expect.objectContaining({
        unknownNames: ["absent"],
        unmatchedTags: ["typ:package"],
      }),
    );
  });

  it("refuses a run with no project and no selection", async () => {
    expect.hasAssertions();

    await expect(traceExecutor({}, buildContext())).rejects.toThrow(
      "must be run against a project",
    );
  });

  it("succeeds without tracing when the selection resolved to nothing", async () => {
    expect.hasAssertions();

    pluginService.resolveTraceScope.mockResolvedValue(
      buildScope({ directories: [], projectNames: [] }),
    );

    await expect(
      traceExecutor({}, buildContext("alpha")),
    ).resolves.toStrictEqual({ success: true });
    expect(pluginService.runTrace).not.toHaveBeenCalled();
  });

  it("fails the task when the trace found something over a limit", async () => {
    expect.hasAssertions();

    pluginService.runTrace.mockResolvedValue({ ok: false, report: "# Report" });

    await expect(
      traceExecutor({}, buildContext("alpha")),
    ).resolves.toStrictEqual({ success: false });
    // The report still reaches stdout: a failing gate is exactly when the
    // reader needs to see which stacks tripped it.
    expect(process.stdout.write).toHaveBeenCalledWith("# Report\n");
  });
});
