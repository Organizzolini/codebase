import { ChildProcess, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { pathToFileURL } from "node:url";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PluginService } from "../plugin/plugin.service";

import { GateService } from "./gate.service";

import type { GateHasherContext } from "./gate.types";
import type { Hash, Task, TaskGraph, TaskHasher } from "@nx/devkit";
import type * as ChildProcessModule from "node:child_process";

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof ChildProcessModule>()),
  spawn: vi.fn<() => void>(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn<() => boolean>(() => false),
  readFileSync: vi.fn<() => string>(() => "{}"),
}));

/** A child process that prints, then exits with the given code or fails. */
function buildChild(args: {
  error?: Error;
  exitCode: null | number;
  standardError?: string;
  standardOutput?: string;
}): ChildProcess {
  const child = new ChildProcess();
  const stdout = new PassThrough();
  const stderr = new PassThrough();

  child.stdout = stdout;
  child.stderr = stderr;

  setImmediate(() => {
    stdout.end(args.standardOutput ?? "");
    stderr.end(args.standardError ?? "");
    if (args.error === undefined) {
      child.emit("close", args.exitCode);
    } else {
      child.emit("error", args.error);
    }
  });

  return child;
}

/** The arguments the gate's last spawn was handed. */
function spawnedArguments(): readonly string[] {
  const [, argv] = vi.mocked(spawn).mock.lastCall ?? [];

  return argv ?? [];
}

describe(GateService, () => {
  let service: GateService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [GateService, PluginService],
    }).compile();

    service = await module.resolve(GateService);
  });

  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue("{}");
    vi.mocked(spawn).mockReturnValue(buildChild({ exitCode: 0 }));
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
    vi.spyOn(process.stderr, "write").mockReturnValue(true);
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("buildCommandArguments", () => {
    const base = {
      cliEntryPath: "/cli/main.ts",
      configurationPath: "configuration/codependix.config.ts",
      dependencies: true,
      loaderUrl: "file:///plugin/loader.js",
      projects: ["alpha"],
      tags: [],
      workspaceRoot: "/workspace",
    };

    it("checks the boundaries of the named projects through the loader shim", () => {
      expect.hasAssertions();

      expect(service.buildCommandArguments(base)).toStrictEqual([
        "--import",
        "file:///plugin/loader.js",
        "/cli/main.ts",
        "map",
        "--directory",
        "/workspace",
        "--config",
        "configuration/codependix.config.ts",
        "--check",
        "boundaries",
        "--projects",
        "alpha",
      ]);
    });

    it("joins several projects and tags with commas", () => {
      expect.hasAssertions();

      expect(
        service.buildCommandArguments({
          ...base,
          projects: ["alpha", "beta"],
          tags: ["type:package", "layer:cli"],
        }),
      ).toStrictEqual(
        expect.arrayContaining([
          "--projects",
          "alpha,beta",
          "--tags",
          "type:package,layer:cli",
        ]),
      );
    });

    it("selects by tags alone when no project is named", () => {
      expect.hasAssertions();

      const argv = service.buildCommandArguments({
        ...base,
        projects: [],
        tags: ["type:package"],
      });

      expect(argv).not.toContain("--projects");
      expect(argv.slice(-2)).toStrictEqual(["--tags", "type:package"]);
    });

    it("narrows the build to the named set under dependencies false", () => {
      expect.hasAssertions();

      expect(
        service.buildCommandArguments({ ...base, dependencies: false }).at(-1),
      ).toBe("--no-dependencies");
    });
  });

  describe("resolveConfigurationPath", () => {
    it("uses a path the target was given without reading nx.json", () => {
      expect.hasAssertions();

      expect(
        service.resolveConfigurationPath({
          configurationPath: "elsewhere.ts",
          workspaceRoot: "/workspace",
        }),
      ).toBe("elsewhere.ts");
      expect(readFileSync).not.toHaveBeenCalled();
    });

    it("re-reads the path this plugin was registered with from nx.json", () => {
      expect.hasAssertions();

      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          plugins: [
            {
              options: { configurationPath: "registered.config.ts" },
              plugin: "@codependix/nx",
            },
          ],
        }),
      );

      expect(
        service.resolveConfigurationPath({ workspaceRoot: "/workspace" }),
      ).toBe("registered.config.ts");
      expect(readFileSync).toHaveBeenCalledWith("/workspace/nx.json", "utf8");
    });

    it("searches the conventional paths when nx.json cannot be read", () => {
      expect.hasAssertions();

      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });
      vi.mocked(existsSync).mockImplementation(
        (candidatePath) =>
          candidatePath === "/workspace/configuration/codependix.config.ts",
      );

      expect(
        service.resolveConfigurationPath({ workspaceRoot: "/workspace" }),
      ).toBe("configuration/codependix.config.ts");
    });
  });

  describe("resolveSelection", () => {
    it("selects the project the target belongs to when nothing is named", () => {
      expect.hasAssertions();

      expect(
        service.resolveSelection({ options: {}, projectName: "alpha" }),
      ).toStrictEqual({ projects: ["alpha"], tags: [] });
    });

    it("prefers a named selection over the target's own project", () => {
      expect.hasAssertions();

      expect(
        service.resolveSelection({
          options: { projects: ["beta"], tags: ["type:package"] },
          projectName: "alpha",
        }),
      ).toStrictEqual({ projects: ["beta"], tags: ["type:package"] });
    });

    it("splits, trims, and drops blanks from a comma-separated selection", () => {
      expect.hasAssertions();

      expect(
        service.resolveSelection({
          options: { projects: ["a, b,", " c "], tags: ["type:package,"] },
          projectName: "alpha",
        }),
      ).toStrictEqual({ projects: ["a", "b", "c"], tags: ["type:package"] });
    });

    it("treats a selection of blanks as no selection at all", () => {
      expect.hasAssertions();

      expect(
        service.resolveSelection({
          options: { projects: [" ,"], tags: [] },
          projectName: "alpha",
        }),
      ).toStrictEqual({ projects: ["alpha"], tags: [] });
    });

    it("refuses a run with no project and no selection", () => {
      expect.hasAssertions();

      expect(() =>
        service.resolveSelection({ options: {}, projectName: undefined }),
      ).toThrow("must be run against a project");
    });
  });

  describe("run", () => {
    it("runs the codependix command line from the workspace root", async () => {
      expect.hasAssertions();

      await service.run({
        options: { configurationPath: "codependix.config.ts" },
        projectName: "alpha",
        workspaceRoot: "/workspace",
      });

      expect(spawn).toHaveBeenCalledWith(
        process.execPath,
        expect.any(Array),
        expect.objectContaining({ cwd: "/workspace" }),
      );
    });

    it("resolves the command line through its package exports", async () => {
      expect.hasAssertions();

      await service.run({
        options: {},
        projectName: "alpha",
        workspaceRoot: "/workspace",
      });

      const entry = spawnedArguments()[2];

      expect(entry).toMatch(/codependix-cli\/src\/main\.ts$/u);
    });

    it("registers the swc loader through this plugin's own shim, by file URL", async () => {
      expect.hasAssertions();

      await service.run({
        options: {},
        projectName: "alpha",
        workspaceRoot: "/workspace",
      });

      const [flag, loader] = spawnedArguments();

      // A file URL rather than the hook's bare specifier: a bare one resolves
      // from the working directory, which is the consumer's workspace root,
      // and only this plugin is guaranteed to have the hook installed.
      expect(flag).toBe("--import");
      expect(loader).toBe(
        pathToFileURL(
          path.resolve(import.meta.dirname, "../../executors/gate/loader.mjs"),
        ).href,
      );
    });

    it("passes when the command line exits zero", async () => {
      expect.hasAssertions();

      await expect(
        service.run({
          options: {},
          projectName: "alpha",
          workspaceRoot: "/workspace",
        }),
      ).resolves.toBe(true);
    });

    it.each([
      ["exits non-zero", 1],
      ["is killed by a signal", null],
    ])("fails when the command line %s", async (_description, exitCode) => {
      expect.hasAssertions();

      vi.mocked(spawn).mockReturnValue(buildChild({ exitCode }));

      await expect(
        service.run({
          options: {},
          projectName: "alpha",
          workspaceRoot: "/workspace",
        }),
      ).resolves.toBe(false);
    });

    it("streams what the command line prints to the task's own streams", async () => {
      expect.hasAssertions();

      vi.mocked(spawn).mockReturnValue(
        buildChild({
          exitCode: 1,
          standardError: "a boundary finding",
          standardOutput: "a report",
        }),
      );

      await service.run({
        options: {},
        projectName: "alpha",
        workspaceRoot: "/workspace",
      });

      expect(process.stdout.write).toHaveBeenCalledWith(
        Buffer.from("a report"),
      );
      expect(process.stderr.write).toHaveBeenCalledWith(
        Buffer.from("a boundary finding"),
      );
    });

    it("rejects when the command line cannot be started", async () => {
      expect.hasAssertions();

      vi.mocked(spawn).mockReturnValue(
        buildChild({ error: new Error("spawn ENOENT"), exitCode: null }),
      );

      await expect(
        service.run({
          options: {},
          projectName: "alpha",
          workspaceRoot: "/workspace",
        }),
      ).rejects.toThrow("spawn ENOENT");
    });
  });

  describe("hashTask", () => {
    const hash: Hash = { details: { command: "c", nodes: {} }, value: "own" };

    /** Nx's own hasher, answering every task with `hash`. */
    const hashTask =
      vi.fn<
        (
          task: Task,
          taskGraph?: TaskGraph,
          env?: NodeJS.ProcessEnv,
        ) => Promise<Hash>
      >();

    beforeEach(() => {
      hashTask.mockResolvedValue(hash);
    });

    /**
     * A hashing context whose `alpha` gate is configured with the given
     * options, and whose hasher is `hashTask`.
     */
    function buildHasherContext(
      configured: Record<string, unknown> = {},
    ): GateHasherContext {
      return {
        env: { CI: "true" },
        hasher: createMock<TaskHasher>({ hashTask }),
        nxJsonConfiguration: {},
        projectGraph: { dependencies: {}, nodes: {} },
        projectsConfigurations: {
          projects: {
            alpha: {
              root: "packages/alpha",
              targets: {
                "codependix-gate": {
                  configurations: { judged: { tags: ["type:package"] } },
                  options: configured,
                },
              },
            },
          },
          version: 2,
        },
        taskGraph: {
          continuousDependencies: {},
          dependencies: {},
          roots: [],
          tasks: {},
        },
      };
    }

    /** The `alpha` gate task, run with the given overrides. */
    function buildTask(args: {
      configuration?: string;
      overrides?: Record<string, unknown>;
    }): Task {
      return {
        cache: true,
        id: "alpha:codependix-gate",
        outputs: [],
        overrides: args.overrides ?? {},
        target: {
          project: "alpha",
          target: "codependix-gate",
          ...(args.configuration === undefined
            ? {}
            : { configuration: args.configuration }),
        },
      };
    }

    it.each([
      ["no selection", {}],
      ["its own project, named", { projects: "alpha" }],
      ["a selection of blanks", { projects: " ,", tags: [""] }],
    ])(
      "hashes a run judging only its own project from its inputs, given %s",
      async (_description, overrides) => {
        expect.hasAssertions();

        const context = buildHasherContext();
        const task = buildTask({ overrides });

        await expect(service.hashTask({ context, task })).resolves.toBe(hash);
        expect(hashTask).toHaveBeenCalledWith(task, context.taskGraph, {
          CI: "true",
        });
      },
    );

    it.each([
      ["projects on the command line", { overrides: { projects: "beta" } }],
      ["several projects", { overrides: { projects: ["alpha", "beta"] } }],
      ["tags on the command line", { overrides: { tags: "type:package" } }],
      ["a numeric project name", { overrides: { projects: 7 } }],
      ["a configuration selecting tags", { configuration: "judged" }],
    ])(
      "never replays a run judging other projects, given %s",
      async (_description, run) => {
        expect.hasAssertions();

        const context = buildHasherContext();
        const first = await service.hashTask({ context, task: buildTask(run) });
        const second = await service.hashTask({
          context,
          task: buildTask(run),
        });

        // The inputs only cover the target's own project, so no hash built
        // from them could notice an edit to another one.
        expect(first.value).not.toBe(second.value);
        expect(hashTask).not.toHaveBeenCalled();
      },
    );

    it("never replays a run whose target options select other projects", async () => {
      expect.hasAssertions();

      const context = buildHasherContext({ projects: ["beta"] });

      await expect(
        service.hashTask({ context, task: buildTask({}) }),
      ).resolves.not.toBe(hash);
      expect(hashTask).not.toHaveBeenCalled();
    });

    it("hashes with the process environment when Nx hands none", async () => {
      expect.hasAssertions();

      const { env: _env, ...context } = buildHasherContext();

      await service.hashTask({ context, task: buildTask({}) });

      expect(hashTask).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        process.env,
      );
    });
  });
});
