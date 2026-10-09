import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import gateExecutor from "./executor";

import type { GateExecutorOptions } from "./executor.types";
import type { ExecutorContext } from "@nx/devkit";

/**
 * Where fixture workspaces are written: inside this package, never the
 * operating system's temporary directory. The command line runs under the
 * `@swc-node/register` loader, which resolves its own helpers from the
 * importing file's directory — so a fixture outside the workspace passes on
 * macOS and fails on every Linux runner.
 */
const FIXTURE_ROOT = path.resolve(import.meta.dirname, "../../../tmp");

/** Long enough for one cold command-line boot on a slow CI runner. */
const RUN_TIMEOUT = 180_000;

/**
 * An executor context for a run against one project of the fixture workspace.
 *
 * Built literally rather than mocked, because `createMock` fabricates every
 * property it is not handed.
 */
function buildContext(args: {
  projectName: string;
  workspaceRoot: string;
}): ExecutorContext {
  return {
    cwd: args.workspaceRoot,
    isVerbose: false,
    nxJsonConfiguration: {},
    projectGraph: { dependencies: {}, nodes: {} },
    projectName: args.projectName,
    projectsConfigurations: { projects: {}, version: 2 },
    root: args.workspaceRoot,
  };
}

/**
 * Writes a fixture workspace: `a → b` is forbidden, and `c` depends on `a`.
 *
 * The configuration path is named only in the fixture's `nx.json`, which is
 * what proves the executor reads its registration back rather than assuming
 * a conventional path — none of the conventional names exist here. The Nx
 * graph is a file the configuration points at, so no Nx workspace has to be
 * built underneath the fixture.
 */
function writeFixtureWorkspace(): string {
  mkdirSync(FIXTURE_ROOT, { recursive: true });

  const workspaceRoot = mkdtempSync(
    path.join(FIXTURE_ROOT, "codependix-gate-"),
  );
  const projects = ["a", "b", "c"];
  const edges: Record<string, string[]> = { a: ["b"], b: [], c: ["a"] };

  writeFileSync(
    path.join(workspaceRoot, "nx.json"),
    JSON.stringify({
      plugins: [
        {
          options: { configurationPath: "boundaries.config.json" },
          plugin: "@codependix/nx",
        },
      ],
    }),
  );
  writeFileSync(
    path.join(workspaceRoot, "boundaries.config.json"),
    JSON.stringify({
      boundaries: {
        nxProjects: [
          {
            from: { id: ["a"] },
            kind: "forbid",
            name: "a-is-a-leaf",
            to: { id: ["b"] },
          },
        ],
      },
      projectGraph: "codependix-graph.json",
    }),
  );
  writeFileSync(
    path.join(workspaceRoot, "codependix-graph.json"),
    JSON.stringify({
      dependencies: Object.fromEntries(
        projects.map((source) => [
          source,
          (edges[source] ?? []).map((target) => ({
            source,
            target,
            type: "static",
          })),
        ]),
      ),
      nodes: Object.fromEntries(
        projects.map((name) => [
          name,
          {
            data: { root: `packages/${name}`, tags: [`name:${name}`] },
            name,
            type: "lib",
          },
        ]),
      ),
    }),
  );
  // The loader reads the compiler options beside the working directory, and
  // the command line's own sources need decorator metadata emitted.
  writeFileSync(
    path.join(workspaceRoot, "tsconfig.json"),
    JSON.stringify({
      extends: path.relative(
        workspaceRoot,
        path.resolve(import.meta.dirname, "../../../tsconfig.json"),
      ),
    }),
  );

  return workspaceRoot;
}

describe("gate executor against a fixture workspace", () => {
  let workspaceRoot: string;
  let printed: string;

  /** Runs the real executor, collecting everything the command line printed. */
  async function runGate(args: {
    options?: GateExecutorOptions;
    projectName: string;
  }): Promise<{ success: boolean }> {
    return await gateExecutor(
      args.options ?? {},
      buildContext({ projectName: args.projectName, workspaceRoot }),
    );
  }

  beforeAll(() => {
    workspaceRoot = writeFixtureWorkspace();
  });

  beforeEach(() => {
    printed = "";
    // A spawned process inherits FORCE_COLOR, and the logger would then
    // interleave ANSI codes with the text asserted on below.
    vi.stubEnv("FORCE_COLOR", "0");

    const collect = (chunk: unknown): boolean => {
      printed += String(chunk);

      return true;
    };

    vi.spyOn(process.stdout, "write").mockImplementation(collect);
    vi.spyOn(process.stderr, "write").mockImplementation(collect);
  });

  afterAll(() => {
    rmSync(workspaceRoot, { force: true, recursive: true });
  });

  it(
    "fails the project a forbidden edge leaves, naming the rule",
    async () => {
      expect.hasAssertions();

      await expect(runGate({ projectName: "a" })).resolves.toStrictEqual({
        success: false,
      });
      expect(printed).toContain("a-is-a-leaf");
    },
    RUN_TIMEOUT,
  );

  it(
    "passes the project a forbidden edge reaches",
    async () => {
      expect.hasAssertions();

      await expect(runGate({ projectName: "b" })).resolves.toStrictEqual({
        success: true,
      });
    },
    RUN_TIMEOUT,
  );

  it(
    "passes a dependent of the failing project, noting the finding in its dependency",
    async () => {
      expect.hasAssertions();

      await expect(runGate({ projectName: "c" })).resolves.toStrictEqual({
        success: true,
      });
      expect(printed).toContain("in dependency a");
    },
    RUN_TIMEOUT,
  );

  it(
    "builds over the judged project alone when dependencies is false",
    async () => {
      expect.hasAssertions();

      await expect(
        runGate({ options: { dependencies: false }, projectName: "c" }),
      ).resolves.toStrictEqual({ success: true });
      expect(printed).not.toContain("a-is-a-leaf");
    },
    RUN_TIMEOUT,
  );

  it(
    "judges the named projects instead of the target's own",
    async () => {
      expect.hasAssertions();

      await expect(
        runGate({ options: { projects: ["b", "a"] }, projectName: "c" }),
      ).resolves.toStrictEqual({ success: false });
    },
    RUN_TIMEOUT,
  );

  it(
    "judges every project a tag selects",
    async () => {
      expect.hasAssertions();

      await expect(
        runGate({ options: { tags: ["name:a"] }, projectName: "c" }),
      ).resolves.toStrictEqual({ success: false });
      expect(printed).toContain("a-is-a-leaf");
    },
    RUN_TIMEOUT,
  );
});
