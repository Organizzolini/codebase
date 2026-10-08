import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolveTsconfigInputs } from "./plugin-tsconfig.utilities";

import type { ToolInputsLogger } from "./plugin.types";

/**
 * Where fixture workspaces are written: inside this package's gitignored
 * `tmp/`, so each is a real directory tree that Node's own resolver walks.
 */
const FIXTURE_ROOT = path.resolve(import.meta.dirname, "../../../tmp");

/** This repository's root, whose tsconfig extends `configuration/`'s. */
const WORKSPACE_ROOT = path.resolve(
  import.meta.dirname,
  "../../../../../../..",
);

describe(resolveTsconfigInputs, () => {
  let fixtures: string;

  beforeAll(() => {
    mkdirSync(FIXTURE_ROOT, { recursive: true });
    fixtures = mkdtempSync(path.join(FIXTURE_ROOT, "plugin-tsconfig-"));
  });

  afterAll(() => {
    rmSync(fixtures, { force: true, recursive: true });
  });

  /**
   * Writes a workspace holding the given files, and links each `links` key to
   * its value as pnpm links a package, every path relative to the root; then
   * resolves its inputs.
   */
  function resolveWorkspace(
    files: Record<string, string>,
    links: Record<string, string> = {},
  ): {
    inputs: ReturnType<typeof resolveTsconfigInputs>;
    logger: ToolInputsLogger;
  } {
    const workspaceRoot = mkdtempSync(path.join(fixtures, "workspace-"));

    for (const [file, content] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(workspaceRoot, file)), {
        recursive: true,
      });
      writeFileSync(path.join(workspaceRoot, file), content);
    }
    for (const [linkPath, target] of Object.entries(links)) {
      mkdirSync(path.dirname(path.join(workspaceRoot, linkPath)), {
        recursive: true,
      });
      symlinkSync(
        path.join(workspaceRoot, target),
        path.join(workspaceRoot, linkPath),
        "dir",
      );
    }

    const logger = createMock<ToolInputsLogger>();

    return { inputs: resolveTsconfigInputs({ logger, workspaceRoot }), logger };
  }

  it("names the root tsconfig alone when it extends nothing", () => {
    expect.hasAssertions();

    const { inputs, logger } = resolveWorkspace({
      "tsconfig.json": JSON.stringify({ compilerOptions: {} }),
    });

    expect(inputs).toStrictEqual(["{workspaceRoot}/tsconfig.json"]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("names a workspace file the root tsconfig extends", () => {
    expect.hasAssertions();

    const { inputs, logger } = resolveWorkspace({
      "configuration/tsconfig.json": JSON.stringify({ compilerOptions: {} }),
      "tsconfig.json": JSON.stringify({
        extends: "./configuration/tsconfig.json",
      }),
    });

    expect(inputs).toStrictEqual([
      "{workspaceRoot}/configuration/tsconfig.json",
      "{workspaceRoot}/tsconfig.json",
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("follows the chain through every level, each file once, reading comments, trailing commas, and a path without its extension", () => {
    expect.hasAssertions();

    // TypeScript appends `.json` to a relative `extends` naming no file, and
    // reads tsconfig as JSONC.
    const { inputs, logger } = resolveWorkspace({
      "configuration/base.json": `{
        // Where emitDecoratorMetadata might live.
        "extends": "../shared/strict.json",
        "compilerOptions": { "emitDecoratorMetadata": true, },
      }`,
      "shared/strict.json": JSON.stringify({ extends: "../tsconfig.json" }),
      "tsconfig.json": JSON.stringify({ extends: "./configuration/base" }),
    });

    expect(inputs).toStrictEqual([
      "{workspaceRoot}/configuration/base.json",
      "{workspaceRoot}/shared/strict.json",
      "{workspaceRoot}/tsconfig.json",
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("follows every entry of an array extends", () => {
    expect.hasAssertions();

    const { inputs, logger } = resolveWorkspace({
      "bases/a.json": JSON.stringify({ extends: ["./c.json"] }),
      "bases/b.json": "{}",
      "bases/c.json": "{}",
      "tsconfig.json": JSON.stringify({
        extends: ["./bases/a.json", "./bases/b.json"],
      }),
    });

    expect(inputs).toStrictEqual([
      "{workspaceRoot}/bases/a.json",
      "{workspaceRoot}/bases/b.json",
      "{workspaceRoot}/bases/c.json",
      "{workspaceRoot}/tsconfig.json",
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("keeps naming an extended file that is missing, rather than throwing, and says so", () => {
    expect.hasAssertions();

    // Still an input, so the gate invalidates once the file appears.
    const { inputs, logger } = resolveWorkspace({
      "tsconfig.json": JSON.stringify({ extends: "./absent.json" }),
    });

    expect(inputs).toStrictEqual([
      "{workspaceRoot}/absent.json",
      "{workspaceRoot}/tsconfig.json",
    ]);
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("absent.json"),
    );
  });

  it("keeps naming a file that cannot be parsed, rather than throwing, and says so", () => {
    expect.hasAssertions();

    const { inputs, logger } = resolveWorkspace({
      "broken.json": '{ "extends": "./never-followed.json"',
      "tsconfig.json": JSON.stringify({ extends: "./broken.json" }),
    });

    expect(inputs).toStrictEqual([
      "{workspaceRoot}/broken.json",
      "{workspaceRoot}/tsconfig.json",
    ]);
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("broken.json"),
    );
  });

  it("names the root tsconfig, without a warning, when the workspace has none", () => {
    expect.hasAssertions();

    // The loader falls back to its defaults; creating the file must still
    // invalidate the gate.
    const { inputs, logger } = resolveWorkspace({});

    expect(inputs).toStrictEqual(["{workspaceRoot}/tsconfig.json"]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("names an installed package base the root manifest declares as an external dependency, not as a file", () => {
    expect.hasAssertions();

    // Its version is what changes, and Nx can only hash a package it finds
    // in the lockfile, which a root dependency always is.
    const { inputs, logger } = resolveWorkspace({
      "node_modules/@fixture/base/package.json": JSON.stringify({
        name: "@fixture/base",
      }),
      "node_modules/@fixture/base/tsconfig.json": JSON.stringify({
        extends: "./never-followed.json",
      }),
      "node_modules/@fixture/strictest/tsconfig.json": "{}",
      "node_modules/fixture-unscoped/tsconfig.json": "{}",
      "package.json": JSON.stringify({
        devDependencies: {
          "@fixture/base": "1.0.0",
          "@fixture/strictest": "2.0.0",
          "fixture-unscoped": "3.0.0",
        },
      }),
      "tsconfig.json": JSON.stringify({
        extends: [
          "@fixture/strictest",
          "@fixture/base/tsconfig.json",
          "fixture-unscoped",
        ],
      }),
    });

    expect(inputs).toStrictEqual([
      "{workspaceRoot}/tsconfig.json",
      {
        externalDependencies: [
          "@fixture/base",
          "@fixture/strictest",
          "fixture-unscoped",
        ],
      },
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("names a package base reached by a relative path into node_modules by its package, as it would one named by package", () => {
    expect.hasAssertions();

    const { inputs, logger } = resolveWorkspace({
      "node_modules/@fixture/base/tsconfig.json": "{}",
      "package.json": JSON.stringify({
        devDependencies: { "@fixture/base": "1.0.0" },
      }),
      "tsconfig.json": JSON.stringify({
        extends: "./node_modules/@fixture/base/tsconfig.json",
      }),
    });

    expect(inputs).toStrictEqual([
      "{workspaceRoot}/tsconfig.json",
      { externalDependencies: ["@fixture/base"] },
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("skips a package base the root manifest does not declare, rather than naming a dependency Nx cannot find, and says so", () => {
    expect.hasAssertions();

    // Nx fails every task whose `externalDependencies` names a package
    // missing from its graph.
    const { inputs, logger } = resolveWorkspace({
      "node_modules/@fixture/undeclared/tsconfig.json": "{}",
      "tsconfig.json": JSON.stringify({
        extends: "@fixture/undeclared/tsconfig.json",
      }),
    });

    expect(inputs).toStrictEqual(["{workspaceRoot}/tsconfig.json"]);
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("@fixture/undeclared"),
    );
  });

  it("follows a package base that resolves into the workspace as files", () => {
    expect.hasAssertions();

    // A package of the same workspace is linked, not installed: its files
    // are what change, and Nx refuses it as an external dependency.
    const { inputs, logger } = resolveWorkspace(
      {
        "package.json": JSON.stringify({
          devDependencies: { "@fixture/workspace-tsconfig": "workspace:*" },
        }),
        "packages/tsconfig/base.json": JSON.stringify({
          extends: "./strict.json",
        }),
        "packages/tsconfig/package.json": JSON.stringify({
          name: "@fixture/workspace-tsconfig",
        }),
        "packages/tsconfig/strict.json": "{}",
        "tsconfig.json": JSON.stringify({
          extends: "@fixture/workspace-tsconfig/base.json",
        }),
      },
      { "node_modules/@fixture/workspace-tsconfig": "packages/tsconfig" },
    );

    expect(inputs).toStrictEqual([
      "{workspaceRoot}/packages/tsconfig/base.json",
      "{workspaceRoot}/packages/tsconfig/strict.json",
      "{workspaceRoot}/tsconfig.json",
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("skips a package base that resolves nowhere, even one the root manifest declares, and says so", () => {
    expect.hasAssertions();

    // Nothing installed it, so nothing says Nx's graph holds it — and a
    // declared package of the same workspace is a project, which Nx refuses
    // as an external dependency.
    const { inputs, logger } = resolveWorkspace(
      {
        "package.json": JSON.stringify({
          devDependencies: { "@fixture/workspace-tsconfig": "workspace:*" },
        }),
        "packages/tsconfig/package.json": JSON.stringify({
          name: "@fixture/workspace-tsconfig",
        }),
        "tsconfig.json": JSON.stringify({
          extends: "@fixture/workspace-tsconfig/absent.json",
        }),
      },
      { "node_modules/@fixture/workspace-tsconfig": "packages/tsconfig" },
    );

    expect(inputs).toStrictEqual(["{workspaceRoot}/tsconfig.json"]);
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("@fixture/workspace-tsconfig/absent.json"),
    );
  });

  it("skips a file outside the workspace, which no workspace input can name, and says so", () => {
    expect.hasAssertions();

    const { inputs, logger } = resolveWorkspace({
      "tsconfig.json": JSON.stringify({ extends: "../outside.json" }),
    });

    expect(inputs).toStrictEqual(["{workspaceRoot}/tsconfig.json"]);
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("../outside.json"),
    );
  });

  it("ignores an extends entry that is not a string", () => {
    expect.hasAssertions();

    const { inputs } = resolveWorkspace({
      "base.json": "{}",
      "tsconfig.json": JSON.stringify({ extends: [42, "./base.json", null] }),
    });

    expect(inputs).toStrictEqual([
      "{workspaceRoot}/base.json",
      "{workspaceRoot}/tsconfig.json",
    ]);
  });

  it("names the root tsconfig alone rather than throwing when the workspace root cannot be read, and says so", () => {
    expect.hasAssertions();

    const logger = createMock<ToolInputsLogger>();

    expect(
      resolveTsconfigInputs({
        logger,
        workspaceRoot: path.join(fixtures, "absent"),
      }),
    ).toStrictEqual(["{workspaceRoot}/tsconfig.json"]);
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("tsconfig.json"),
    );
  });

  it("follows this workspace's own root tsconfig into the base every project shares", () => {
    expect.hasAssertions();

    expect(
      resolveTsconfigInputs({
        logger: createMock<ToolInputsLogger>(),
        workspaceRoot: WORKSPACE_ROOT,
      }),
    ).toStrictEqual([
      "{workspaceRoot}/configuration/tsconfig.json",
      "{workspaceRoot}/tsconfig.json",
    ]);
  });
});
