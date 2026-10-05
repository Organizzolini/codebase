import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import { WorkspaceService } from "../workspace/workspace.service";

import { CompilerHostService } from "./compiler-host.service";
import { ProgramConfigurationError } from "./program.constants";
import { ProgramService } from "./program.service";

import type { WorkspaceProject } from "../workspace/workspace.types";
import type { LoggerService } from "@codebase/logging";
import type { DeepMocked } from "@golevelup/ts-vitest";

/**
 * Writes a project into an existing workspace, and describes it.
 *
 * A `package.json` comes with it unless `omitManifest` says otherwise, which
 * is what makes the project something another one's closure may reach.
 */
async function addProject(args: {
  configuration?: string;
  name: string;
  omitManifest?: boolean;
  sources?: Record<string, string>;
  workspaceRoot: string;
}): Promise<WorkspaceProject> {
  const root = path.join(args.workspaceRoot, "packages", args.name);

  await mkdir(root, { recursive: true });
  await writeFile(
    path.join(root, "tsconfig.json"),
    args.configuration ??
      JSON.stringify({
        compilerOptions: { noLib: true, target: "es2022" },
        include: ["src/**/*.ts"],
      }),
    "utf8",
  );

  if (args.omitManifest !== true) {
    await writeFile(path.join(root, "package.json"), "{}", "utf8");
  }

  for (const [name, text] of Object.entries(
    args.sources ?? { "src/index.ts": "export function entry(): void {}\n" },
  )) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), text, "utf8");
  }

  return {
    configurationPath: path.join(root, "tsconfig.json"),
    hasPackageManifest: args.omitManifest !== true,
    name: args.name,
    root: `packages/${args.name}`,
  };
}

/** Writes a project holding one source file, and returns its description. */
async function buildProject(args: {
  configuration?: string;
  name: string;
  omitManifest?: boolean;
  sources?: Record<string, string>;
}): Promise<{ project: WorkspaceProject; workspaceRoot: string }> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "callidescope-program-"),
  );

  return {
    project: await addProject({ ...args, workspaceRoot }),
    workspaceRoot,
  };
}

/** Names the projects a `ProgramSet` really built, in the order it holds. */
function readProjectNames(programSet: {
  programs: readonly { project: WorkspaceProject }[];
}): string[] {
  return programSet.programs.map(
    (projectProgram) => projectProgram.project.name,
  );
}

describe(ProgramService, () => {
  let service: ProgramService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [ProgramService],
    }).compile();

    service = await module.resolve(ProgramService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  let subjectLogger: DeepMocked<LoggerService>;

  const buildSubject = (): ProgramService => {
    subjectLogger = createMock<LoggerService>();

    return new ProgramService(
      new CompilerHostService(),
      subjectLogger,
      new WorkspaceService(createMock<LoggerService>()),
    );
  };

  it("logs which project it is reading", async () => {
    const { project, workspaceRoot } = await buildProject({ name: "example" });

    buildSubject().buildPrograms({
      startingProjects: [project],
      workspaceProjects: [project],
      workspaceRoot,
    });

    expect(subjectLogger.debug).toHaveBeenCalledWith(
      "🔭 Reading a project",
      undefined,
      { projectName: "example" },
    );
  });

  it("builds a program and a checker for a project", async () => {
    const { project, workspaceRoot } = await buildProject({ name: "example" });

    const programSet = buildSubject().buildPrograms({
      startingProjects: [project],
      workspaceProjects: [project],
      workspaceRoot,
    });

    expect(programSet.programs).toHaveLength(1);
    expect(programSet.programs[0]?.checker).toBeDefined();
  });

  it("records the files a project owns", async () => {
    const { project, workspaceRoot } = await buildProject({
      name: "example",
      sources: {
        "src/a.ts": "export function a(): void {}\n",
        "src/b.ts": "export function b(): void {}\n",
      },
    });

    const programSet = buildSubject().buildPrograms({
      startingProjects: [project],
      workspaceProjects: [project],
      workspaceRoot,
    });

    expect(programSet.programs[0]?.ownedFilePaths.size).toBe(2);
  });

  it("assigns every owned file to exactly one program", async () => {
    const { project, workspaceRoot } = await buildProject({ name: "example" });

    const programSet = buildSubject().buildPrograms({
      startingProjects: [project],
      workspaceProjects: [project],
      workspaceRoot,
    });

    expect(programSet.ownerByFilePath.size).toBe(1);
  });

  it("gives a file nested inside a second project to that nested project", async () => {
    // A parent project can list the same file its nested project owns when
    // the parent's own `include` is broad enough to reach it too —
    // containment settles that overlap by the file's location on disk,
    // regardless of which program was built first.
    const { project: parent, workspaceRoot } = await buildProject({
      configuration: JSON.stringify({
        compilerOptions: { noLib: true, target: "es2022" },
        include: ["src/**/*.ts", "testing/**/*.ts"],
      }),
      name: "example",
      sources: {
        "src/index.ts": "export function entry(): void {}\n",
        "testing/mock.ts": "export function mock(): void {}\n",
      },
    });
    const nestedRoot = path.join(workspaceRoot, "packages/example/testing");

    await mkdir(nestedRoot, { recursive: true });
    await writeFile(
      path.join(nestedRoot, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { noLib: true, target: "es2022" },
        include: ["**/*.ts"],
      }),
      "utf8",
    );

    const nested: WorkspaceProject = {
      configurationPath: path.join(nestedRoot, "tsconfig.json"),
      hasPackageManifest: true,
      name: "example-testing",
      root: "packages/example/testing",
    };

    const subject = buildSubject();
    const programSet = subject.buildPrograms({
      startingProjects: [parent, nested],
      workspaceProjects: [parent, nested],
      workspaceRoot,
    });

    const nestedFilePath = subject.toRealPath(path.join(nestedRoot, "mock.ts"));
    const parentFilePath = subject.toRealPath(
      path.join(workspaceRoot, "packages/example/src/index.ts"),
    );

    expect(programSet.ownerByFilePath.get(nestedFilePath)?.project.name).toBe(
      "example-testing",
    );
    expect(programSet.ownerByFilePath.get(parentFilePath)?.project.name).toBe(
      "example",
    );
  });

  it("skips a file no traced project contains, and warns why", async () => {
    // A project's own `include` can reach outside its own root — here into a
    // sibling directory no project in this run traces — so containment finds
    // nowhere to put the file rather than guessing.
    const { project, workspaceRoot } = await buildProject({
      configuration: JSON.stringify({
        compilerOptions: { noLib: true, target: "es2022" },
        include: ["../shared/**/*.ts"],
      }),
      name: "example",
      sources: {},
    });

    await mkdir(path.join(workspaceRoot, "packages/shared"), {
      recursive: true,
    });
    await writeFile(
      path.join(workspaceRoot, "packages/shared/helper.ts"),
      "export function helper(): void {}\n",
      "utf8",
    );

    const subject = buildSubject();
    const programSet = subject.buildPrograms({
      startingProjects: [project],
      workspaceProjects: [project],
      workspaceRoot,
    });

    expect(programSet.ownerByFilePath.size).toBe(0);
    expect(subjectLogger.warn).toHaveBeenCalledWith(
      "🔭 Skipped a file no traced project contains",
      undefined,
      { workspaceRelativePath: "packages/shared/helper.ts" },
    );
  });

  it("throws when a tsconfig cannot be read", async () => {
    const { project, workspaceRoot } = await buildProject({
      configuration: "{ not json",
      name: "broken",
    });

    expect(() =>
      buildSubject().buildPrograms({
        startingProjects: [project],
        workspaceProjects: [project],
        workspaceRoot,
      }),
    ).toThrow(ProgramConfigurationError);
  });

  it("throws when a tsconfig holds an invalid option", async () => {
    const { project, workspaceRoot } = await buildProject({
      configuration: JSON.stringify({
        compilerOptions: { target: "not-a-target" },
      }),
      name: "invalid",
    });

    expect(() =>
      buildSubject().buildPrograms({
        startingProjects: [project],
        workspaceProjects: [project],
        workspaceRoot,
      }),
    ).toThrow(ProgramConfigurationError);
  });

  it("builds no program at all when one project cannot be read", async () => {
    // Deliberately not partial. A caller writes its report before it weighs
    // its findings, so half a graph is a published wrong answer rather than a
    // smaller right one.
    const broken = await buildProject({
      configuration: "{ not json",
      name: "broken",
    });
    const readable = await buildProject({ name: "readable" });

    expect(() =>
      buildSubject().buildPrograms({
        startingProjects: [broken.project, readable.project],
        workspaceProjects: [broken.project, readable.project],
        workspaceRoot: readable.workspaceRoot,
      }),
    ).toThrow(ProgramConfigurationError);
  });

  // 🕸️ Dependency closure

  it("builds a program for a project only an import reaches", async () => {
    const { project: dependency, workspaceRoot } = await buildProject({
      name: "dependency",
      sources: { "src/index.ts": "export function helper(): void {}\n" },
    });
    const dependent = await addProject({
      name: "dependent",
      sources: {
        "src/index.ts": `
          import { helper } from "../../dependency/src/index";

          export function entry(): void { helper(); }
        `,
      },
      workspaceRoot,
    });

    const programSet = buildSubject().buildPrograms({
      startingProjects: [dependent],
      workspaceProjects: [dependency, dependent],
      workspaceRoot,
    });

    expect(readProjectNames(programSet)).toStrictEqual([
      "dependency",
      "dependent",
    ]);
  });

  it("builds no program for a project no import reaches", async () => {
    const { project: dependent, workspaceRoot } = await buildProject({
      name: "dependent",
    });
    const unrelated = await addProject({ name: "unrelated", workspaceRoot });

    const programSet = buildSubject().buildPrograms({
      startingProjects: [dependent],
      workspaceProjects: [dependent, unrelated],
      workspaceRoot,
    });

    expect(readProjectNames(programSet)).toStrictEqual(["dependent"]);
  });

  it("builds no program for a project that imports a starting one", async () => {
    // The closure runs one way. A dependent's own stacks belong to a run
    // scoped to the dependent, and putting them in this one would report
    // findings about code nobody asked about.
    const { project: dependency, workspaceRoot } = await buildProject({
      name: "dependency",
      sources: { "src/index.ts": "export function helper(): void {}\n" },
    });
    const dependent = await addProject({
      name: "dependent",
      sources: {
        "src/index.ts": `
          import { helper } from "../../dependency/src/index";

          export function entry(): void { helper(); }
        `,
      },
      workspaceRoot,
    });

    const programSet = buildSubject().buildPrograms({
      startingProjects: [dependency],
      workspaceProjects: [dependency, dependent],
      workspaceRoot,
    });

    expect(readProjectNames(programSet)).toStrictEqual(["dependency"]);
  });

  it("does not let a dependency drag in the project that holds it", async () => {
    // A package manager puts a dependency inside a package's own directory,
    // so the project whose root contains it is an ordinary workspace package
    // — reporting the dependency as something another project reached would
    // make every package holding one a dependency of everyone who uses it.
    const { project: vendor, workspaceRoot } = await buildProject({
      name: "vendor",
      sources: {
        "node_modules/library/index.ts": "export function library(): void {}\n",
        "src/index.ts": "export function vendored(): void {}\n",
      },
    });
    const example = await addProject({
      name: "example",
      sources: {
        "src/index.ts": `
          import { library } from "../../vendor/node_modules/library/index";

          export function entry(): void { library(); }
        `,
      },
      workspaceRoot,
    });

    const programSet = buildSubject().buildPrograms({
      startingProjects: [example],
      workspaceProjects: [example, vendor],
      workspaceRoot,
    });

    expect(readProjectNames(programSet)).toStrictEqual(["example"]);
  });

  it("does not let a file above the workspace drag in the workspace root", async () => {
    const enclosing = await mkdtemp(
      path.join(tmpdir(), "callidescope-enclosing-"),
    );
    const workspaceRoot = path.join(enclosing, "workspace");

    await mkdir(path.join(enclosing, "outside"), { recursive: true });
    await writeFile(
      path.join(enclosing, "outside/helper.ts"),
      "export function helper(): void {}\n",
      "utf8",
    );
    await mkdir(workspaceRoot, { recursive: true });

    const project = await addProject({
      name: "example",
      sources: {
        "src/index.ts": `
          import { helper } from "../../../../outside/helper";

          export function entry(): void { helper(); }
        `,
      },
      workspaceRoot,
    });
    const workspaceRootProject: WorkspaceProject = {
      configurationPath: path.join(workspaceRoot, "tsconfig.json"),
      hasPackageManifest: true,
      name: "workspace-root",
      root: "",
    };

    const programSet = buildSubject().buildPrograms({
      startingProjects: [project],
      workspaceProjects: [project, workspaceRootProject],
      workspaceRoot,
    });

    expect(readProjectNames(programSet)).toStrictEqual(["example"]);
  });

  it("builds no program for the workspace root project", async () => {
    // A repository keeps files at its own root, and the root project's root
    // contains every other project — so letting a root-level file pull it in
    // puts the entire workspace in every scoped closure. It holds a real
    // `package.json`, so the manifest rule alone would admit it.
    const { project, workspaceRoot } = await buildProject({
      name: "example",
      sources: {
        "src/index.ts": `
          import { SETTINGS } from "../../../settings";

          export function entry(): string { return SETTINGS.name; }
        `,
      },
    });
    const workspaceRootProject: WorkspaceProject = {
      configurationPath: path.join(workspaceRoot, "tsconfig.json"),
      hasPackageManifest: true,
      name: "workspace-root",
      root: "",
    };

    await writeFile(
      path.join(workspaceRoot, "settings.ts"),
      "export const SETTINGS = { name: 'x' };\n",
      "utf8",
    );

    const programSet = buildSubject().buildPrograms({
      startingProjects: [project],
      workspaceProjects: [project, workspaceRootProject],
      workspaceRoot,
    });

    expect(readProjectNames(programSet)).toStrictEqual(["example"]);
  });

  it("builds no program for a project root holding no package.json", async () => {
    // A directory of shared settings that every project's `tsconfig.json`
    // reaches into is not a dependency any of them has — see
    // `WorkspaceService.isClosureDestination`.
    const { project: settings, workspaceRoot } = await buildProject({
      name: "settings",
      omitManifest: true,
      sources: { "src/index.ts": "export const SETTINGS = { name: 'x' };\n" },
    });
    const dependent = await addProject({
      name: "dependent",
      sources: {
        "src/index.ts": `
          import { SETTINGS } from "../../settings/src/index";

          export function entry(): string { return SETTINGS.name; }
        `,
      },
      workspaceRoot,
    });

    const programSet = buildSubject().buildPrograms({
      startingProjects: [dependent],
      workspaceProjects: [dependent, settings],
      workspaceRoot,
    });

    expect(readProjectNames(programSet)).toStrictEqual(["dependent"]);
  });

  it("still builds a program for a starting project root holding no package.json", async () => {
    // Only a closure destination is refused, so an unscoped run — which names
    // every project as a starting one — traces it exactly as it always did.
    const { project: settings, workspaceRoot } = await buildProject({
      name: "settings",
      omitManifest: true,
    });
    const dependent = await addProject({ name: "dependent", workspaceRoot });

    const programSet = buildSubject().buildPrograms({
      startingProjects: [dependent, settings],
      workspaceProjects: [dependent, settings],
      workspaceRoot,
    });

    expect(readProjectNames(programSet)).toStrictEqual([
      "dependent",
      "settings",
    ]);
  });

  it("resolves a path that is not a symlink to itself", () => {
    expect(buildSubject().toRealPath("/workspace/a.ts")).toContain("a.ts");
  });

  it("returns the path unchanged when the host offers no realpath", () => {
    const realpath = ts.sys.realpath?.bind(ts.sys);

    delete ts.sys.realpath;

    try {
      expect(buildSubject().toRealPath("/workspace/a.ts")).toBe(
        "/workspace/a.ts",
      );
    } finally {
      if (realpath !== undefined) {
        ts.sys.realpath = realpath;
      }
    }
  });
});
