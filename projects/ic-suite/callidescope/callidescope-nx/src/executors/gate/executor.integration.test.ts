import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { MARKDOWN_DEEP_STACKS_HEADING } from "@callidescope/output";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  EMPTY_TRACE_REPORT,
  reportUnreadProjects,
} from "../../modules/plugin/plugin.constants";
import { ProjectsService } from "../../modules/projects/projects.service";

import gateExecutor from "./executor";

import type { GateExecutorOptions } from "./executor.types";
import type { ExecutorContext, ProjectGraph } from "@nx/devkit";

/**
 * Nx project names, deliberately unlike the roots below.
 *
 * The whole point of this fixture. A report's `projectName` is the
 * workspace-relative root of the project, never its Nx name, and a gate handed
 * Nx names owns no finding at all and passes whatever it read. Nothing forces
 * the two vocabularies apart in this repository — most Nx names are the
 * basename of their root — so the fixture forces them apart itself, and every
 * identifier below flows through the real resolution rather than being written
 * on both sides of a comparison.
 */
const BREACHING_PROJECT_NAME = "the-project-that-breaches";
const DEPENDENT_PROJECT_NAME = "the-project-that-depends";
const UNREAD_PROJECT_NAME = "the-project-that-reads-nothing";

/** Workspace-relative roots — what callidescope calls a project name. */
const BREACHING_PROJECT_ROOT = "packages/breaching";
const DEPENDENT_PROJECT_ROOT = "packages/dependent";
const UNREAD_PROJECT_ROOT = "packages/unread";

/** The callable whose stack breaches the breaching project's own limit. */
const BREACHING_ENTRY_POINT = "readBreachingEntryPoint";

/**
 * Filename both the workspace and the breaching project write their limits in.
 *
 * JSON rather than TypeScript, which the loader reads either way: a project
 * configuration written as TypeScript has to import its own type to be worth
 * type-checking, and that import is an Nx dependency edge — which would widen
 * the very closure this fixture is built to hold still.
 */
const CONFIGURATION_FILE_NAME = "callidescope.config.json";

/** The name a project declares itself through, which must spell `undefined`. */
const PROJECT_CONFIGURATION_FILE_NAME = "callidescope.config.js";

/** A three-frame stack, against a project limit of two. */
const BREACHING_SOURCE = [
  "export function readBreachingEntryPoint(): string {",
  "  return buildBreachingMiddle();",
  "}",
  "",
  "function buildBreachingMiddle(): string {",
  "  return readBreachingLeaf();",
  "}",
  "",
  "function readBreachingLeaf(): string {",
  '  return "over its own limit";',
  "}",
  "",
].join("\n");

/** A one-frame stack, against the workspace limit this fixture never nears. */
const DEPENDENT_SOURCE = [
  "export function readDependentEntryPoint(): string {",
  '  return "within its own limit";',
  "}",
  "",
].join("\n");

const PROJECT_PROGRAM = {
  compilerOptions: {
    module: "esnext",
    moduleResolution: "bundler",
    noEmit: true,
    strict: true,
    target: "esnext",
  },
  include: ["src/**/*.ts"],
};

/**
 * An executor context for a run against one project of the fixture workspace.
 *
 * Built literally rather than mocked, for the reason the unit test beside this
 * gives: `createMock` fabricates every property it is not handed.
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
 * The gate options every case here starts from.
 *
 * The configuration path is named rather than searched for, because a search
 * starts at the process's own working directory and would find this
 * repository's configuration instead of the fixture's.
 */
function buildOptions(args: { workspaceRoot: string }): GateExecutorOptions {
  return {
    configurationPath: path.join(args.workspaceRoot, CONFIGURATION_FILE_NAME),
  };
}

/**
 * The Nx graph the run resolves its scope from.
 *
 * Built here rather than read, because `readProjectGraph` is the one method in
 * this package that touches Nx at run time and a fixture workspace is in no
 * project graph. Everything downstream of it is the real thing:
 * `resolveProjectNames`, `resolveDependencyClosure`, and `resolveDirectories`
 * turn these nodes into the directories a trace reads and the roots a verdict
 * covers.
 */
function buildProjectGraph(): ProjectGraph {
  return {
    dependencies: {
      [BREACHING_PROJECT_NAME]: [],
      [DEPENDENT_PROJECT_NAME]: [
        {
          source: DEPENDENT_PROJECT_NAME,
          target: BREACHING_PROJECT_NAME,
          type: "static",
        },
      ],
      // The dependency is what makes the unread case reachable: it keeps the
      // run itself non-empty while this project's own sources are all gone.
      [UNREAD_PROJECT_NAME]: [
        {
          source: UNREAD_PROJECT_NAME,
          target: BREACHING_PROJECT_NAME,
          type: "static",
        },
      ],
    },
    nodes: {
      [BREACHING_PROJECT_NAME]: {
        data: { root: BREACHING_PROJECT_ROOT, tags: ["type:package"] },
        name: BREACHING_PROJECT_NAME,
        type: "lib",
      },
      [DEPENDENT_PROJECT_NAME]: {
        data: { root: DEPENDENT_PROJECT_ROOT, tags: ["type:package"] },
        name: DEPENDENT_PROJECT_NAME,
        type: "lib",
      },
      [UNREAD_PROJECT_NAME]: {
        data: { root: UNREAD_PROJECT_ROOT, tags: ["type:package"] },
        name: UNREAD_PROJECT_NAME,
        type: "lib",
      },
    },
  };
}

/**
 * Reads the depth finding count out of what a gate printed.
 *
 * The count rather than the whole rendering: this asserts which findings a
 * verdict owned, and how one of them reads is `callidescope-output`'s to pin —
 * which is also why the heading is that package's exported constant rather
 * than prose copied into here.
 */
function readDeepStackCount(report: string): number {
  const matched = new RegExp(
    String.raw`## ${MARKDOWN_DEEP_STACKS_HEADING} \((\d+)\)`,
  ).exec(report);

  return matched?.[1] === undefined ? -1 : Number(matched[1]);
}

/** Writes one fixture project: a program, a manifest, and some source. */
function writeProject(args: {
  configuration?:
    | undefined
    | { exclude?: string[]; limits?: { maximumDepth: number } };
  projectRoot: string;
  source: string;
  workspaceRoot: string;
}): void {
  const projectDirectory = path.join(args.workspaceRoot, args.projectRoot);
  mkdirSync(path.join(projectDirectory, "src"), { recursive: true });
  writeFileSync(
    path.join(projectDirectory, "tsconfig.json"),
    JSON.stringify(PROJECT_PROGRAM),
  );
  writeFileSync(
    path.join(projectDirectory, "package.json"),
    JSON.stringify({ name: path.basename(args.projectRoot), version: "0.0.0" }),
  );
  writeFileSync(path.join(projectDirectory, "src", "index.ts"), args.source);

  // Every traced project declares a complete configuration or the run refuses
  // to start, so a fixture project that overrides nothing still writes one.
  // JavaScript rather than JSON, because `undefined` is what says "no breadth
  // limit" and "no destination", and JSON cannot spell it.
  writeFileSync(
    path.join(projectDirectory, PROJECT_CONFIGURATION_FILE_NAME),
    `export default {
      entryPoints: {
        addresses: [],
        decorators: [],
        includeExportedFunctions: true,
        includeOrphans: true,
        includeTests: false,
      },
      exclude: ${JSON.stringify(args.configuration?.exclude ?? [])},
      limits: {
        maximumBreadth: undefined,
        maximumDepth: ${String(args.configuration?.limits?.maximumDepth ?? 99)},
      },
      write: { markdown: undefined, mermaid: undefined },
    };\n`,
  );
}

/**
 * The gate fires on the project that owns a breach, and only on that project.
 *
 * An integration test rather than a unit one because the bug this exists to
 * catch lived in the seam between two naming schemes, and a unit test writing
 * names on both sides of that seam cannot see it. Here the judged set comes out
 * of the real Nx resolution and the findings come out of a real trace of real
 * files on disk, so the two vocabularies have to agree for anything to fail.
 *
 * Both halves of the model are pinned, and each one is what fails when the
 * other half is broken:
 *
 * - A gate handed Nx project names matches no report, owns no finding, and
 *   passes whatever it read. Every project's gate in the workspace passed that
 *   way once, and a green all-projects sweep is exactly what that bug produces
 *   — which is why the sweep is not the check and this is.
 * - A gate judging the whole run's findings rather than its own fails the
 *   dependent for a breach in the dependency it merely measured.
 * - A gate asking whether the *run* read anything rather than whether the
 *   project it judges did passes a project whose own files were all excluded,
 *   on the strength of its dependencies' code.
 */
describe("the gate executor, against a workspace on disk", () => {
  let printed: string[] = [];
  let workspaceRoot = "";

  beforeAll(() => {
    // Resolved through its symlinks, which matters on macOS: `tmpdir()` there
    // is `/var/folders/…`, a link to `/private/var/folders/…`, and a program's
    // source files come back under the real path. A run rooted at the link
    // then makes every file's workspace-relative path a `../../..` climb that
    // no project's root contains, so nothing a project excludes for itself is
    // treated as belonging to it.
    workspaceRoot = realpathSync(
      mkdtempSync(path.join(tmpdir(), "callidescope-gate-")),
    );
    // High enough that nothing in the fixture reaches it: the breach has to
    // come from the limit the breaching project declared for itself, or the
    // narrowing below proves nothing.
    writeFileSync(
      path.join(workspaceRoot, CONFIGURATION_FILE_NAME),
      JSON.stringify({ limits: { maximumDepth: 99 } }),
    );
    writeProject({
      configuration: { limits: { maximumDepth: 2 } },
      projectRoot: BREACHING_PROJECT_ROOT,
      source: BREACHING_SOURCE,
      workspaceRoot,
    });
    writeProject({
      projectRoot: DEPENDENT_PROJECT_ROOT,
      source: DEPENDENT_SOURCE,
      workspaceRoot,
    });
    // A project that excludes every file it holds — the over-matching
    // `exclude` a project's own configuration is free to write. It breaks no
    // limit, because nothing of it was read to break one with.
    writeProject({
      configuration: { exclude: ["**"] },
      projectRoot: UNREAD_PROJECT_ROOT,
      source: DEPENDENT_SOURCE,
      workspaceRoot,
    });
  });

  beforeEach(() => {
    printed = [];
    vi.spyOn(ProjectsService.prototype, "readProjectGraph").mockResolvedValue(
      buildProjectGraph(),
    );
    vi.spyOn(process.stdout, "write").mockImplementation((chunk): boolean => {
      printed.push(String(chunk));

      return true;
    });
  });

  afterAll(() => {
    rmSync(workspaceRoot, { force: true, recursive: true });
  });

  it(
    "fails the project that broke the limit it declared for itself",
    { timeout: 120_000 },
    async () => {
      expect.hasAssertions();

      const result = await gateExecutor(
        buildOptions({ workspaceRoot }),
        buildContext({
          projectName: BREACHING_PROJECT_NAME,
          workspaceRoot,
        }),
      );
      const report = printed.join("");

      expect(result).toStrictEqual({ success: false });
      expect(readDeepStackCount(report)).toBe(1);
      expect(report).toContain(BREACHING_ENTRY_POINT);
    },
  );

  it(
    "passes the dependent whose trace read that same breach",
    { timeout: 120_000 },
    async () => {
      expect.hasAssertions();

      const result = await gateExecutor(
        buildOptions({ workspaceRoot }),
        buildContext({
          projectName: DEPENDENT_PROJECT_NAME,
          workspaceRoot,
        }),
      );
      const report = printed.join("");

      expect(result).toStrictEqual({ success: true });
      expect(readDeepStackCount(report)).toBe(0);
      expect(report).not.toContain(BREACHING_ENTRY_POINT);
    },
  );

  it(
    "fails that same trace once the breaching project joins the judged set",
    { timeout: 120_000 },
    async () => {
      expect.hasAssertions();

      // The A/B for the case above, on one binary: identical directories
      // traced and identical limits resolved, differing only in which projects
      // the run was pointed at. A green dependent is therefore the narrowing,
      // not a trace that never read the breach.
      const result = await gateExecutor(
        {
          ...buildOptions({ workspaceRoot }),
          projects: [DEPENDENT_PROJECT_NAME, BREACHING_PROJECT_NAME],
        },
        buildContext({
          projectName: DEPENDENT_PROJECT_NAME,
          workspaceRoot,
        }),
      );
      const report = printed.join("");

      expect(result).toStrictEqual({ success: false });
      expect(readDeepStackCount(report)).toBe(1);
      expect(report).toContain(BREACHING_ENTRY_POINT);
    },
  );

  it(
    "fails a project whose own exclude left it nothing to be judged on",
    { timeout: 120_000 },
    async () => {
      expect.hasAssertions();

      const result = await gateExecutor(
        buildOptions({ workspaceRoot }),
        buildContext({
          projectName: UNREAD_PROJECT_NAME,
          workspaceRoot,
        }),
      );
      const report = printed.join("");

      expect(result).toStrictEqual({ success: false });
      // The exact rendering, so the project this gate never read is named back
      // rather than the reader being left to work out which one it was.
      expect(report.trim()).toBe(reportUnreadProjects([UNREAD_PROJECT_ROOT]));
      // And not the whole-run rule: this project's closure holds the breaching
      // project, so the run read three callables and the old question — did
      // the *run* read anything — answers yes. That is the door this closes.
      expect(report).not.toContain(EMPTY_TRACE_REPORT);
      expect(readDeepStackCount(report)).toBe(-1);
    },
  );
});
