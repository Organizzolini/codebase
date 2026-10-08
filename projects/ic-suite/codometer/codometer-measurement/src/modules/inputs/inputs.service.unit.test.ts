import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { InputOutsideRepositoryError } from "./inputs.constants";
import { InputsService } from "./inputs.service";

import type { ResolvedCodometerInput } from "@codometer/configuration";
import type { Dirent } from "node:fs";

// The walk is mocked down to the one filesystem call it makes for an ordinary
// tree, which is what lets these assertions read which directories it entered.
// Real trees, links, and unreadable directories are walked in
// `inputs.service.integration.test.ts`.
const { existsSyncMock, readdirSyncMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn<(candidatePath: string) => boolean>(),
  readdirSyncMock: vi.fn<(directory: string) => Dirent[]>(),
}));

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  existsSync: existsSyncMock,
  readdirSync: readdirSyncMock,
}));

/** An in-memory tree, keyed by absolute directory path. */
const TREE: Readonly<Record<string, readonly (readonly [string, boolean])[]>> =
  {
    "/repo": [
      [".hidden", false],
      ["dist", false],
      ["node_modules", false],
      ["readme.md", true],
    ],
    "/repo/.hidden": [["secret.js", true]],
    "/repo/dist": [
      ["bundle.js", true],
      ["bundle.min.js", true],
      ["nested", false],
      ["styles.css", true],
    ],
    "/repo/dist/nested": [["deep.js", true]],
    "/repo/node_modules": [["library", false]],
    "/repo/node_modules/library": [["index.js", true]],
  };

/** Builds a resolved input over the mocked tree's build directory. */
function buildInput(
  overrides: Partial<ResolvedCodometerInput> = {},
): ResolvedCodometerInput {
  return {
    analyses: ["size"],
    compression: "gzip",
    directory: ".",
    exclude: [],
    include: ["dist/**/*.js"],
    name: "compiled",
    ...overrides,
  };
}

/** Builds the directory entry the mocked `readdirSync` hands back. */
function createEntry(name: string, isFile: boolean): Dirent {
  return createMock<Dirent>({
    isDirectory: () => !isFile,
    isFile: () => isFile,
    isSymbolicLink: () => false,
    name,
  });
}

describe(InputsService, () => {
  let service: InputsService;

  /** Lists the files the given input holds in the mocked tree. */
  function matchFiles(
    overrides: Partial<ResolvedCodometerInput> = {},
  ): string[] {
    return service.matchFiles({
      input: buildInput(overrides),
      workingDirectory: "/repo",
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InputsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(InputsService);
  });

  beforeEach(() => {
    existsSyncMock.mockReset();
    // The mocked tree is a repository rooted at `/repo`, which is how far out
    // of the measured folder an input is allowed to reach.
    existsSyncMock.mockImplementation(
      (candidatePath: string) => candidatePath === "/repo/.git",
    );
    readdirSyncMock.mockReset();
    readdirSyncMock.mockImplementation((directory: string) =>
      (TREE[directory] ?? []).map(([name, isFile]) =>
        createEntry(name, isFile),
      ),
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("holds every file its globs claim, sorted", () => {
    expect(matchFiles()).toStrictEqual([
      "dist/bundle.js",
      "dist/bundle.min.js",
      "dist/nested/deep.js",
    ]);
  });

  it("starts where the input says, and reports what it found from the measured directory", () => {
    // A project measured in its own folder while its build output is written
    // to a tree above it. Where that tree sits is the configuration's to say:
    // the input names the way out, and nothing here knows the convention.
    const matched = service.matchFiles({
      input: buildInput({ directory: "../.." }),
      workingDirectory: "/repo/packages/project",
    });

    expect(matched).toStrictEqual([
      "../../dist/bundle.js",
      "../../dist/bundle.min.js",
      "../../dist/nested/deep.js",
    ]);
    expect(readdirSyncMock).toHaveBeenCalledWith("/repo/dist", {
      withFileTypes: true,
    });
  });

  it("refuses an input whose directory lands outside the repository", () => {
    expect(() =>
      service.matchFiles({
        input: buildInput({ directory: "../../.." }),
        workingDirectory: "/repo/packages/project",
      }),
    ).toThrow(InputOutsideRepositoryError);
  });

  it("leaves out a file no include glob claims", () => {
    expect(matchFiles()).not.toContain("dist/styles.css");
  });

  it("leaves out what an exclude glob claims", () => {
    expect(matchFiles({ exclude: ["dist/**/*.min.js"] })).toStrictEqual([
      "dist/bundle.js",
      "dist/nested/deep.js",
    ]);
  });

  it("never reads a directory no glob could match inside", () => {
    matchFiles();

    // The whole reason a glob's literal prefix is worked out at all: an input
    // over one build directory must not enumerate every dependency to find it.
    expect(readdirSyncMock).toHaveBeenCalledWith("/repo/dist", {
      withFileTypes: true,
    });
    expect(readdirSyncMock).not.toHaveBeenCalledWith("/repo/node_modules", {
      withFileTypes: true,
    });
  });

  it("never reads a hidden directory a glob did not spell out", () => {
    matchFiles({ include: ["**/*.js"] });

    expect(readdirSyncMock).not.toHaveBeenCalledWith("/repo/.hidden", {
      withFileTypes: true,
    });
  });

  it("reads a hidden directory a glob does spell out", () => {
    expect(matchFiles({ include: [".hidden/**/*.js"] })).toStrictEqual([
      ".hidden/secret.js",
    ]);
  });

  it("holds files from every include glob at once", () => {
    expect(
      matchFiles({ include: ["dist/*.css", "dist/nested/*.js"] }),
    ).toStrictEqual(["dist/nested/deep.js", "dist/styles.css"]);
  });
});
