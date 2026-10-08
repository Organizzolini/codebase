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

import { resolveToolInputs } from "./plugin-inputs.utilities";

import type { ToolInputsLogger } from "./plugin.types";

/**
 * Where fixture closures are written: inside this package's gitignored
 * `tmp/`, so every one of them is a real directory tree with real links that
 * Node's own resolver walks — and none of them is this repository's closure,
 * which grows whenever the command line gains a dependency.
 */
const FIXTURE_ROOT = path.resolve(import.meta.dirname, "../../../tmp");

/** This repository's root, which holds `@codependix/cli` as a workspace package. */
const WORKSPACE_ROOT = path.resolve(
  import.meta.dirname,
  "../../../../../../..",
);

/** Whether any input glob names a workspace-relative file. */
function isInput(inputs: readonly unknown[], file: string): boolean {
  return inputs.some(
    (input) =>
      typeof input === "string" &&
      path.matchesGlob(file, input.replace("{workspaceRoot}/", "")),
  );
}

/** Links a package into another directory's `node_modules`, as pnpm does. */
function link(args: { from: string; name: string; to: string }): void {
  const linkPath = path.join(args.from, "node_modules", args.name);

  mkdirSync(path.dirname(linkPath), { recursive: true });
  symlinkSync(args.to, linkPath, "dir");
}

/**
 * Writes a consumer that installed the command line from a registry: a real
 * directory inside `node_modules`, not a link into the workspace.
 */
function writeConsumer(root: string): void {
  writePackage({
    directory: path.join(root, "node_modules/@codependix/cli"),
    manifest: {
      dependencies: {
        "@codependix/boundaries": "0.0.6",
        "@codependix/core": "0.0.6",
        zod: "^4.0.0",
      },
      main: "./src/index.js",
      name: "@codependix/cli",
    },
  });
}

/** Writes a package's manifest and an entry file under `src/`. */
function writePackage(args: {
  directory: string;
  manifest: Record<string, unknown>;
}): void {
  mkdirSync(path.join(args.directory, "src"), { recursive: true });
  writeFileSync(
    path.join(args.directory, "package.json"),
    JSON.stringify(args.manifest),
  );
  writeFileSync(path.join(args.directory, "src/index.js"), "export {};\n");
}

/**
 * Writes a workspace whose command line reaches `@codependix/core` and
 * `@codebase/logging`, development dependencies included, and declares two
 * it cannot: one never linked, and one linked to a package that names itself
 * something else, beneath a stray manifest that cannot be parsed.
 *
 * Neither linked package exports its `./package.json`, and both keep their
 * entry under `src/`, so a resolver that asks for the manifest by name, or
 * assumes the entry sits beside it, fails here.
 */
function writeWorkspace(root: string): void {
  const packages = path.join(root, "packages");
  const exportsEntry = { exports: { ".": { default: "./src/index.js" } } };

  writePackage({
    directory: path.join(packages, "cli"),
    manifest: {
      dependencies: {
        "@codependix/core": "workspace:*",
        "@codependix/misnamed": "workspace:*",
        "@codependix/missing": "workspace:*",
        zod: "^4.0.0",
      },
      devDependencies: { "@codebase/logging": "workspace:*" },
      main: "./src/index.js",
      name: "@codependix/cli",
    },
  });
  writePackage({
    directory: path.join(packages, "core"),
    manifest: {
      ...exportsEntry,
      dependencies: { "@codebase/logging": "workspace:*" },
      name: "@codependix/core",
    },
  });
  writePackage({
    directory: path.join(packages, "logging"),
    manifest: { ...exportsEntry, name: "@codebase/logging" },
  });

  writePackage({
    directory: path.join(packages, "misnamed"),
    manifest: { ...exportsEntry, name: "@codependix/renamed" },
  });
  writeFileSync(path.join(packages, "misnamed/src/package.json"), "{");

  link({ from: root, name: "@codependix/cli", to: path.join(packages, "cli") });
  for (const [from, name, to] of [
    ["cli", "@codependix/core", "core"],
    ["cli", "@codebase/logging", "logging"],
    ["core", "@codebase/logging", "logging"],
    ["cli", "@codependix/misnamed", "misnamed"],
  ] as const) {
    link({
      from: path.join(packages, from),
      name,
      to: path.join(packages, to),
    });
  }
}

describe(resolveToolInputs, () => {
  let fixtures: string;
  let workspaceRoot: string;
  let consumerRoot: string;
  let brokenRoot: string;

  beforeAll(() => {
    mkdirSync(FIXTURE_ROOT, { recursive: true });
    fixtures = mkdtempSync(path.join(FIXTURE_ROOT, "plugin-inputs-"));
    workspaceRoot = path.join(fixtures, "workspace");
    consumerRoot = path.join(fixtures, "consumer");
    brokenRoot = path.join(fixtures, "broken");
    writeWorkspace(workspaceRoot);
    writeConsumer(consumerRoot);
    // Installed, but with an entry that is not there. A fixture with no
    // command line at all cannot be written inside this repository: Node
    // would climb out of it and find the repository's own.
    mkdirSync(path.join(brokenRoot, "node_modules/@codependix/cli"), {
      recursive: true,
    });
    writeFileSync(
      path.join(brokenRoot, "node_modules/@codependix/cli/package.json"),
      JSON.stringify({ main: "./absent.js", name: "@codependix/cli" }),
    );
  });

  afterAll(() => {
    rmSync(fixtures, { force: true, recursive: true });
  });

  /** Resolves the inputs as a plugin installed at `root` would. */
  function resolveFrom(root: string): {
    inputs: ReturnType<typeof resolveToolInputs>;
    logger: ToolInputsLogger;
  } {
    const logger = createMock<ToolInputsLogger>();
    const inputs = resolveToolInputs({
      logger,
      resolveFrom: path.join(root, "index.js"),
      workspaceRoot: root,
    });

    return { inputs, logger };
  }

  it("names the command line and every workspace package it reaches, each once, in a stable order", () => {
    expect.hasAssertions();

    // `{workspaceRoot}` file globs rather than `{ input, projects }`: Nx's
    // affected computation follows the former and ignores the latter.
    expect(resolveFrom(workspaceRoot).inputs).toStrictEqual(
      ["cli", "core", "logging"].flatMap((name) => [
        `{workspaceRoot}/packages/${name}/package.json`,
        `{workspaceRoot}/packages/${name}/src/**/!(*.test.*|*.spec.*)`,
      ]),
    );
  });

  it("warns naming each package it could not resolve, and keeps the inputs of every package that did", () => {
    expect.hasAssertions();

    const { inputs, logger } = resolveFrom(workspaceRoot);

    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("@codependix/misnamed, @codependix/missing"),
    );
    expect(isInput(inputs, "packages/cli/src/main.ts")).toBe(true);
    expect(isInput(inputs, "packages/logging/src/index.ts")).toBe(true);
  });

  it("leaves test files out, and leaves every tsconfig to resolveTsconfigInputs", () => {
    expect.hasAssertions();

    const { inputs } = resolveFrom(workspaceRoot);

    // Matched as Nx's affected computation matches them — one positive glob
    // each, since it ignores negated inputs outright.
    expect(isInput(inputs, "packages/core/src/a/a.service.ts")).toBe(true);
    expect(isInput(inputs, "tsconfig.json")).toBe(false);
    expect(isInput(inputs, "packages/core/tsconfig.json")).toBe(false);
    expect(isInput(inputs, "packages/core/src/a/a.service.unit.test.ts")).toBe(
      false,
    );
    expect(isInput(inputs, "packages/core/src/a/a.service.spec.ts")).toBe(
      false,
    );
    expect(isInput(inputs, "packages/core/testing/mocks.ts")).toBe(false);
  });

  it("names the installed command line and its codependix packages outside the workspace", () => {
    expect.hasAssertions();

    // A workspace that does not contain `@codependix/cli` installed it from
    // a registry, so its version — not its files — is what changes.
    const { inputs, logger } = resolveFrom(consumerRoot);

    expect(inputs).toStrictEqual([
      {
        externalDependencies: [
          "@codependix/boundaries",
          "@codependix/cli",
          "@codependix/core",
        ],
      },
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("names nothing rather than throwing when the command line cannot be found, and says so", () => {
    expect.hasAssertions();

    const { inputs, logger } = resolveFrom(brokenRoot);

    // Inference runs while Nx builds the project graph, where a throw stops
    // every command in the workspace.
    expect(inputs).toStrictEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("@codependix/cli"),
    );
  });

  it("names nothing rather than throwing when the workspace root cannot be read, and says so", () => {
    expect.hasAssertions();

    const logger = createMock<ToolInputsLogger>();

    expect(
      resolveToolInputs({
        logger,
        resolveFrom: path.join(workspaceRoot, "index.js"),
        workspaceRoot: path.join(fixtures, "absent"),
      }),
    ).toStrictEqual([]);
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("@codependix/cli"),
    );
  });

  it("resolves the command line this plugin itself depends on by default", () => {
    expect.hasAssertions();

    expect(
      resolveToolInputs({
        logger: createMock<ToolInputsLogger>(),
        workspaceRoot: WORKSPACE_ROOT,
      }),
    ).toContain(
      "{workspaceRoot}/packages/ic-suite/codependix/codependix-cli/package.json",
    );
  });
});
