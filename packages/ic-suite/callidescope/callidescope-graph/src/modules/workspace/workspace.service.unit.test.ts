import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import { ProgramConfigurationError } from "../program/program.constants";

import { WorkspaceService } from "./workspace.service";

import type { WorkspaceProject } from "./workspace.types";
import type { LoggerService } from "@codebase/logging";
import type { DeepMocked } from "@golevelup/ts-vitest";

const PROJECT: WorkspaceProject = {
  configurationPath: "/workspace/packages/example/tsconfig.json",
  hasPackageManifest: true,
  name: "example",
  root: "packages/example",
};

/**
 * Writes a workspace holding a `tsconfig.json` at each relative path, and a
 * `package.json` beside it unless the root is named in `rootsWithoutManifest` —
 * which is what makes that root a project no closure may reach.
 */
async function buildWorkspace(
  projectRoots: readonly string[],
  options: { rootsWithoutManifest?: readonly string[] } = {},
): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "callidescope-workspace-"));
  const rootsWithoutManifest = options.rootsWithoutManifest ?? [];

  for (const projectRoot of projectRoots) {
    const directory = path.join(root, projectRoot);

    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "tsconfig.json"), "{}", "utf8");

    if (!rootsWithoutManifest.includes(projectRoot)) {
      await writeFile(path.join(directory, "package.json"), "{}", "utf8");
    }
  }

  return root;
}

const DEPENDENCY_PROJECT: WorkspaceProject = {
  configurationPath: "",
  hasPackageManifest: true,
  name: "packages/dependency",
  root: "packages/dependency",
};

const DEPENDENT_PROJECT: WorkspaceProject = {
  configurationPath: "",
  hasPackageManifest: true,
  name: "packages/dependent",
  root: "packages/dependent",
};

const STARTING_PROJECT: WorkspaceProject = {
  configurationPath: "",
  hasPackageManifest: true,
  name: "packages/starting",
  root: "packages/starting",
};

/** A directory of shared settings: a project root holding no manifest. */
const SHARED_PROJECT: WorkspaceProject = {
  configurationPath: "",
  hasPackageManifest: false,
  name: "packages/shared",
  root: "packages/shared",
};

const TRANSITIVE_PROJECT: WorkspaceProject = {
  configurationPath: "",
  hasPackageManifest: true,
  name: "packages/transitive",
  root: "packages/transitive",
};

/**
 * The workspace root as a project: a manifest of its own, and a root that
 * contains every other project's.
 */
const WORKSPACE_ROOT_PROJECT: WorkspaceProject = {
  configurationPath: "",
  hasPackageManifest: true,
  name: "workspace-root",
  root: "",
};

/** Every project the closure tests resolve paths against. */
const CLOSURE_PROJECTS: readonly WorkspaceProject[] = [
  DEPENDENCY_PROJECT,
  DEPENDENT_PROJECT,
  SHARED_PROJECT,
  STARTING_PROJECT,
  TRANSITIVE_PROJECT,
  WORKSPACE_ROOT_PROJECT,
];

/**
 * Builds a fake `resolveProjectFiles` callback from a fixed project graph —
 * no TypeScript program anywhere, exactly what makes the traversal testable
 * on its own.
 *
 * `reached` records the projects the callback was asked about, in the order it
 * was asked, which is the same thing `ProgramService.buildPrograms` collects
 * in the real callback. The traversal returns nothing, so this is how a
 * closure is read here and in production alike.
 */
function fakeProjectFiles(
  filesByProjectName: Readonly<Record<string, readonly string[]>>,
): {
  reached: string[];
  resolveProjectFiles: (project: WorkspaceProject) => readonly string[];
} {
  const reached: string[] = [];

  return {
    reached,
    resolveProjectFiles: (project: WorkspaceProject): readonly string[] => {
      reached.push(project.name);

      return filesByProjectName[project.name] ?? [];
    },
  };
}

describe(WorkspaceService, () => {
  let service: WorkspaceService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [WorkspaceService],
    }).compile();

    service = await module.resolve(WorkspaceService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  const subjectLogger: DeepMocked<LoggerService> = createMock<LoggerService>();
  const subject = new WorkspaceService(subjectLogger);

  // 📂 Project discovery

  it("traces exactly the directories it was given", async () => {
    const root = await buildWorkspace(["packages/wanted", "packages/other"]);

    expect(
      subject
        .discoverProjects({
          directories: ["packages/wanted"],
          workspaceRoot: root,
        })
        .map((project) => project.name),
    ).toStrictEqual(["packages/wanted"]);
  });

  it("resolves an absolute directory against the workspace root", async () => {
    const root = await buildWorkspace(["packages/wanted"]);

    expect(
      subject
        .discoverProjects({
          directories: [path.join(root, "packages/wanted")],
          workspaceRoot: root,
        })
        .map((project) => project.name),
    ).toStrictEqual(["packages/wanted"]);
  });

  it("refuses a named directory with no tsconfig", async () => {
    // Stepping over it was the old behavior, and it is how a run came to
    // report a workspace smaller than the one it was pointed at — a typo in a
    // `--directories` list passed every gate for having traced less.
    const root = await mkdtemp(path.join(tmpdir(), "callidescope-untyped-"));

    await mkdir(path.join(root, "packages", "untyped"), { recursive: true });

    expect(() =>
      subject.discoverProjects({
        directories: ["packages/untyped"],
        workspaceRoot: root,
      }),
    ).toThrow(ProgramConfigurationError);
  });

  it("names the directory it found no tsconfig in", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "callidescope-untyped-"));

    await mkdir(path.join(root, "packages", "untyped"), { recursive: true });

    expect(() =>
      subject.discoverProjects({
        directories: ["packages/untyped"],
        workspaceRoot: root,
      }),
    ).toThrow(/packages[\\/]untyped[\\/]tsconfig\.json/);
  });

  it("records whether each discovered project root holds a package.json", async () => {
    // Read here, once per project, rather than once per file a program pulled
    // in — and it is what `isClosureDestination` goes on to judge.
    const root = await buildWorkspace(["packages/library", "packages/shared"], {
      rootsWithoutManifest: ["packages/shared"],
    });

    expect(
      subject
        .discoverProjects({ directories: [], workspaceRoot: root })
        .map((project) => [project.name, project.hasPackageManifest]),
    ).toStrictEqual([
      ["packages/library", true],
      ["packages/shared", false],
    ]);
  });

  it("finds every tsconfig.json in the workspace when none are named", async () => {
    const root = await buildWorkspace([
      "applications/app",
      "packages/library",
      "tools/utility",
    ]);

    expect(
      service
        .discoverProjects({ directories: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["applications/app", "packages/library", "tools/utility"]);
  });

  it("returns projects in a stable order regardless of the filesystem", async () => {
    // A report's per-project rows read off this order, so an unstable one
    // would make output differ between runs even when nothing changed.
    const root = await buildWorkspace(["packages/zebra", "packages/alpha"]);

    expect(
      service
        .discoverProjects({ directories: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["packages/alpha", "packages/zebra"]);
  });

  it("descends into a project that nests another tsconfig.json beneath it", async () => {
    const root = await buildWorkspace([
      "packages/library",
      "packages/library/testing",
    ]);

    expect(
      subject
        .discoverProjects({ directories: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["packages/library", "packages/library/testing"]);
  });

  it("does not descend into node_modules, build output, or dotfiles", async () => {
    const root = await buildWorkspace([
      "packages/library",
      "node_modules/some-dependency",
      "packages/library/dist",
      ".git/hooks",
    ]);

    expect(
      subject
        .discoverProjects({ directories: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["packages/library"]);
  });

  it("does not descend into a scaffolding template's placeholder directory", async () => {
    const root = await buildWorkspace([
      "packages/library",
      "templates/{{nameKebabCase}}",
    ]);

    expect(
      subject
        .discoverProjects({ directories: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["packages/library"]);
  });

  it("drops a project an exclusion names, before reading its tsconfig", async () => {
    // The regression this exists for: excluding a project only from the file
    // list is too late, because reading its `tsconfig.json` is what fails.
    const root = await buildWorkspace(["packages/library", "packages/broken"]);

    expect(
      subject
        .discoverProjects({
          directories: [],
          fileFilter: {
            isExcluded: (relativePath): boolean =>
              relativePath.startsWith("packages/broken/"),
          },
          workspaceRoot: root,
        })
        .map((project) => project.name),
    ).toStrictEqual(["packages/library"]);
  });

  it("drops a named directory an exclusion also names", async () => {
    const root = await buildWorkspace(["packages/broken"]);

    expect(
      subject.discoverProjects({
        directories: ["packages/broken"],
        fileFilter: { isExcluded: (): boolean => true },
        workspaceRoot: root,
      }),
    ).toStrictEqual([]);
  });

  it("finds nothing in an empty workspace", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "callidescope-empty-"));

    expect(
      subject.discoverProjects({ directories: [], workspaceRoot: root }),
    ).toStrictEqual([]);
  });

  // 🎯 Ownership

  it("gives a file to the project whose root contains it", () => {
    expect(
      subject.resolveOwningProject({
        projects: [
          {
            configurationPath: "",
            hasPackageManifest: true,
            name: "other",
            root: "packages/other",
          },
          PROJECT,
        ],
        workspaceRelativePath: "packages/example/src/main.ts",
      }),
    ).toStrictEqual(PROJECT);
  });

  it("gives a file to the nearest containing root, not any ancestor", () => {
    const nested: WorkspaceProject = {
      configurationPath: "",
      hasPackageManifest: true,
      name: "example/testing",
      root: "packages/example/testing",
    };

    expect(
      subject.resolveOwningProject({
        projects: [PROJECT, nested],
        workspaceRelativePath: "packages/example/testing/mock.ts",
      }),
    ).toStrictEqual(nested);
    // Order in the list must not matter — the deepest root still wins.
    expect(
      subject.resolveOwningProject({
        projects: [nested, PROJECT],
        workspaceRelativePath: "packages/example/testing/mock.ts",
      }),
    ).toStrictEqual(nested);
  });

  it("does not let a sibling with a shared string prefix claim a file", () => {
    const sibling: WorkspaceProject = {
      configurationPath: "",
      hasPackageManifest: true,
      name: "example",
      root: "packages/example",
    };

    expect(
      subject.resolveOwningProject({
        projects: [sibling],
        workspaceRelativePath: "packages/example-extra/src/main.ts",
      }),
    ).toBeUndefined();
  });

  it("falls back to the workspace root project for an otherwise unowned file", () => {
    const root: WorkspaceProject = {
      configurationPath: "",
      hasPackageManifest: true,
      name: "",
      root: "",
    };

    expect(
      subject.resolveOwningProject({
        projects: [PROJECT, root],
        workspaceRelativePath: "scripts/build.ts",
      }),
    ).toStrictEqual(root);
  });

  it("names no owner when no traced project contains the file", () => {
    expect(
      subject.resolveOwningProject({
        projects: [PROJECT],
        workspaceRelativePath: "packages/other/src/main.ts",
      }),
    ).toBeUndefined();
  });

  // 🕸️ Dependency closure

  it("reaches a starting project itself plus every project its imports transitively reach", () => {
    const { reached, resolveProjectFiles } = fakeProjectFiles({
      "packages/dependency": ["packages/transitive/src/index.ts"],
      "packages/starting": ["packages/dependency/src/index.ts"],
    });

    subject.walkImportedProjectClosure({
      resolveProjectFiles,
      startingProjects: [STARTING_PROJECT],
      workspaceProjects: CLOSURE_PROJECTS,
    });

    expect(reached.toSorted()).toStrictEqual([
      "packages/dependency",
      "packages/starting",
      "packages/transitive",
    ]);
  });

  it("does not reach a project's dependents", () => {
    const { reached, resolveProjectFiles } = fakeProjectFiles({
      "packages/dependent": ["packages/starting/src/index.ts"],
    });

    subject.walkImportedProjectClosure({
      resolveProjectFiles,
      startingProjects: [STARTING_PROJECT],
      workspaceProjects: CLOSURE_PROJECTS,
    });

    expect(reached).toStrictEqual(["packages/starting"]);
  });

  it("terminates a cycle between two projects", () => {
    const { reached, resolveProjectFiles } = fakeProjectFiles({
      "packages/dependency": ["packages/starting/src/index.ts"],
      "packages/starting": ["packages/dependency/src/index.ts"],
    });

    subject.walkImportedProjectClosure({
      resolveProjectFiles,
      startingProjects: [STARTING_PROJECT],
      workspaceProjects: CLOSURE_PROJECTS,
    });

    // Each project's files are read exactly once — proof the cycle
    // terminated instead of looping between the two projects forever.
    expect(reached).toStrictEqual(["packages/starting", "packages/dependency"]);
  });

  it("does not mistake a resolved file belonging to no project for one", () => {
    const { reached, resolveProjectFiles } = fakeProjectFiles({
      "packages/starting": [
        "node_modules/left-pad/index.js",
        "packages/transitive/src/index.d.ts",
      ],
    });

    subject.walkImportedProjectClosure({
      resolveProjectFiles,
      startingProjects: [STARTING_PROJECT],
      workspaceProjects: [STARTING_PROJECT],
    });

    expect(reached).toStrictEqual(["packages/starting"]);
  });

  it("reaches the same set whichever order the starting roots are given in", () => {
    const files = {
      "packages/dependent": ["packages/starting/src/index.ts"],
      "packages/starting": ["packages/dependency/src/index.ts"],
    };
    const forward = fakeProjectFiles(files);
    const reversed = fakeProjectFiles(files);

    subject.walkImportedProjectClosure({
      resolveProjectFiles: forward.resolveProjectFiles,
      startingProjects: [STARTING_PROJECT, DEPENDENT_PROJECT],
      workspaceProjects: CLOSURE_PROJECTS,
    });
    subject.walkImportedProjectClosure({
      resolveProjectFiles: reversed.resolveProjectFiles,
      startingProjects: [DEPENDENT_PROJECT, STARTING_PROJECT],
      workspaceProjects: CLOSURE_PROJECTS,
    });

    const expected = [
      "packages/dependency",
      "packages/dependent",
      "packages/starting",
    ];

    expect(forward.reached.toSorted()).toStrictEqual(expected);
    expect(reversed.reached.toSorted()).toStrictEqual(expected);
  });

  it("does not reach a project root holding no package.json through a pulled-in file", () => {
    // A directory of shared settings is read by everything and depended on by
    // nothing — see `isClosureDestination` for what it would otherwise drag in.
    const { reached, resolveProjectFiles } = fakeProjectFiles({
      "packages/starting": [
        "packages/shared/eslint.config.ts",
        "packages/transitive/src/index.ts",
      ],
    });

    subject.walkImportedProjectClosure({
      resolveProjectFiles,
      startingProjects: [STARTING_PROJECT],
      workspaceProjects: CLOSURE_PROJECTS,
    });

    expect(reached.toSorted()).toStrictEqual([
      "packages/starting",
      "packages/transitive",
    ]);
  });

  it("still reaches a starting project root holding no package.json", () => {
    // Only a destination is refused. Naming a project — which is what an
    // unscoped run does to every one of them — still traces it.
    const { reached, resolveProjectFiles } = fakeProjectFiles({});

    subject.walkImportedProjectClosure({
      resolveProjectFiles,
      startingProjects: [SHARED_PROJECT, STARTING_PROJECT],
      workspaceProjects: CLOSURE_PROJECTS,
    });

    expect(reached.toSorted()).toStrictEqual([
      "packages/shared",
      "packages/starting",
    ]);
  });

  it("does not let a file the workspace root owns widen the closure", () => {
    // A repository keeps files at its own root — a `codometer.config.ts`, a
    // `scripts/` directory — and the root project's root contains every other
    // project, so admitting it as a dependency puts the whole workspace in
    // every closure. It holds a `package.json`, so the manifest rule alone
    // would let it through.
    const { reached, resolveProjectFiles } = fakeProjectFiles({
      "packages/starting": ["codometer.config.ts"],
    });

    subject.walkImportedProjectClosure({
      resolveProjectFiles,
      startingProjects: [STARTING_PROJECT],
      workspaceProjects: CLOSURE_PROJECTS,
    });

    expect(reached).toStrictEqual(["packages/starting"]);
  });

  it("still reaches the workspace root as a starting project", () => {
    const { reached, resolveProjectFiles } = fakeProjectFiles({});

    subject.walkImportedProjectClosure({
      resolveProjectFiles,
      startingProjects: [WORKSPACE_ROOT_PROJECT],
      workspaceProjects: CLOSURE_PROJECTS,
    });

    expect(reached).toStrictEqual(["workspace-root"]);
  });

  // 🧪 Test detection

  it.each([
    "example.unit.test.ts",
    "example.integration.test.ts",
    "example.end-to-end.test.ts",
    "example.test.ts",
    "example.spec.tsx",
  ])("recognizes %s as a test file", (fileName) => {
    expect(subject.isTestFile(fileName)).toBe(true);
  });

  it.each([
    "packages/example/testing/mocks.ts",
    "packages/example/testing/setup.ts",
  ])("recognizes %s as test scaffolding", (filePath) => {
    expect(subject.isTestFile(filePath)).toBe(true);
  });

  it("does not mistake a directory merely containing the word", () => {
    expect(subject.isTestFile("packages/testing-library/src/a.ts")).toBe(false);
  });

  it("does not mistake a service for a test", () => {
    expect(subject.isTestFile("example.service.ts")).toBe(false);
  });

  // 🧭 Paths

  it("rewrites an absolute path as workspace-relative", () => {
    expect(
      subject.toWorkspaceRelative({
        absolutePath: path.join("/workspace", "packages", "example", "a.ts"),
        workspaceRoot: "/workspace",
      }),
    ).toBe("packages/example/a.ts");
  });
});
