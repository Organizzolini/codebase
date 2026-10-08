import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { DiscoveryService } from "./discovery.service";
import { IgnoreRulesService } from "./ignore-rules.service";

import type { DiscoveryResult } from "./discovery.types";
import type { DeepMocked } from "@golevelup/ts-vitest";
import type { Dirent } from "node:fs";

// The walk is mocked down to the three filesystem calls it makes, so this
// stays a unit test. Real directories are walked in
// `discovery.service.integration.test.ts`.
const { existsSyncMock, readdirSyncMock, readFileSyncMock } = vi.hoisted(
  () => ({
    existsSyncMock: vi.fn<(filePath: string) => boolean>(),
    readdirSyncMock: vi.fn<(directory: string) => Dirent[]>(),
    readFileSyncMock: vi.fn<(filePath: string) => string>(),
  }),
);

vi.mock("node:fs", async (importOriginal) => ({
  // Everything else the module graph reaches for stays real; only the three
  // calls the walk makes are answered from the in-memory tree below.
  ...(await importOriginal<Record<string, unknown>>()),
  existsSync: existsSyncMock,
  readdirSync: readdirSyncMock,
  readFileSync: readFileSyncMock,
}));

const DEFAULT_EXCLUDE = [
  "**/.nx/**",
  "**/build/**",
  "**/coverage/**",
  "**/dist/**",
  "**/node_modules/**",
];

/** What a directory entry is, as far as the walk is concerned. */
type EntryKind = "directory" | "file" | "symlink";

/** An in-memory tree, keyed by absolute directory path. */
const TREE: Readonly<
  Record<string, readonly (readonly [string, EntryKind])[]>
> = {
  "/repo": [
    [".gitignore", "file"],
    ["AGENTS.md", "file"],
    ["CLAUDE.md", "symlink"],
    ["build", "directory"],
    ["node_modules", "directory"],
    ["redistribute", "directory"],
    ["src", "directory"],
  ],
  "/repo/build": [["output.js", "file"]],
  "/repo/node_modules": [["library", "directory"]],
  "/repo/node_modules/library": [["index.ts", "file"]],
  "/repo/redistribute": [["index.ts", "file"]],
  "/repo/src": [
    ["app.ts", "file"],
    ["app.unit.test.ts", "file"],
    ["data.json", "file"],
    ["notes.md", "file"],
    ["script.py", "file"],
    ["styles.css", "file"],
    ["utility.js", "file"],
  ],
};

/** Ignore files the mocked filesystem holds, keyed by absolute path. */
const IGNORE_FILES: Readonly<Record<string, string>> = {
  "/repo/.codometerignore": "/AGENTS.md\n",
  "/repo/.gitignore": "build/\n",
};

/** Builds the directory entry the mocked `readdirSync` hands back. */
function createEntry(name: string, kind: EntryKind): Dirent {
  return createMock<Dirent>({
    isDirectory: () => kind === "directory",
    isFile: () => kind === "file",
    isSymbolicLink: () => kind === "symlink",
    name,
  });
}

describe(DiscoveryService, () => {
  let service: DiscoveryService;
  let loggerService: DeepMocked<LoggerService>;

  /** Discovers the in-memory tree with the repository's default exclusions. */
  function discover(exclude = DEFAULT_EXCLUDE): DiscoveryResult {
    return service.discoverFiles({
      exclude,
      excludeFrom: [".codometerignore"],
      workingDirectory: "/repo",
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        IgnoreRulesService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    service = await module.resolve(DiscoveryService);
    loggerService = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    readdirSyncMock.mockImplementation((directory) => {
      const entries = TREE[directory];

      if (entries === undefined) {
        throw new Error(`ENOENT: no such file or directory, ${directory}`);
      }

      return entries.map(([name, kind]) => createEntry(name, kind));
    });
    existsSyncMock.mockImplementation((filePath) => filePath in IGNORE_FILES);
    readFileSyncMock.mockImplementation(
      (filePath) => IGNORE_FILES[filePath] ?? "",
    );
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  it("discovers every measurable file, sorted, and nothing else", () => {
    expect.hasAssertions();
    expect(discover().files).toStrictEqual([
      ".gitignore",
      "redistribute/index.ts",
      "src/app.ts",
      "src/app.unit.test.ts",
      "src/data.json",
      "src/notes.md",
      "src/script.py",
      "src/styles.css",
      "src/utility.js",
    ]);
  });

  it("categorizes TypeScript, JavaScript, Python, and test files", () => {
    expect.hasAssertions();

    const result = discover();

    expect(result.tsFiles).toStrictEqual([
      "redistribute/index.ts",
      "src/app.ts",
      "src/app.unit.test.ts",
    ]);
    expect(result.jsFiles).toStrictEqual(["src/utility.js"]);
    expect(result.testFiles).toStrictEqual(["src/app.unit.test.ts"]);
    expect(result.pyFiles).toStrictEqual(["src/script.py"]);
    expect(result.sourceFiles).toStrictEqual([
      "redistribute/index.ts",
      "src/app.ts",
      "src/app.unit.test.ts",
      "src/utility.js",
    ]);
  });

  it("categorizes the remaining files by extension", () => {
    expect.hasAssertions();

    const result = discover();

    expect(result.cssFiles).toStrictEqual(["src/styles.css"]);
    expect(result.jsonFiles).toStrictEqual(["src/data.json"]);
    expect(result.markdownFiles).toStrictEqual(["src/notes.md"]);
    expect(result.notebookFiles).toStrictEqual([]);
  });

  it("prunes a directory the repository's gitignore file names", () => {
    expect.hasAssertions();

    const { files } = discover();

    expect(files).not.toContain("build/output.js");
    // Pruned rather than enumerated and discarded: the walk never read it.
    expect(readdirSyncMock).not.toHaveBeenCalledWith(
      "/repo/build",
      expect.anything(),
    );
  });

  it("keeps a path that merely contains an excluded name", () => {
    expect.hasAssertions();

    const { files } = discover();

    expect(files).toContain("redistribute/index.ts");
    expect(files).not.toContain("node_modules/library/index.ts");
    expect(readdirSyncMock).not.toHaveBeenCalledWith(
      "/repo/node_modules",
      expect.anything(),
    );
  });

  it("excludes files with a glob that names no directory", () => {
    expect.hasAssertions();

    const { files, jsonFiles } = discover([...DEFAULT_EXCLUDE, "src/*.json"]);

    expect(jsonFiles).toStrictEqual([]);
    expect(files).not.toContain("src/data.json");
  });

  it("excludes what a configured ignore file claims", () => {
    expect.hasAssertions();
    // `/AGENTS.md` is anchored at the root the ignore file was read for.
    expect(discover().files).not.toContain("AGENTS.md");
  });

  it("skips symlinks so a mirrored file is not counted twice", () => {
    expect.hasAssertions();
    // CLAUDE.md is a link to AGENTS.md; following it would report one document
    // as two.
    expect(discover().files).not.toContain("CLAUDE.md");
  });

  it("warns and continues when a configured ignore file is missing", () => {
    expect.hasAssertions();

    const result = service.discoverFiles({
      exclude: DEFAULT_EXCLUDE,
      excludeFrom: [".nope-ignore"],
      workingDirectory: "/repo",
    });

    expect(loggerService.warn).toHaveBeenCalledWith(
      "🙈 Skipped missing ignore file",
      undefined,
      { path: ".nope-ignore" },
    );
    // Nothing was subtracted, so what that ignore file would have claimed is
    // still there.
    expect(result.files).toContain("AGENTS.md");
  });

  it("warns and keeps going when a directory cannot be read", () => {
    expect.hasAssertions();

    const result = service.discoverFiles({
      exclude: DEFAULT_EXCLUDE,
      excludeFrom: [],
      workingDirectory: "/gone",
    });

    // One unreadable directory must not abort the whole measurement, which is
    // what shelling out to git could never fail at.
    expect(loggerService.warn).toHaveBeenCalledWith(
      "📂 Skipped unreadable directory",
      undefined,
      expect.objectContaining({ path: "/gone" }),
    );
    expect(result.files).toStrictEqual([]);
  });
});
