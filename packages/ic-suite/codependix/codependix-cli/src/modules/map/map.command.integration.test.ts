import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { LoggerService } from "@codebase/logging";

import { MainModule } from "../../main.module";

import { MapCommand } from "./map.command";

import type { MapCommandOptions } from "@codependix/configuration";
import type { MockInstance } from "vitest";

/**
 * A fixture Nx project graph, standing in for `nx graph --file=graph.json` —
 * see `NeighborhoodService.readProjectGraph`. This is what lets the fixture
 * tree below run with no real Nx workspace under it: `codependix.config.ts`'s
 * `projectGraph` field points straight at this file.
 */
const PROJECT_GRAPH = {
  dependencies: {},
  nodes: {
    "project-with-defaults-only": {
      data: { root: "packages/project-with-defaults-only" },
      name: "project-with-defaults-only",
      type: "lib",
    },
    "project-with-own-file": {
      data: { root: "packages/project-with-own-file" },
      name: "project-with-own-file",
      type: "lib",
    },
    "project-without-a-file": {
      data: { root: "packages/project-without-a-file" },
      name: "project-without-a-file",
      type: "lib",
    },
  },
};

describe("map command", () => {
  describe("over a fixture tree", () => {
    let workingDirectory: string;
    let originalWorkingDirectory: string;

    /** Runs the map command with the process rooted at the fixture tree. */
    async function run(options: MapCommandOptions): Promise<{
      exitCode: number;
      loggedErrors: unknown[][];
      loggedWarns: unknown[][];
    }> {
      process.chdir(workingDirectory);
      process.exitCode = 0;

      const errorSpy = vi.spyOn(LoggerService.prototype, "error");
      const warnSpy = vi.spyOn(LoggerService.prototype, "warn");

      const module = await Test.createTestingModule({
        imports: [MainModule],
      }).compile();
      const command = module.get(MapCommand, { strict: false });

      await command.run([], options);

      const exitCode = process.exitCode;
      const loggedErrors = [...errorSpy.mock.calls];
      const loggedWarns = [...warnSpy.mock.calls];

      errorSpy.mockRestore();
      warnSpy.mockRestore();

      process.exitCode = 0;
      process.chdir(originalWorkingDirectory);

      return {
        exitCode: typeof exitCode === "string" ? Number(exitCode) : exitCode,
        loggedErrors,
        loggedWarns,
      };
    }

    beforeAll(() => {
      originalWorkingDirectory = process.cwd();
      workingDirectory = mkdtempSync(path.join(tmpdir(), "codependix-map-"));

      mkdirSync(path.join(workingDirectory, "packages/project-with-own-file"), {
        recursive: true,
      });
      mkdirSync(
        path.join(workingDirectory, "packages/project-with-defaults-only"),
        { recursive: true },
      );
      mkdirSync(
        path.join(workingDirectory, "packages/project-without-a-file"),
        {
          recursive: true,
        },
      );

      writeFileSync(
        path.join(workingDirectory, "codependix-graph.json"),
        JSON.stringify(PROJECT_GRAPH),
      );

      // The workspace root's own configuration: scopes `include` to every
      // fixture project, points at the fixture project graph above, and
      // exports `projectDefaults` — the object a project's own file spreads,
      // mirroring `configuration/codependix.config.ts`'s real shape.
      writeFileSync(
        path.join(workingDirectory, "codependix.config.ts"),
        [
          "export const projectDefaults = {",
          '  nxProjects: { json: { path: "nx-neighborhood.json" }, target: "json" },',
          "};",
          "",
          "export default {",
          '  include: ["packages/*"],',
          '  projectGraph: "codependix-graph.json",',
          "  workspace: {",
          '    nxProjects: { json: { path: "workspace-graph.json" }, target: "json" },',
          "  },",
          "};",
          "",
        ].join("\n"),
      );

      // Spreads `projectDefaults` and overrides `nxProjects` outright with its
      // own destination — the "project with its own file" case.
      writeFileSync(
        path.join(
          workingDirectory,
          "packages/project-with-own-file/codependix.config.ts",
        ),
        [
          'import { projectDefaults } from "../../codependix.config.js";',
          "",
          "export default {",
          "  ...projectDefaults,",
          '  nxProjects: { json: { path: "own-neighborhood.json" }, target: "json" },',
          "};",
          "",
        ].join("\n"),
      );

      // Spreads `projectDefaults` and overrides nothing — the "root defaults
      // spreading correctly into a project file" case: this project's resolved
      // output is exactly what the root config's `projectDefaults` says.
      writeFileSync(
        path.join(
          workingDirectory,
          "packages/project-with-defaults-only/codependix.config.ts",
        ),
        [
          'import { projectDefaults } from "../../codependix.config.js";',
          "",
          "export default {",
          "  ...projectDefaults,",
          "};",
          "",
        ].join("\n"),
      );

      // `packages/project-without-a-file/` deliberately carries no
      // `codependix.config.ts` of its own — the "project with no file" case.
    });

    afterAll(() => {
      rmSync(workingDirectory, { force: true, recursive: true });
    });

    it("writes a project's own file's export, spreading and then overriding projectDefaults", async () => {
      const { exitCode } = await run({
        directory: workingDirectory,
        write: true,
      });

      expect(exitCode).toBe(0);

      const ownGraphPath = path.join(
        workingDirectory,
        "packages/project-with-own-file/own-neighborhood.json",
      );

      expect(existsSync(ownGraphPath)).toBe(true);
      expect(
        JSON.parse(readFileSync(ownGraphPath, "utf8")) as {
          projectName: string;
        },
      ).toMatchObject({ projectName: "project-with-own-file" });
    });

    it("writes projectDefaults' own destination for a project that spreads it unchanged", () => {
      const spreadOnlyGraphPath = path.join(
        workingDirectory,
        "packages/project-with-defaults-only/nx-neighborhood.json",
      );

      expect(existsSync(spreadOnlyGraphPath)).toBe(true);
      expect(
        JSON.parse(readFileSync(spreadOnlyGraphPath, "utf8")) as {
          projectName: string;
        },
      ).toMatchObject({ projectName: "project-with-defaults-only" });
    });

    it("writes nothing at all for an included project with no configuration file of its own", () => {
      const projectRoot = path.join(
        workingDirectory,
        "packages/project-without-a-file",
      );

      expect(existsSync(path.join(projectRoot, "nx-neighborhood.json"))).toBe(
        false,
      );
      expect(existsSync(path.join(projectRoot, "own-neighborhood.json"))).toBe(
        false,
      );
    });

    it("still lists a file-less project in the Workspace Graph", () => {
      const workspaceGraphPath = path.join(
        workingDirectory,
        "workspace-graph.json",
      );
      const workspaceGraph = JSON.parse(
        readFileSync(workspaceGraphPath, "utf8"),
      ) as { projectNames: string[] };

      expect(workspaceGraph.projectNames).toContain("project-without-a-file");
    });

    it("passes --check reports right after --write", async () => {
      const { exitCode } = await run({
        check: "reports",
        directory: workingDirectory,
      });

      expect(exitCode).toBe(0);
    });

    it("fails --check reports once a project's own written export drifts", async () => {
      const ownGraphPath = path.join(
        workingDirectory,
        "packages/project-with-own-file/own-neighborhood.json",
      );

      writeFileSync(ownGraphPath, JSON.stringify({ drifted: true }));

      const { exitCode, loggedErrors } = await run({
        check: "reports",
        directory: workingDirectory,
      });

      expect(exitCode).toBe(1);
      expect(loggedErrors).toContainEqual([
        "🕸️ Found stale codependix exports",
        undefined,
        {
          exports: [
            {
              anchor: undefined,
              difference: "graph",
              path: "own-neighborhood.json",
              project: "project-with-own-file",
            },
          ],
          projects: ["project-with-own-file"],
        },
      ]);

      // Restore what --write produced, so later tests in this file are not
      // affected by this test's drift.
      await run({ directory: workingDirectory, write: true });
    });
  });

  describe("cli overrides and graph-type toggles", () => {
    let workingDirectory: string;
    let originalWorkingDirectory: string;
    let widgetGraphPath: string;

    /** Runs the map command with the process rooted at the fixture tree. */
    async function run(
      options: MapCommandOptions,
    ): Promise<{ exitCode: number; loggedWarns: unknown[][] }> {
      process.chdir(workingDirectory);
      process.exitCode = 0;

      const warnSpy = vi.spyOn(LoggerService.prototype, "warn");

      const module = await Test.createTestingModule({
        imports: [MainModule],
      }).compile();
      const command = module.get(MapCommand, { strict: false });

      await command.run([], options);

      const exitCode = process.exitCode;
      const loggedWarns = [...warnSpy.mock.calls];

      warnSpy.mockRestore();

      process.exitCode = 0;
      process.chdir(originalWorkingDirectory);

      return {
        exitCode: typeof exitCode === "string" ? Number(exitCode) : exitCode,
        loggedWarns,
      };
    }

    beforeAll(() => {
      originalWorkingDirectory = process.cwd();
      workingDirectory = mkdtempSync(path.join(tmpdir(), "codependix-flags-"));
      widgetGraphPath = path.join(workingDirectory, "widget-neighborhood.json");

      mkdirSync(path.join(workingDirectory, "packages/widget"), {
        recursive: true,
      });

      writeFileSync(
        path.join(workingDirectory, "codependix-graph.json"),
        JSON.stringify({
          dependencies: {},
          nodes: {
            widget: {
              data: { root: "packages/widget" },
              name: "widget",
              type: "lib",
            },
          },
        }),
      );

      // Declares `include` but deliberately never declares `exclude` — the
      // fixture for the refusal test below. `--include` has something to
      // override; `--exclude` does not.
      writeFileSync(
        path.join(workingDirectory, "codependix.config.ts"),
        [
          "export default {",
          '  include: ["packages/*"],',
          '  projectGraph: "codependix-graph.json",',
          "};",
          "",
        ].join("\n"),
      );

      writeFileSync(
        path.join(workingDirectory, "packages/widget/codependix.config.ts"),
        [
          "export default {",
          '  nxProjects: { json: { path: "../../widget-neighborhood.json" }, target: "json" },',
          "};",
          "",
        ].join("\n"),
      );
    });

    afterAll(() => {
      rmSync(workingDirectory, { force: true, recursive: true });
    });

    it("still writes every graph type's export when no flag overrides or toggles anything", async () => {
      const { exitCode, loggedWarns } = await run({
        directory: workingDirectory,
        write: true,
      });

      expect(exitCode).toBe(0);
      expect(existsSync(widgetGraphPath)).toBe(true);

      const emptySelectionWarn = loggedWarns.find((call) =>
        call.some(
          (arg) =>
            typeof arg === "string" &&
            arg.includes("Selected no project to export"),
        ),
      );

      expect(emptySelectionWarn).toBeUndefined();
    });

    it("overrides include for the run, narrowing away the only project it declared", async () => {
      rmSync(widgetGraphPath, { force: true });

      const { exitCode, loggedWarns } = await run({
        directory: workingDirectory,
        include: ["packages/nonexistent"],
        write: true,
      });

      expect(exitCode).toBe(0);
      expect(existsSync(widgetGraphPath)).toBe(false);

      const emptySelectionWarn = loggedWarns.find((call) =>
        call.some(
          (arg) =>
            typeof arg === "string" &&
            arg.includes("Selected no project to export"),
        ),
      );

      expect(emptySelectionWarn).toBeDefined();
    });

    it("refuses to override exclude, which the fixture configuration never declared", async () => {
      rmSync(widgetGraphPath, { force: true });

      const { exitCode } = await run({
        directory: workingDirectory,
        exclude: ["packages/widget"],
        write: true,
      });

      expect(exitCode).toBe(1);
      // Refused before anything ran, so the widget's export is never attempted.
      expect(existsSync(widgetGraphPath)).toBe(false);
    });

    it("skips the nxProjects graph type entirely when --no-nx-projects is given", async () => {
      rmSync(widgetGraphPath, { force: true });

      const { exitCode } = await run({
        directory: workingDirectory,
        nxProjects: false,
        write: true,
      });

      expect(exitCode).toBe(0);
      expect(existsSync(widgetGraphPath)).toBe(false);
    });

    it("writes the nxProjects graph type again once re-enabled", async () => {
      const { exitCode } = await run({
        directory: workingDirectory,
        nxProjects: true,
        write: true,
      });

      expect(exitCode).toBe(0);
      expect(existsSync(widgetGraphPath)).toBe(true);
    });
  });

  describe("combined output and format flags", () => {
    let workingDirectory: string;
    let originalWorkingDirectory: string;
    let stdoutSpy: MockInstance<typeof process.stdout.write>;

    /** Runs the map command with the process rooted at the fixture tree. */
    async function run(
      options: MapCommandOptions,
    ): Promise<{ exitCode: number; printed: string }> {
      process.chdir(workingDirectory);
      process.exitCode = 0;
      stdoutSpy.mockClear();

      const module = await Test.createTestingModule({
        imports: [MainModule],
      }).compile();
      const command = module.get(MapCommand, { strict: false });

      await command.run([], options);

      const exitCode = process.exitCode;
      const printed = stdoutSpy.mock.calls
        .map((call: unknown[]) => String(call[0]))
        .join("");

      process.exitCode = 0;
      process.chdir(originalWorkingDirectory);

      return {
        exitCode: typeof exitCode === "string" ? Number(exitCode) : exitCode,
        printed,
      };
    }

    beforeAll(() => {
      originalWorkingDirectory = process.cwd();
      workingDirectory = mkdtempSync(
        path.join(tmpdir(), "codependix-combined-output-"),
      );

      mkdirSync(path.join(workingDirectory, "packages/widget/src"), {
        recursive: true,
      });

      writeFileSync(
        path.join(workingDirectory, "codependix-graph.json"),
        JSON.stringify({
          dependencies: {},
          nodes: {
            widget: {
              data: { root: "packages/widget" },
              name: "widget",
              type: "lib",
            },
          },
        }),
      );

      // A real `tsconfig.json` and source file, so the fileImports pass has
      // something to discover and build — `noLib`/`bundler` resolution keeps
      // this from needing the real TypeScript standard library.
      writeFileSync(
        path.join(workingDirectory, "packages/widget/tsconfig.json"),
        JSON.stringify({
          compilerOptions: { moduleResolution: "bundler", noLib: true },
          include: ["src/**/*.ts"],
        }),
      );
      writeFileSync(
        path.join(workingDirectory, "packages/widget/src/index.ts"),
        "export function entry(): void {}\n",
      );

      // No per-project `codependix.config.ts` is written: combined output
      // reads each active type's whole-workspace graph, built regardless of
      // any project's own per-project export configuration — see
      // `WorkspaceGraphsService`. The workspace-level destinations below
      // exist only so each graph type actually gets built; this test's own
      // assertions read `--json-output`/`--markdown-output`/`--format`
      // instead.
      writeFileSync(
        path.join(workingDirectory, "codependix.config.ts"),
        [
          "export default {",
          '  include: ["packages/*"],',
          '  projectGraph: "codependix-graph.json",',
          "  workspace: {",
          '    fileImports: { json: { path: "workspace-file-imports.json" }, target: "json" },',
          '    nxProjects: { json: { path: "workspace-nx.json" }, target: "json" },',
          "  },",
          "};",
          "",
        ].join("\n"),
      );
    });

    beforeEach(() => {
      stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    });

    afterEach(() => {
      stdoutSpy.mockRestore();
    });

    afterAll(() => {
      rmSync(workingDirectory, { force: true, recursive: true });
    });

    it("writes every active graph type's data combined into one JSON file, keyed by graph type", async () => {
      const { exitCode } = await run({
        directory: workingDirectory,
        jsonOutput: "combined.json",
        nestjsModules: false,
        write: true,
      });

      expect(exitCode).toBe(0);

      const combined = JSON.parse(
        readFileSync(path.join(workingDirectory, "combined.json"), "utf8"),
      ) as Record<string, unknown>;

      expect(Object.keys(combined).toSorted()).toStrictEqual([
        "fileImports",
        "nxProjects",
      ]);
    });

    it("writes every active graph type's own anchor-spliced section combined into one Markdown file", async () => {
      const { exitCode } = await run({
        directory: workingDirectory,
        markdownOutput: "combined.md",
        nestjsModules: false,
        write: true,
      });

      expect(exitCode).toBe(0);

      const written = readFileSync(
        path.join(workingDirectory, "combined.md"),
        "utf8",
      );

      expect(written).toContain("## 🕸️ Codependix");
      expect(written).toContain('name="fileImports"');
      expect(written).toContain('name="nxProjects"');
    });

    it("prints the resolved graphs as JSON to standard output with --format json", async () => {
      const { exitCode, printed } = await run({
        directory: workingDirectory,
        format: "json",
        nestjsModules: false,
        write: true,
      });

      expect(exitCode).toBe(0);

      const parsed = JSON.parse(printed) as Record<string, unknown>;

      expect(Object.keys(parsed).toSorted()).toStrictEqual([
        "fileImports",
        "nxProjects",
      ]);
    });

    it("prints the resolved graphs as Markdown to standard output by default", async () => {
      const { exitCode, printed } = await run({
        directory: workingDirectory,
        nestjsModules: false,
        write: true,
      });

      expect(exitCode).toBe(0);
      expect(printed).toContain("## 🕸️ Codependix");
    });

    // `LoggerService` writes through pino's own raw file-descriptor
    // destination rather than `process.stdout.write`, so `stdoutSpy` cannot
    // literally interleave the two streams here. What this asserts instead
    // is the mechanism `MapCommand.runMode` guarantees: the combined-output
    // print and the normal export pass — which is what produces the log
    // lines `ReportingService.reportSuccess` emits — both run to completion
    // in the same invocation, neither short-circuiting the other.
    it("prints the combined output without skipping the export pass's own work", async () => {
      const { exitCode, printed } = await run({
        directory: workingDirectory,
        nestjsModules: false,
        write: true,
      });

      expect(exitCode).toBe(0);
      expect(printed).toContain("## 🕸️ Codependix");

      const written = JSON.parse(
        readFileSync(path.join(workingDirectory, "workspace-nx.json"), "utf8"),
      ) as { projectNames: string[] };

      expect(written.projectNames).toContain("widget");
    });

    it("rejects an unrecognized --format value", async () => {
      const { exitCode } = await run({
        directory: workingDirectory,
        format: "yaml",
        write: true,
      });

      expect(exitCode).toBe(1);
    });
  });

  describe("boundary checks charged to projects", () => {
    let originalWorkingDirectory: string;
    const workingDirectories: string[] = [];

    /**
     * Writes a fixture workspace whose Nx graph draws the given edges between
     * the given projects, judged by the given `nxProjects` rules.
     */
    function writeFixture(args: {
      edges: [string, string][];
      projects: string[];
      rules: string;
    }): string {
      const workingDirectory = mkdtempSync(
        path.join(tmpdir(), "codependix-charge-"),
      );

      workingDirectories.push(workingDirectory);
      writeFileSync(
        path.join(workingDirectory, "codependix-graph.json"),
        JSON.stringify({
          dependencies: Object.fromEntries(
            args.projects.map((source) => [
              source,
              args.edges
                .filter(([from]) => from === source)
                .map(([, target]) => ({ source, target, type: "static" })),
            ]),
          ),
          nodes: Object.fromEntries(
            args.projects.map((name) => [
              name,
              { data: { root: `packages/${name}` }, name, type: "lib" },
            ]),
          ),
        }),
      );
      writeFileSync(
        path.join(workingDirectory, "codependix.config.ts"),
        [
          "export default {",
          `  boundaries: { nxProjects: ${args.rules} },`,
          '  projectGraph: "codependix-graph.json",',
          "};",
          "",
        ].join("\n"),
      );

      return workingDirectory;
    }

    /** Runs `--check boundaries` over a fixture, collecting what it logged. */
    async function check(
      workingDirectory: string,
      options: MapCommandOptions,
    ): Promise<{
      exitCode: number;
      loggedErrors: unknown[][];
      loggedWarns: unknown[][];
      printed: string;
    }> {
      process.chdir(workingDirectory);
      process.exitCode = 0;

      const errorSpy = vi.spyOn(LoggerService.prototype, "error");
      const warnSpy = vi.spyOn(LoggerService.prototype, "warn");
      const printSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
      const module = await Test.createTestingModule({
        imports: [MainModule],
      }).compile();

      await module.get(MapCommand, { strict: false }).run([], {
        check: "boundaries",
        directory: workingDirectory,
        ...options,
      });

      const exitCode = process.exitCode;
      const loggedErrors = [...errorSpy.mock.calls];
      const loggedWarns = [...warnSpy.mock.calls];
      const printed = printSpy.mock.calls
        .map(([chunk]) => String(chunk))
        .join("");

      errorSpy.mockRestore();
      warnSpy.mockRestore();
      printSpy.mockRestore();
      process.exitCode = 0;
      process.chdir(originalWorkingDirectory);

      return {
        exitCode: typeof exitCode === "string" ? Number(exitCode) : exitCode,
        loggedErrors,
        loggedWarns,
        printed,
      };
    }

    const ACYCLIC = '[{ kind: "acyclic", name: "no-cycles" }]';
    const FORBID_A_TO_B =
      '[{ from: { id: ["a"] }, kind: "forbid", name: "a-is-a-leaf", to: { id: ["b"] } }]';

    let cycleWorkspace: string;
    let forbidWorkspace: string;

    beforeAll(() => {
      originalWorkingDirectory = process.cwd();
      // a ⇄ b is a cycle; c depends on a; d depends on nothing at all.
      cycleWorkspace = writeFixture({
        edges: [
          ["a", "b"],
          ["b", "a"],
          ["c", "a"],
        ],
        projects: ["a", "b", "c", "d"],
        rules: ACYCLIC,
      });
      // a → b is forbidden; c depends on a.
      forbidWorkspace = writeFixture({
        edges: [
          ["a", "b"],
          ["c", "a"],
        ],
        projects: ["a", "b", "c"],
        rules: FORBID_A_TO_B,
      });
    });

    afterAll(() => {
      for (const workingDirectory of workingDirectories) {
        rmSync(workingDirectory, { force: true, recursive: true });
      }
    });

    it("fails a cross-project cycle for a named project, naming both", async () => {
      const { exitCode, loggedErrors } = await check(cycleWorkspace, {
        projects: "a",
      });

      expect(exitCode).toBe(1);
      expect(loggedErrors).toContainEqual([
        "🕸️ Found codependix boundary violations",
        undefined,
        {
          summary: "1 boundary violation across 1 rule.",
          violations: ["nxProjects a, b: no-cycles: a → b → a is a cycle."],
        },
      ]);
    });

    // D5 at the command line: the cycle fails whichever end was named.
    it("fails a cross-project cycle for the other named project too", async () => {
      const { exitCode, loggedErrors } = await check(cycleWorkspace, {
        projects: "b",
      });

      expect(exitCode).toBe(1);
      expect(loggedErrors).toContainEqual([
        "🕸️ Found codependix boundary violations",
        undefined,
        {
          summary: "1 boundary violation across 1 rule.",
          violations: ["nxProjects a, b: no-cycles: a → b → a is a cycle."],
        },
      ]);
    });

    // A misspelled name in a hook must not become a green gate that judged
    // nothing at all.
    it("rejects a selection that matches no project", async () => {
      const { exitCode, loggedErrors } = await check(cycleWorkspace, {
        projects: "a-typo",
      });

      expect(exitCode).toBe(1);
      expect(loggedErrors).toContainEqual([
        "🕸️ Rejected the command line",
        undefined,
        {
          reason:
            "--projects a-typo matched no project, so there is nothing to judge or draw.",
        },
      ]);
    });

    // A typo beside a correct name used to narrow the run silently, judging
    // fewer projects than were named.
    it("warns about the entries of a partly matching selection, judging the rest", async () => {
      const { exitCode, loggedErrors, loggedWarns } = await check(
        cycleWorkspace,
        { projects: "a,a-typo", tags: "scope:nothing" },
      );

      expect(loggedWarns).toContainEqual([
        "🕸️ Ignored selection entries that matched no project",
        undefined,
        {
          hint: "check the spelling — the run judged only the entries that matched",
          projects: ["a-typo"],
          tags: ["scope:nothing"],
        },
      ]);
      // The matched entry was still judged, so the cycle still fails the run
      // — the warning changed nothing about the exit code.
      expect(exitCode).toBe(1);
      expect(loggedErrors).toContainEqual([
        "🕸️ Found codependix boundary violations",
        undefined,
        {
          summary: "1 boundary violation across 1 rule.",
          violations: ["nxProjects a, b: no-cycles: a → b → a is a cycle."],
        },
      ]);
    });

    it("keeps a partly matching selection that finds nothing wrong passing", async () => {
      const { exitCode, loggedErrors, loggedWarns } = await check(
        cycleWorkspace,
        { projects: "d,d-typo" },
      );

      expect(exitCode).toBe(0);
      expect(loggedErrors).toStrictEqual([]);
      expect(loggedWarns).toStrictEqual([
        [
          "🕸️ Ignored selection entries that matched no project",
          undefined,
          {
            hint: "check the spelling — the run judged only the entries that matched",
            projects: ["d-typo"],
          },
        ],
      ]);
    });

    it("stays quiet about a selection every entry of which matched", async () => {
      const { loggedWarns } = await check(cycleWorkspace, { projects: "d" });

      expect(loggedWarns).toStrictEqual([]);
    });

    it("passes a named project that depends on neither end of a cycle", async () => {
      const { exitCode, loggedErrors, loggedWarns } = await check(
        cycleWorkspace,
        { projects: "d" },
      );

      expect(exitCode).toBe(0);
      expect(loggedErrors).toStrictEqual([]);
      expect(loggedWarns).toStrictEqual([]);
    });

    it("passes a named project depending on a cycle, noting it in the dependency", async () => {
      const { exitCode, loggedErrors, loggedWarns } = await check(
        cycleWorkspace,
        { projects: "c" },
      );

      expect(exitCode).toBe(0);
      expect(loggedErrors).toStrictEqual([]);
      expect(loggedWarns).toContainEqual([
        "🕸️ Found codependix boundary findings in dependencies, not failing",
        undefined,
        {
          failures: [],
          violations: [
            "nxProjects in dependency a, b, not failing: no-cycles: a → b → a is a cycle.",
          ],
        },
      ]);
    });

    it("fails a forbidden edge for the project it leaves", async () => {
      const { exitCode, loggedErrors } = await check(forbidWorkspace, {
        projects: "a",
      });

      expect(exitCode).toBe(1);
      expect(loggedErrors).toContainEqual([
        "🕸️ Found codependix boundary violations",
        undefined,
        {
          summary: "1 boundary violation across 1 rule.",
          violations: ["nxProjects a: a-is-a-leaf: a must not depend on b."],
        },
      ]);
    });

    it("never fails a forbidden edge for the project it reaches", async () => {
      const { exitCode } = await check(forbidWorkspace, { projects: "b" });

      expect(exitCode).toBe(0);
    });

    it("still fails every project on a cycle with no selection at all", async () => {
      const { exitCode } = await check(cycleWorkspace, {});

      expect(exitCode).toBe(1);
    });

    // --no-dependencies builds over the named set alone, so a dependency's
    // finding is no longer noted, and an edge leaving the set is not drawn.
    it("narrows the build to the named projects under --no-dependencies", async () => {
      const noted = await check(forbidWorkspace, {
        dependencies: false,
        projects: "c",
      });
      const cycle = await check(cycleWorkspace, {
        dependencies: false,
        projects: "a",
      });

      expect(noted.exitCode).toBe(0);
      expect(noted.loggedWarns).toStrictEqual([]);
      expect(cycle.exitCode).toBe(0);
    });

    describe("printed as a report", () => {
      it("prints a failing run's findings as JSON under a boundaries key", async () => {
        const { exitCode, printed } = await check(cycleWorkspace, {
          format: "json",
          projects: "a",
        });

        expect(exitCode).toBe(1);
        expect(JSON.parse(printed)).toStrictEqual({
          boundaries: {
            failures: [],
            judgedProjects: ["a"],
            violations: [
              {
                cycle: ["a", "b", "a"],
                level: "nxProjects",
                message: "no-cycles: a → b → a is a cycle.",
                projects: ["a", "b"],
                rule: "no-cycles",
                source: "b",
                target: "a",
                verdict: "fail",
              },
            ],
          },
        });
      });

      it("prints a dependency's finding as a note", async () => {
        const { exitCode, printed } = await check(cycleWorkspace, {
          format: "json",
          projects: "c",
        });
        const report = JSON.parse(printed) as {
          boundaries: { violations: { verdict: string }[] };
        };

        expect(exitCode).toBe(0);
        expect(
          report.boundaries.violations.map((v) => v.verdict),
        ).toStrictEqual(["note"]);
      });

      it("prints Markdown grouped by charged project, marking a note as not failing", async () => {
        const { printed } = await check(cycleWorkspace, {
          format: "markdown",
          projects: "c",
        });

        expect(printed).toContain("### Boundaries");
        expect(printed).toContain("Judged projects: c.");
        expect(printed).toContain("#### a");
        expect(printed).toContain(
          "- **note** nxProjects in dependency a, b, not failing: no-cycles: a → b → a is a cycle.",
        );
      });

      it("prints a clean run's report with no findings", async () => {
        const { exitCode, printed } = await check(cycleWorkspace, {
          format: "json",
          projects: "d",
        });

        expect(exitCode).toBe(0);
        expect(JSON.parse(printed)).toStrictEqual({
          boundaries: {
            failures: [],
            judgedProjects: ["d"],
            violations: [],
          },
        });
      });

      it("prints nothing when no format or output was asked for", async () => {
        const { printed } = await check(cycleWorkspace, { projects: "a" });

        expect(printed).toBe("");
      });
    });
  });
});
