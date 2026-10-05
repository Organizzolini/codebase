import { mkdir, mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  GraphAssemblyService,
  ProgramConfigurationError,
} from "@callidescope/graph";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import { ANALYSIS_MODULES } from "../../../testing/modules";

import { CallidescopeService } from "./callidescope.service";

import type { ResolvedCallidescopeConfiguration } from "@callidescope/configuration";
import type { CallGraphResult } from "@callidescope/core";

/**
 * The depth `ApplicationCommand` measures once the closure resolves its call
 * into the library: `run` → `Repository.find` → `Repository.open`.
 *
 * Written out rather than compared between two runs and left at that, so the
 * scoped-and-unscoped agreement this suite asserts is agreement on a number
 * somebody checked instead of on two absent lookups.
 */
const SCOPED_COMMAND_DEPTH = 3;

/** The configuration file name a project declares itself through. */
const PROJECT_CONFIGURATION = "callidescope.config.js";

/** Where the configured fixture's own configuration file sits. */
const LIBRARY_CONFIGURATION_PATH = path.join(
  "packages",
  "library",
  PROJECT_CONFIGURATION,
);

/**
 * Adds a second project whose `tsconfig.json` names a compiler target
 * TypeScript rejects.
 *
 * The shape of the one already committed in `codependix-examples`: a fixture
 * that exists to be unreadable and must stay that way, sitting in the same
 * workspace as every project a run is meant to trace.
 */
async function addUnreadableProject(workspaceRoot: string): Promise<void> {
  const root = path.join(workspaceRoot, "packages", "broken");

  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { target: "not-a-real-target" },
      include: ["src/**/*.ts"],
    }),
    "utf8",
  );
  await writeFile(
    path.join(root, "src", "index.ts"),
    "export function broken(): void {}\n",
    "utf8",
  );
  await writeProjectConfiguration({ projectRoot: root });
}

/** Builds a resolved configuration for the fixture workspace. */
function buildConfiguration(): ResolvedCallidescopeConfiguration {
  return {
    directories: [],
    entryPoints: {
      addresses: [],
      decorators: ["Command"],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    },
    exclude: [],
    excludeCallees: [],
    excludeFrom: [],
    limits: {
      maximumDepth: 2,
    },
    write: {
      json: undefined,
      markdown: undefined,
      mermaid: undefined,
    },
  };
}

/**
 * Writes two projects, and gives the one nothing points the run at a
 * configuration file of its own.
 *
 * The shape criterion the per-project resolution has to satisfy: `library` is
 * reached only through `application`'s imports, so a run started anywhere else
 * still has to judge its callables by the rules it declared for itself.
 */
async function buildConfiguredWorkspace(
  libraryConfiguration: Record<string, unknown>,
): Promise<string> {
  const workspaceRoot = await makeWorkspaceRoot("callidescope-project-");

  await writeProject({
    name: "library",
    sources: {
      // `open` calls something, because a root that calls nothing makes a
      // one-frame stack and no report lists one.
      "src/repository.ts": `
        export class Repository {
          public open(): void { this.connect(); }
          private connect(): void {}
        }
      `,
    },
    workspaceRoot,
  });
  await writeProjectConfiguration({
    overrides: libraryConfiguration,
    projectRoot: path.join(workspaceRoot, "packages", "library"),
  });
  await writeProject({
    name: "application",
    sources: {
      "src/main.ts": `
        import { Repository } from "../../library/src/repository";

        export function bootstrap(repository: Repository): void {
          repository.open();
        }
      `,
    },
    workspaceRoot,
  });

  return workspaceRoot;
}

/**
 * Writes four projects: one that calls into a second, one that calls into the
 * first, and one nothing touches.
 *
 * The shape a scoped run has to get right in three directions at once — down
 * into a dependency, not up into a dependent, and not sideways into a package
 * neither of them mentions.
 */
async function buildLayeredWorkspace(): Promise<string> {
  const workspaceRoot = await makeWorkspaceRoot("callidescope-closure-");

  await writeProject({
    name: "library",
    sources: {
      "src/index.ts": `
        export class Repository {
          public find(): void { this.open(); }
          public open(): void {}
        }
      `,
    },
    workspaceRoot,
  });
  // No manifest: a directory of shared settings, which every project reaches
  // into and none depends on.
  await writeProject({
    name: "settings",
    omitManifest: true,
    sources: {
      "src/index.ts": "export const SETTINGS = { label: 'fixture' };\n",
    },
    workspaceRoot,
  });
  await writeProject({
    name: "application",
    sources: {
      "src/main.ts": `
        import { Repository } from "../../library/src/index";
        import { SETTINGS } from "../../settings/src/index";

        function Command(): ClassDecorator { return () => undefined; }

        @Command()
        export class ApplicationCommand {
          constructor(private readonly repository: Repository) {}
          public label(): string { return SETTINGS.label; }
          public run(): void { this.repository.find(); }
        }
      `,
    },
    workspaceRoot,
  });
  await writeProject({
    name: "consumer",
    sources: {
      "src/index.ts": `
        import { ApplicationCommand } from "../../application/src/main";

        export function bootstrap(command: ApplicationCommand): void {
          command.run();
        }
      `,
    },
    workspaceRoot,
  });
  await writeProject({
    name: "unrelated",
    sources: { "src/index.ts": "export function unrelated(): void {}\n" },
    workspaceRoot,
  });

  return workspaceRoot;
}

/**
 * Writes a workspace to disk holding a command that reaches a repository
 * through an injected service — the shape this tool exists to follow.
 */
async function buildWorkspace(): Promise<string> {
  const workspaceRoot = await makeWorkspaceRoot("callidescope-trace-");
  const root = path.join(workspaceRoot, "packages", "example");

  await mkdir(path.join(root, "src", "modules", "example"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        experimentalDecorators: true,
        noLib: true,
        target: "es2022",
      },
      include: ["src/**/*.ts"],
    }),
    "utf8",
  );
  await writeFile(
    path.join(root, "src", "modules", "example", "example.service.ts"),
    `
      export class Repository {
        public find(): void { this.open(); }
        public open(): void {}
      }

      export class ExampleService {
        constructor(private readonly repository: Repository) {}
        public load(): void { this.repository.find(); }
      }
    `,
    "utf8",
  );
  await writeFile(
    path.join(root, "src", "modules", "example", "example.command.ts"),
    `
      import { ExampleService } from "./example.service";

      function Command(): ClassDecorator { return () => undefined; }

      @Command()
      export class ExampleCommand {
        constructor(private readonly service: ExampleService) {}
        public run(): void { this.service.load(); }
      }
    `,
    "utf8",
  );
  await writeProjectConfiguration({ projectRoot: root });

  return workspaceRoot;
}

/**
 * A temporary directory every fixture here roots its workspace at.
 *
 * Resolved through the symlink `mkdtemp` hands back on macOS, where the
 * temporary directory really lives under `/private`. A program's source files
 * come back under that real path, so an unresolved root leaves every
 * workspace-relative path a `../../…` climb out of the workspace — no project
 * root contains one, `resolveOwningProject` answers nothing, and a project's
 * own `exclude` silently applies to nothing. Files are still collected under a
 * different keying, so the only symptom is a fixture that cannot reproduce a
 * behavior the real workspace has: it misleads rather than failing.
 *
 * One helper rather than the two calls written out per builder, because a
 * fixture added without them is that defect back, and it has been back three
 * times.
 */
async function makeWorkspaceRoot(prefix: string): Promise<string> {
  return realpath(await mkdtemp(path.join(tmpdir(), prefix)));
}

/** Reads the depth of the stack one project rooted at a named callable. */
function readStackDepth(args: {
  entryPointName: string;
  projectName: string;
  result: CallGraphResult;
}): number | undefined {
  return args.result.projects
    .find((report) => report.projectName === args.projectName)
    ?.stacks.find(
      (stack) => stack.frames[0]?.displayName === args.entryPointName,
    )?.depth;
}

/**
 * Writes one project into a workspace, with the fixture compiler options.
 *
 * A `package.json` comes with it unless `omitManifest` says otherwise — a
 * project root without one is a directory of shared settings rather than
 * something another project depends on, and no closure reaches it.
 */
async function writeProject(args: {
  name: string;
  omitManifest?: boolean;
  sources: Record<string, string>;
  workspaceRoot: string;
}): Promise<void> {
  const root = path.join(args.workspaceRoot, "packages", args.name);

  await mkdir(root, { recursive: true });
  await writeFile(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        experimentalDecorators: true,
        noLib: true,
        target: "es2022",
      },
      include: ["src/**/*.ts"],
    }),
    "utf8",
  );

  if (args.omitManifest !== true) {
    await writeFile(path.join(root, "package.json"), "{}", "utf8");
  }

  await writeProjectConfiguration({ projectRoot: root });

  for (const [name, text] of Object.entries(args.sources)) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), text, "utf8");
  }
}

/**
 * Writes one project's own complete configuration file.
 *
 * Complete by construction, because an incomplete one is refused: a fixture
 * that wants to declare one field still has to say what it does with the rest,
 * and `undefined` is what says "nothing". Written as JavaScript rather than
 * JSON for exactly that reason — JSON cannot spell `undefined`.
 */
async function writeProjectConfiguration(args: {
  overrides?: Record<string, unknown> | undefined;
  projectRoot: string;
}): Promise<void> {
  // The run's own rules restated, so a fixture's project file is complete
  // without also being a different set of rules from the one the run uses —
  // which is exactly what `projectDefaults` does in the real workspace.
  const run = buildConfiguration();
  const overrides: Readonly<Record<string, unknown>> = { ...args.overrides };

  await writeFile(
    path.join(args.projectRoot, PROJECT_CONFIGURATION),
    `export default {
      entryPoints: { ...${JSON.stringify(run.entryPoints)}, ...${JSON.stringify(overrides["entryPoints"] ?? {})} },
      exclude: ${JSON.stringify(overrides["exclude"] ?? [])},
      limits: {
        maximumBreadth: undefined,
        maximumDepth: ${String(run.limits.maximumDepth)},
        ...${JSON.stringify(overrides["limits"] ?? {})},
      },
      write: {
        markdown: undefined,
        mermaid: undefined,
        ...${JSON.stringify(overrides["write"] ?? {})},
      },
    };\n`,
    "utf8",
  );
}

/** Adds one test file to the traced workspace, inside the project's own tree. */
async function writeTestFile(workspaceRoot: string): Promise<void> {
  await writeFile(
    path.join(
      workspaceRoot,
      "packages",
      "example",
      "src",
      "modules",
      "example",
      "example.service.unit.test.ts",
    ),
    "export function assertLoads(): void { assertLoads(); }\n",
    "utf8",
  );
}

describe(`${CallidescopeService.name} (integration)`, () => {
  let result: CallGraphResult;
  let frames: string[];
  let logger: ReturnType<typeof createMock<LoggerService>>;
  let service: CallidescopeService;
  let tracedWorkspaceRoot: string;

  beforeAll(async () => {
    const workspaceRoot = await buildWorkspace();

    tracedWorkspaceRoot = workspaceRoot;
    logger = createMock<LoggerService>();

    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [
        CallidescopeService,
        GraphAssemblyService,
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = await module.resolve(CallidescopeService);

    const outcome = await service.trace({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot,
    });

    result = outcome.result;
    frames =
      result.deepStacks[0]?.frames.map((frame) => frame.displayName) ?? [];
  });

  it("discovers the project from its tsconfig on disk", () => {
    expect(result.summary.projectCount).toBe(1);
    expect(result.summary.fileCount).toBe(2);
  });

  it("logs the workspace it traces", async () => {
    // The global test setup clears mocks before every `it`, so the trace
    // recorded in `beforeAll` is invisible here — this exercises the same
    // resolved service again to see its own logger calls.
    await service.trace({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot: tracedWorkspaceRoot,
    });

    expect(logger.info).toHaveBeenCalledWith(
      "🔭 Tracing a workspace",
      undefined,
      {
        workspaceRoot: tracedWorkspaceRoot,
      },
    );
  });

  it("traces a stack from the command down to the repository", () => {
    // The whole point of the tool: every hop below the command goes through a
    // constructor-injected dependency, and none of it is reachable by reading
    // one file at a time.
    expect(frames).toStrictEqual([
      "ExampleCommand.run",
      "ExampleService.load",
      "Repository.find",
      "Repository.open",
    ]);
  });

  it("roots the stack at the decorated command", () => {
    expect(result.deepStacks[0]?.entryPointKind).toBe("decorated-method");
  });

  it("measures the depth of the traced stack", () => {
    expect(result.deepStacks[0]?.depth).toBe(4);
  });

  it("reports an exact depth when it followed every call", () => {
    expect(result.deepStacks[0]?.isLowerBound).toBe(false);
  });

  it("finds no recursion in a workspace that has none", () => {
    expect(result.summary.cyclicComponentCount).toBe(0);
  });

  // 🔍 Locating callables

  it("collects the same callables locate would need to resolve an address", async () => {
    const located = await service.locate({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot: tracedWorkspaceRoot,
    });

    const displayNames = [...located.callablesById.values()].map(
      (callable) => callable.node.displayName,
    );

    expect(displayNames).toStrictEqual([
      "Repository.find",
      "Repository.open",
      "ExampleService.constructor",
      "ExampleService.load",
      "Command",
      "anonymous",
      "ExampleCommand.constructor",
      "ExampleCommand.run",
    ]);

    const projectRoot = path.join("packages", "example");

    expect(located.startingProjectRoots.get(projectRoot)).toBe(projectRoot);
  });

  // 🙈 A project's own exclusions

  it("leaves out the files a project's own configuration excluded", async () => {
    // The whole wiring in one run: a file sitting at a project root, read
    // only after discovery has found that root, deciding what the run's own
    // filter had no way to decide.
    const workspaceRoot = await buildWorkspace();

    await writeProjectConfiguration({
      overrides: { exclude: ["src/modules/example/example.command.ts"] },
      projectRoot: path.join(workspaceRoot, "packages", "example"),
    });

    const outcome = await service.trace({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot,
    });

    expect(outcome.result.summary.fileCount).toBe(1);
  });

  it("matches a project's globs against its root rather than the workspace", async () => {
    // The same glob written the other way round. A path that would be right
    // in the run's own configuration names nothing from inside the project,
    // which is what "anchored to the project" costs and buys.
    const workspaceRoot = await buildWorkspace();

    await writeProjectConfiguration({
      overrides: {
        exclude: ["packages/example/src/modules/example/example.command.ts"],
      },
      projectRoot: path.join(workspaceRoot, "packages", "example"),
    });

    const outcome = await service.trace({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot,
    });

    expect(outcome.result.summary.fileCount).toBe(2);
  });

  // 📝 A project's own written destinations

  it("carries the destinations a project declared for itself out of the trace", async () => {
    // The destinations are read from the same file, at the same moment, as the
    // exclusions and limits above: a run that published against one read and
    // measured against another would be describing two codebases.
    const workspaceRoot = await buildWorkspace();

    await writeProjectConfiguration({
      overrides: {
        write: {
          markdown: { heading: "## Calls", path: "docs/CALLS.md" },
          mermaid: { path: "docs/DIAGRAM.md" },
        },
      },
      projectRoot: path.join(workspaceRoot, "packages", "example"),
    });

    const outcome = await service.trace({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot,
    });

    expect(
      outcome.writeByProject.get("packages/example")?.markdown,
    ).toMatchObject({
      heading: "## Calls",
      path: "docs/CALLS.md",
    });
    expect(outcome.writeByProject.get("packages/example")?.mermaid?.path).toBe(
      "docs/DIAGRAM.md",
    );
  });

  it("names a project that publishes nothing rather than leaving it out", async () => {
    // A complete configuration always names both destinations, so publishing
    // nothing is `markdown: undefined` written in the file — not an absence.
    const outcome = await service.trace({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot: tracedWorkspaceRoot,
    });

    expect(outcome.writeByProject.get("packages/example")).toStrictEqual({
      json: undefined,
      markdown: undefined,
      mermaid: undefined,
    });
  });

  // 📏 A limit the command line overrode

  it("judges a project by the limit the command line overrode", async () => {
    // Through the real chain rather than against `resolveLimits` directly: a
    // limit is enforced out of each project's own file, and the defect this
    // covers was an override that reached the run's own configuration and
    // stopped — every unit on either side of that hop passing while
    // `--maximum-depth` gated nothing at all.
    const workspaceRoot = await buildWorkspace();

    await writeProjectConfiguration({
      overrides: { limits: { maximumDepth: 7 } },
      projectRoot: path.join(workspaceRoot, "packages", "example"),
    });

    const outcome = await service.trace({
      configuration: buildConfiguration(),
      directories: [],
      limitOverrides: { maximumDepth: 3 },
      workspaceRoot,
    });

    expect(
      outcome.projectLimits.byProject.get("packages/example")?.maximumDepth,
    ).toBe(3);
  });

  it("keeps a project's own limit when no flag overrode it", async () => {
    // The control the case above needs: 3 has to be the flag's answer rather
    // than anything the fixture would have said on its own.
    const workspaceRoot = await buildWorkspace();

    await writeProjectConfiguration({
      overrides: { limits: { maximumDepth: 7 } },
      projectRoot: path.join(workspaceRoot, "packages", "example"),
    });

    const outcome = await service.trace({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot,
    });

    expect(
      outcome.projectLimits.byProject.get("packages/example")?.maximumDepth,
    ).toBe(7);
  });

  // 🧪 A project's own test files

  it("walks a project's test files when that project asked for them", async () => {
    // The fifth `entryPoints` field, and the one that is spent at collection
    // rather than when roots are chosen: a project that asks for its tests
    // gets them walked even though the run said no.
    const workspaceRoot = await buildWorkspace();

    await writeTestFile(workspaceRoot);
    await writeProjectConfiguration({
      overrides: { entryPoints: { includeTests: true } },
      projectRoot: path.join(workspaceRoot, "packages", "example"),
    });

    const outcome = await service.trace({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot,
    });

    expect(outcome.result.summary.fileCount).toBe(3);
  });

  it("leaves a project's test files out when the run said so", async () => {
    // The same workspace with nothing declared, which is what makes the
    // count above the project's own answer rather than the run's.
    const workspaceRoot = await buildWorkspace();

    await writeTestFile(workspaceRoot);

    const outcome = await service.trace({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot,
    });

    expect(outcome.result.summary.fileCount).toBe(2);
  });

  // 🚧 A project that cannot be read

  it("refuses to trace a workspace holding a project it cannot read", async () => {
    // Fail fast, and fail whole. A partial graph would be published by the
    // caller before it weighed a single finding, so the wrong depths would be
    // committed and only then reported as a failure.
    const workspaceRoot = await buildWorkspace();

    await addUnreadableProject(workspaceRoot);

    await expect(
      service.trace({
        configuration: buildConfiguration(),
        directories: [],
        workspaceRoot,
      }),
    ).rejects.toThrow(ProgramConfigurationError);
  });

  it("names the configuration it could not read", async () => {
    const workspaceRoot = await buildWorkspace();

    await addUnreadableProject(workspaceRoot);

    await expect(
      service.trace({
        configuration: buildConfiguration(),
        directories: [],
        workspaceRoot,
      }),
    ).rejects.toThrow(/packages[\\/]broken[\\/]tsconfig\.json/);
  });

  it("traces the rest of a workspace whose broken project is excluded", async () => {
    // The regression this exists for. Excluding the same project only from
    // the collected files came too late — opening its configuration is the
    // step that fails — so `.callidescopeignore` could not keep a run away
    // from a fixture written to be broken, and the whole trace died on it.
    const workspaceRoot = await buildWorkspace();

    await addUnreadableProject(workspaceRoot);

    const outcome = await service.trace({
      configuration: {
        ...buildConfiguration(),
        exclude: ["packages/broken/**"],
      },
      directories: [],
      workspaceRoot,
    });

    expect(outcome.result.summary.projectCount).toBe(1);
    expect(
      outcome.result.deepStacks[0]?.frames.map((frame) => frame.displayName),
    ).toStrictEqual([
      "ExampleCommand.run",
      "ExampleService.load",
      "Repository.find",
      "Repository.open",
    ]);
  });

  it("never opens a tsconfig an exclusion already names", async () => {
    // What `.callidescopeignore` promises. Excluding the same project only
    // from the collected files would come too late — opening its
    // configuration is the step that fails.
    const workspaceRoot = await buildWorkspace();

    await addUnreadableProject(workspaceRoot);

    const outcome = await service.trace({
      configuration: {
        ...buildConfiguration(),
        exclude: ["packages/broken/**"],
      },
      directories: [],
      workspaceRoot,
    });

    expect(outcome.projectNames).toStrictEqual([
      path.join("packages", "example"),
    ]);
  });

  // 🕸️ A run scoped to one project

  describe("scoped to one project", () => {
    let layeredWorkspaceRoot: string;
    let scoped: Awaited<ReturnType<CallidescopeService["trace"]>>;
    let unscoped: Awaited<ReturnType<CallidescopeService["trace"]>>;

    beforeAll(async () => {
      layeredWorkspaceRoot = await buildLayeredWorkspace();
      scoped = await service.trace({
        configuration: buildConfiguration(),
        directories: [path.join("packages", "application")],
        workspaceRoot: layeredWorkspaceRoot,
      });
      unscoped = await service.trace({
        configuration: buildConfiguration(),
        directories: [],
        workspaceRoot: layeredWorkspaceRoot,
      });
    });

    it("reports the project it was given and the one its imports reach", () => {
      expect(scoped.projectNames).toStrictEqual([
        path.join("packages", "application"),
        path.join("packages", "library"),
      ]);
    });

    it("offers only the scoped project for publishing", () => {
      // Measurement reaches into a dependency; publishing does not. The roots
      // are what a README section is addressed by, so a closure project
      // missing from this map is a dependency README the run cannot rewrite.
      expect([...scoped.startingProjectRoots.keys()]).toStrictEqual([
        path.join("packages", "application"),
      ]);
    });

    it("offers every project for publishing when no directory is named", () => {
      // The whole-workspace run keeps publishing every project's section,
      // because with no directory named every project is a starting project.
      expect(
        [...unscoped.startingProjectRoots.keys()].toSorted(),
      ).toStrictEqual(unscoped.projectNames.toSorted());
    });

    it("follows a call into a dependency down to a real frame", () => {
      // Without the dependency's own program there is no declaration to
      // resolve `find` against, so the stack stopped at the package boundary
      // and the two frames below it were never measured.
      expect(
        scoped.result.deepStacks[0]?.frames.map((frame) => frame.displayName),
      ).toStrictEqual([
        "ApplicationCommand.run",
        "Repository.find",
        "Repository.open",
      ]);
    });

    it("reports an exact depth rather than a lower bound", () => {
      expect(scoped.result.deepStacks[0]?.isLowerBound).toBe(false);
    });

    it("leaves a project that imports the scoped one out of the report", () => {
      expect(
        scoped.result.projects.map((report) => report.projectName),
      ).not.toContain(path.join("packages", "consumer"));
    });

    it("leaves a project nothing reaches out of the report", () => {
      expect(
        scoped.result.projects.map((report) => report.projectName),
      ).not.toContain(path.join("packages", "unrelated"));
    });

    it("leaves a project root holding no package.json out of the closure", () => {
      // The scoped project really does import it and the compiler really does
      // read it — but a directory of shared settings is not a dependency, and
      // admitting one is how a scoped run ends up compiling the workspace.
      expect(scoped.projectNames).not.toContain(
        path.join("packages", "settings"),
      );
    });

    it("still traces a project root holding no package.json when unscoped", () => {
      // The asymmetry the rule turns on: refused as a destination, traced as
      // a starting project, so a whole-workspace run still reports on it.
      expect(unscoped.projectNames).toContain(
        path.join("packages", "settings"),
      );
    });

    it("measures the same depth as the run that traced everything", () => {
      const arguments_ = {
        entryPointName: "ApplicationCommand.run",
        projectName: path.join("packages", "application"),
      };
      const scopedDepth = readStackDepth({
        ...arguments_,
        result: scoped.result,
      });

      // The literal first, and only then the comparison. Both lookups can
      // come back `undefined` — a renamed type, a project that stops being
      // reported — and an equality on its own would call that agreement.
      expect(scopedDepth).toBe(SCOPED_COMMAND_DEPTH);
      expect(scopedDepth).toBe(
        readStackDepth({ ...arguments_, result: unscoped.result }),
      );
    });

    it("still means every project when no directory is named", () => {
      expect(unscoped.projectNames).toStrictEqual([
        path.join("packages", "application"),
        path.join("packages", "consumer"),
        path.join("packages", "library"),
        path.join("packages", "settings"),
        path.join("packages", "unrelated"),
      ]);
    });

    it("refuses a named directory holding no tsconfig.json", async () => {
      // Reported through the same channel as a project it could not read,
      // rather than warned past — a run that quietly traced one project fewer
      // than it was told to is a gate that passed for having looked at less.
      await expect(
        service.trace({
          configuration: buildConfiguration(),
          directories: [path.join("packages", "missing")],
          workspaceRoot: layeredWorkspaceRoot,
        }),
      ).rejects.toThrow(ProgramConfigurationError);
    });
  });

  // 🗂️ A project that configures itself

  describe("a project with a configuration of its own", () => {
    /** Reads the kind every stack in one project was rooted under. */
    function readEntryPointKinds(args: {
      outcome: Awaited<ReturnType<CallidescopeService["trace"]>>;
      projectName: string;
    }): Record<string, string> {
      const report = args.outcome.result.projects.find(
        (candidate) => candidate.projectName === args.projectName,
      );
      const kinds: Record<string, string> = {};

      for (const stack of report?.stacks ?? []) {
        const displayName = stack.frames[0]?.displayName;

        if (displayName !== undefined) {
          kinds[displayName] = stack.entryPointKind;
        }
      }

      return kinds;
    }

    it("roots the callable its own configuration declared by address", async () => {
      const workspaceRoot = await buildConfiguredWorkspace({
        entryPoints: {
          addresses: ["packages/library/src/repository.ts#Repository.open"],
        },
      });

      const outcome = await service.trace({
        configuration: buildConfiguration(),
        directories: [],
        workspaceRoot,
      });

      expect(
        readEntryPointKinds({
          outcome,
          projectName: path.join("packages", "library"),
        }),
      ).toStrictEqual({ "Repository.open": "declared" });
    });

    it("applies those rules to a run started from another project", async () => {
      // The criterion the per-project resolution exists for. `library` is in
      // this run only because `application`'s imports reach it, and it is
      // still judged by what it declared rather than by whoever reached it.
      const workspaceRoot = await buildConfiguredWorkspace({
        entryPoints: {
          addresses: ["packages/library/src/repository.ts#Repository.open"],
        },
      });

      const outcome = await service.trace({
        configuration: buildConfiguration(),
        directories: [path.join("packages", "application")],
        workspaceRoot,
      });

      expect(
        readEntryPointKinds({
          outcome,
          projectName: path.join("packages", "library"),
        }),
      ).toStrictEqual({ "Repository.open": "declared" });
    });

    it("refuses a project setting a field only the workspace may set", async () => {
      const workspaceRoot = await buildConfiguredWorkspace({
        write: { json: { path: "report.json" } },
      });

      await expect(
        service.trace({
          configuration: buildConfiguration(),
          directories: [],
          workspaceRoot,
        }),
      ).rejects.toThrow(/only the workspace configuration may set/);
    });

    it("reads the file the run was pointed at as the workspace's alone", async () => {
      // One file, one role per run. A package whose task names its own file
      // would otherwise have it read a second time as that package's project
      // configuration, and refused for the very fields it may set as a
      // workspace configuration.
      const workspaceRoot = await buildConfiguredWorkspace({
        write: { json: { path: "report.json" } },
      });

      const outcome = await service.trace({
        configuration: buildConfiguration(),
        configurationPath: LIBRARY_CONFIGURATION_PATH,
        directories: [],
        workspaceRoot,
      });

      expect(outcome.result.summary.projectCount).toBe(2);
    });
  });

  it("builds the same graph a full trace would, without any analysis", async () => {
    const located = await service.locate({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot: tracedWorkspaceRoot,
    });

    const commandId = [...located.callablesById.entries()].find(
      ([, callable]) => callable.node.displayName === "ExampleCommand.run",
    )?.[0];
    const serviceId = [...located.callablesById.entries()].find(
      ([, callable]) => callable.node.displayName === "ExampleService.load",
    )?.[0];

    expect(
      commandId !== undefined && located.graph.calleeIdsByCaller.get(commandId),
    ).toStrictEqual([serviceId]);
  });
});
