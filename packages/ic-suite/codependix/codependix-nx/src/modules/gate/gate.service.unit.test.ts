import { ChildProcess, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { PassThrough } from "node:stream";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PluginService } from "../plugin/plugin.service";

import { GateService } from "./gate.service";

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
      loaderSpecifier: "@swc-node/register/esm-register",
      projects: ["alpha"],
      tags: [],
      workspaceRoot: "/workspace",
    };

    it("checks the boundaries of the named projects through the swc loader", () => {
      expect.hasAssertions();

      expect(service.buildCommandArguments(base)).toStrictEqual([
        "--import",
        "@swc-node/register/esm-register",
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

    it("resolves the command line through its package exports, under the swc loader", async () => {
      expect.hasAssertions();

      await service.run({
        options: {},
        projectName: "alpha",
        workspaceRoot: "/workspace",
      });

      const [flag, loader, entry] = spawnedArguments();

      expect(flag).toBe("--import");
      expect(loader).toBe("@swc-node/register/esm-register");
      expect(entry).toMatch(/codependix-cli\/src\/main\.ts$/u);
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
});
