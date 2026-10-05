import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";

import { FileFilterService } from "./file-filter.service";
import { WorkspaceService } from "./workspace.service";

import type { FileFilter, WorkspaceProject } from "./workspace.types";
import type { LoggerService } from "@codebase/logging";
import type { DeepMocked } from "@golevelup/ts-vitest";

/** A project whose own configuration file excludes some of its files. */
const DECLARING_PROJECT: WorkspaceProject = {
  configurationPath: "",
  hasPackageManifest: true,
  name: "packages/declaring",
  root: "packages/declaring",
};

/** Its sibling, which declares nothing and must be left alone. */
const SIBLING_PROJECT: WorkspaceProject = {
  configurationPath: "",
  hasPackageManifest: true,
  name: "packages/sibling",
  root: "packages/sibling",
};

/** A project nested inside the declaring one, which owns its own files. */
const NESTED_PROJECT: WorkspaceProject = {
  configurationPath: "",
  hasPackageManifest: true,
  name: "packages/declaring/nested",
  root: "packages/declaring/nested",
};

const PROJECTS: readonly WorkspaceProject[] = [
  DECLARING_PROJECT,
  NESTED_PROJECT,
  SIBLING_PROJECT,
];

/** A run filter that excludes nothing, so only the project layer can decide. */
const PERMISSIVE_FILTER: FileFilter = { isExcluded: (): boolean => false };

describe(FileFilterService, () => {
  let service: FileFilterService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [FileFilterService],
    }).compile();

    service = await module.resolve(FileFilterService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  const subjectLogger: DeepMocked<LoggerService> = createMock<LoggerService>();
  const subject = new FileFilterService(
    new WorkspaceService(createMock<LoggerService>()),
    subjectLogger,
  );

  // 🙈 Exclusions

  it("excludes a path matching a configured glob", () => {
    const filter = subject.buildFileFilter({
      exclude: ["**/generated/**"],
      excludeFrom: [],
      workspaceRoot: "/workspace",
    });

    expect(filter.isExcluded("packages/example/src/generated/api.ts")).toBe(
      true,
    );
    expect(filter.isExcluded("packages/example/src/api.ts")).toBe(false);
  });

  it("warns and continues when an ignore file is missing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "callidescope-ignore-"));
    const filter = subject.buildFileFilter({
      exclude: [],
      excludeFrom: ["configuration/.callidescopeignore"],
      workspaceRoot: root,
    });

    expect(filter.isExcluded("packages/example/src/a.ts")).toBe(false);
    expect(subjectLogger.warn).toHaveBeenCalledWith(
      "🔭 Skipped a missing ignore file",
      undefined,
      { ignoreFile: "configuration/.callidescopeignore" },
    );
  });

  it("survives an ignore file git cannot apply", async () => {
    // No git repository here, so `git ls-files` fails — which must degrade to
    // "nothing ignored" rather than taking the run down.
    const root = await mkdtemp(
      path.join(tmpdir(), "callidescope-unversioned-"),
    );

    await mkdir(path.join(root, "configuration"), { recursive: true });
    await writeFile(
      path.join(root, "configuration", ".callidescopeignore"),
      "**/*.test.ts\n",
      "utf8",
    );

    const filter = subject.buildFileFilter({
      exclude: [],
      excludeFrom: ["configuration/.callidescopeignore"],
      workspaceRoot: root,
    });

    expect(filter.isExcluded("packages/example/src/a.ts")).toBe(false);
    expect(subjectLogger.warn).toHaveBeenCalledWith(
      "🔭 Skipped an unreadable ignore file",
      undefined,
      {
        ignorePath: path.join(root, "configuration", ".callidescopeignore"),
      },
    );
  });

  it("applies an ignore file through git", () => {
    // Run against this repository, which is the only place `git ls-files` has
    // anything to report — the branch that actually collects ignored paths.
    const workspaceRoot = path.resolve(process.cwd(), "..", "..", "..", "..");
    const filter = subject.buildFileFilter({
      exclude: [],
      excludeFrom: ["configuration/.callidescopeignore"],
      workspaceRoot,
    });

    // Git only reports paths it tracks, so the assertion names one that
    // exists rather than one the pattern would merely have matched. The
    // agent-skill packages are excluded outright rather than by any single
    // project, so this path stays in the workspace ignore file regardless of
    // how far project-owned exclusions migrate into their own configurations.
    expect(
      filter.isExcluded(
        "packages/ic-suite/callidescope/callidescope-agents/README.md",
      ),
    ).toBe(true);
    expect(
      filter.isExcluded(
        "packages/ic-suite/callidescope/callidescope-cli/src/main.ts",
      ),
    ).toBe(false);
  });

  // 🏠 Per-project exclusions

  it("hands the run's own filter back when no project excludes anything", () => {
    expect(
      subject.buildProjectFileFilter({
        excludeByProject: new Map(),
        fileFilter: PERMISSIVE_FILTER,
        projects: PROJECTS,
      }),
    ).toBe(PERMISSIVE_FILTER);
  });

  it("anchors a project's globs to that project's own root", () => {
    const filter = subject.buildProjectFileFilter({
      excludeByProject: new Map([
        [DECLARING_PROJECT.name, ["src/generated/**"]],
      ]),
      fileFilter: PERMISSIVE_FILTER,
      projects: PROJECTS,
    });

    expect(filter.isExcluded("packages/declaring/src/generated/api.ts")).toBe(
      true,
    );
    expect(filter.isExcluded("packages/declaring/src/api.ts")).toBe(false);
  });

  it("never lets one project's globs reach another project's files", () => {
    // The same glob text, and a sibling path it would match if the globs were
    // read workspace-relative or applied to every file the run collected.
    const filter = subject.buildProjectFileFilter({
      excludeByProject: new Map([
        [DECLARING_PROJECT.name, ["**/*.generated.ts", "packages/**"]],
      ]),
      fileFilter: PERMISSIVE_FILTER,
      projects: PROJECTS,
    });

    expect(filter.isExcluded("packages/declaring/a.generated.ts")).toBe(true);
    expect(filter.isExcluded("packages/sibling/a.generated.ts")).toBe(false);
    expect(filter.isExcluded("packages/sibling/src/a.ts")).toBe(false);
  });

  it("stops a project's globs at a project nested inside it", () => {
    const filter = subject.buildProjectFileFilter({
      excludeByProject: new Map([
        [DECLARING_PROJECT.name, ["**/*.generated.ts"]],
      ]),
      fileFilter: PERMISSIVE_FILTER,
      projects: PROJECTS,
    });

    expect(filter.isExcluded("packages/declaring/a.generated.ts")).toBe(true);
    expect(filter.isExcluded("packages/declaring/nested/a.generated.ts")).toBe(
      false,
    );
  });

  it("leaves a file no traced project owns alone", () => {
    const filter = subject.buildProjectFileFilter({
      excludeByProject: new Map([[DECLARING_PROJECT.name, ["**/*.ts"]]]),
      fileFilter: PERMISSIVE_FILTER,
      projects: PROJECTS,
    });

    expect(filter.isExcluded("applications/elsewhere/src/a.ts")).toBe(false);
  });

  it("keeps everything the run already excluded excluded", () => {
    // A project cannot un-exclude what the run excluded: the run's filter is
    // layered under, and its answer is the one that decides.
    const filter = subject.buildProjectFileFilter({
      excludeByProject: new Map([[SIBLING_PROJECT.name, ["nothing/**"]]]),
      fileFilter: { isExcluded: (): boolean => true },
      projects: PROJECTS,
    });

    expect(filter.isExcluded("packages/sibling/src/a.ts")).toBe(true);
  });
});
