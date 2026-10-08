import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { environmentSchema } from "./constants";

/** This package's own `main.ts`, spawned the way the `start` target does. */
const ENTRY_POINT = path.resolve(import.meta.dirname, "main.ts");

/**
 * The TypeScript loader, as an absolute URL resolved from this file.
 *
 * The package's own `esm-register` entry registers the hook against the
 * working directory, and every run below sets that to a throwaway workspace
 * with no `node_modules` in it. Registering the resolved hook directly is
 * what makes the loader independent of where the command is run from.
 */
const LOADER_HOOK = import.meta.resolve("@swc-node/register/esm");

/**
 * Milliseconds one spawned run is allowed, well above what it needs.
 *
 * Every test below spawns this package's real `main.ts` through the TypeScript
 * loader and lets it build a `ts.Program` per project in a throwaway
 * workspace. Vitest's default is five seconds, which is a unit-test budget: on
 * a developer machine each of these takes one to two, and on a continuous
 * integration runner two of them measured 5.4 and 5.7 — so the default failed
 * them for being what they are rather than for anything they did. This
 * repository's own guidance puts an end-to-end test at thirty to sixty
 * seconds, and thirty leaves several times the headroom the slowest observed
 * run used.
 */
const SPAWNED_RUN_TIMEOUT = 30_000;

/**
 * The compiler options the spawned run reads.
 *
 * Not optional: NestJS constructor injection reads the metadata
 * `emitDecoratorMetadata` emits, and a loader falling back to its own
 * defaults produces a CLI whose every command is missing its dependencies.
 */
const LOADER_PROJECT = path.resolve(import.meta.dirname, "..", "tsconfig.json");

/**
 * Runs the `callidescope` command against a workspace, and returns its exit
 * code.
 *
 * A real process rather than a resolved command, because the exit code is the
 * whole subject: nest-commander's default handler writes a thrown error to
 * stderr and leaves the code at zero, which no in-process test of the command
 * can see.
 */
function runCallidescope(workspaceRoot: string): {
  output: string;
  status: null | number;
} {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      pathToFileURL(path.join(workspaceRoot, "register.mjs")).toString(),
      ENTRY_POINT,
      "callidescope",
      "--config",
      path.join(workspaceRoot, "callidescope.config.json"),
      "--check",
      "depth",
    ],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env, SWC_NODE_PROJECT: LOADER_PROJECT },
    },
  );

  return {
    output: `${result.stdout}${result.stderr}`,
    status: result.status,
  };
}

/**
 * Writes one project's own complete configuration file.
 *
 * Every traced project declares one, so a fixture project without one is a
 * refusal rather than a project judged by the run. JavaScript rather than
 * JSON, because `undefined` is what a project writes to gate no breadth and
 * publish nothing, and JSON cannot spell it.
 */
function writeProjectConfiguration(projectRoot: string): void {
  writeFileSync(
    path.join(projectRoot, "callidescope.config.js"),
    `export default {
      entryPoints: {
        addresses: [],
        decorators: [],
        includeExportedFunctions: true,
        includeOrphans: true,
        includeTests: false,
      },
      exclude: [],
      limits: { maximumBreadth: undefined, maximumDepth: 6 },
      write: { markdown: undefined, mermaid: undefined },
    };\n`,
    "utf8",
  );
}

/** Writes a project holding one traceable source file. */
function writeReadableProject(workspaceRoot: string, name: string): void {
  const root = path.join(workspaceRoot, "packages", name);

  mkdirSync(path.join(root, "src"), { recursive: true });
  writeFileSync(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { noLib: true, target: "es2022" },
      include: ["src/**/*.ts"],
    }),
    "utf8",
  );
  writeFileSync(
    path.join(root, "src", "index.ts"),
    "export function entry(): void {}\n",
    "utf8",
  );
  writeProjectConfiguration(root);
}

/**
 * Writes a project whose `tsconfig.json` names a compiler target TypeScript
 * rejects.
 *
 * The shape of the one committed in `codependix-examples`, which exists to be
 * unreadable and must stay that way.
 */
function writeUnreadableProject(workspaceRoot: string, name: string): void {
  const root = path.join(workspaceRoot, "packages", name);

  mkdirSync(path.join(root, "src"), { recursive: true });
  writeFileSync(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { target: "not-a-real-target" },
      include: ["src/**/*.ts"],
    }),
    "utf8",
  );
  writeFileSync(
    path.join(root, "src", "index.ts"),
    "export function broken(): void {}\n",
    "utf8",
  );
  writeProjectConfiguration(root);
}

/**
 * Builds a throwaway workspace carrying the tool's default configuration.
 *
 * Rooted at a resolved path, because `mkdtempSync` hands back a symlink on
 * macOS — `/var/folders/…` for a directory that really lives under
 * `/private/var/folders/…`. A program's source files come back under the real
 * path, so an unresolved root leaves every workspace-relative path a `../../…`
 * climb out of the workspace, which no project root contains: ownership
 * resolves to nothing and a project's own `exclude` silently applies to
 * nothing. Files are still collected under a different keying, so the only
 * symptom is a fixture that cannot reproduce a behavior the real workspace
 * has. This suite asserts exit codes rather than paths today and so is not
 * wrong yet; any assertion here on ownership, a module identifier, or a
 * rendered path would be measuring the wrong thing without this.
 */
function writeWorkspace(): string {
  const workspaceRoot = realpathSync(
    mkdtempSync(path.join(tmpdir(), "callidescope-exit-")),
  );

  writeFileSync(
    path.join(workspaceRoot, "callidescope.config.json"),
    JSON.stringify({ limits: { maximumDepth: 6 } }),
    "utf8",
  );
  writeFileSync(
    path.join(workspaceRoot, "register.mjs"),
    `import { register } from "node:module";\nregister(${JSON.stringify(LOADER_HOOK)});\n`,
    "utf8",
  );

  return workspaceRoot;
}

describe("main end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("allows an empty schema by default", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({});
    });
  });

  describe(
    "the exit code of a run that could not trace",
    () => {
      it("passes a workspace it traced without finding anything", () => {
        expect.hasAssertions();

        const workspaceRoot = writeWorkspace();

        writeReadableProject(workspaceRoot, "readable");

        expect(runCallidescope(workspaceRoot).status).toBe(0);
      });

      it("fails a workspace whose only project cannot be read", () => {
        expect.hasAssertions();

        // The regression. This used to print the parsing failure and exit 0,
        // so the depth gate passed for having traced nothing at all.
        const workspaceRoot = writeWorkspace();

        writeUnreadableProject(workspaceRoot, "broken");

        expect(runCallidescope(workspaceRoot).status).toBe(1);
      });

      it("fails a workspace holding one unreadable project among readable ones", () => {
        expect.hasAssertions();

        const workspaceRoot = writeWorkspace();

        writeReadableProject(workspaceRoot, "readable");
        writeUnreadableProject(workspaceRoot, "broken");

        const { output, status } = runCallidescope(workspaceRoot);

        // Fails on the project it could not read, rather than on anything it
        // measured through a workspace that was missing one.
        expect(status).toBe(1);
        expect(output).toContain("Rejected a project it could not read");
      });
    },
    SPAWNED_RUN_TIMEOUT,
  );
});
