import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolvePluginService } from "../../modules/plugin/plugin-context.utilities";

import validateExecutor from "./executor";

import type { ExecutorContext } from "@nx/devkit";

// The plugin service compiles a whole NestJS graph and reads the workspace;
// what this executor owns is the argument shuffling around it.
vi.mock("../../modules/plugin/plugin-context.utilities", () => ({
  resolvePluginService: vi.fn(),
}));

const runValidation = vi.fn();

/** A context shaped the way Nx builds one, with the given projects. */
function createContext(
  args: {
    projectName?: string;
    projects?: Record<string, { root: string; tags?: string[] }>;
  } = {},
): ExecutorContext {
  return {
    cwd: "/w",
    isVerbose: false,
    nxJsonConfiguration: {},
    projectGraph: { dependencies: {}, nodes: {} },
    projectsConfigurations: {
      projects: args.projects ?? { widgets: { root: "packages/widgets" } },
      version: 2,
    },
    root: "/w",
    ...(args.projectName === undefined
      ? {}
      : { projectName: args.projectName }),
  };
}

describe(validateExecutor, () => {
  beforeEach(() => {
    runValidation.mockResolvedValue({ ok: true, report: "All good." });
    // type-coverage:ignore-next-line -- a deliberate stand-in for the service
    vi.mocked(resolvePluginService).mockResolvedValue({
      runValidation,
    } as unknown as Awaited<ReturnType<typeof resolvePluginService>>);
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    runValidation.mockReset();
  });

  it("refuses to run outside a project", async () => {
    await expect(validateExecutor({}, createContext())).rejects.toThrow(
      "must be run against a project",
    );
  });

  it("refuses to run against a project the graph does not hold", async () => {
    await expect(
      validateExecutor({}, createContext({ projectName: "missing" })),
    ).rejects.toThrow("Unknown project: missing.");
  });

  it("validates the project and reports what it found", async () => {
    const result = await validateExecutor(
      {},
      createContext({ projectName: "widgets" }),
    );

    expect(runValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        project: {
          name: "widgets",
          root: "packages/widgets",
          tags: ["name:widgets"],
        },
        workspaceRoot: "/w",
      }),
    );
    expect(process.stdout.write).toHaveBeenCalledWith("All good.\n");
    expect(result).toStrictEqual({ success: true });
  });

  it("carries the project's own tags through", async () => {
    await validateExecutor(
      {},
      createContext({
        projectName: "widgets",
        projects: {
          widgets: { root: "packages/widgets", tags: ["type:package"] },
        },
      }),
    );

    expect(runValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        project: {
          name: "widgets",
          root: "packages/widgets",
          tags: ["type:package", "name:widgets"],
        },
      }),
    );
  });

  it("passes a language filter through when the caller set one", async () => {
    await validateExecutor(
      { languages: ["typescript"] },
      createContext({ projectName: "widgets" }),
    );

    expect(runValidation).toHaveBeenCalledWith(
      expect.objectContaining({ languageNames: ["typescript"] }),
    );
  });

  it("passes a run-level threshold through when the caller set one", async () => {
    await validateExecutor(
      { threshold: 0.9 },
      createContext({ projectName: "widgets" }),
    );

    expect(runValidation).toHaveBeenCalledWith(
      expect.objectContaining({ threshold: 0.9 }),
    );
  });

  it("fails the task when an instance does not conform", async () => {
    runValidation.mockResolvedValue({ ok: false, report: "1 finding." });

    const result = await validateExecutor(
      {},
      createContext({ projectName: "widgets" }),
    );

    expect(result).toStrictEqual({ success: false });
  });
});
