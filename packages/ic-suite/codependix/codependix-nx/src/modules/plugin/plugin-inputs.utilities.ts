// 🛠️ Utilities

import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import {
  CLI_PACKAGE_NAME,
  TOOL_PACKAGE_GLOBS,
  WORKSPACE_PROTOCOL,
} from "./plugin.constants";

import type { InferredInput } from "./plugin.types";

/**
 * The cache inputs that tie a gate to the codependix command line it runs.
 *
 * A gate's verdict is decided by `@codependix/cli` and the packages beneath
 * it, none of which a judged project depends on — so without these, a change
 * to the judging logic would replay every cached verdict. Inside this
 * workspace they are `{workspaceRoot}` globs over each package's sources,
 * which is the input form Nx's affected computation follows as well as
 * hashes; an installed command line is pinned by its npm version instead,
 * listed with the codependix packages it depends on.
 *
 * Anything that fails here yields no inputs rather than an error: inference
 * runs while Nx builds the project graph, where a throw stops every command
 * in the workspace.
 */
export function resolveToolInputs(workspaceRoot: string): InferredInput[] {
  try {
    const cliDirectory = locateCommandLine();

    return toWorkspacePath({ directory: cliDirectory, workspaceRoot }) ===
      undefined
      ? resolveExternalInputs(cliDirectory)
      : resolveWorkspaceInputs({ cliDirectory, workspaceRoot });
  } catch {
    return [];
  }
}

/**
 * Collects a workspace package and every workspace package it depends on,
 * development dependencies included: a package this repository bundles at
 * build time, such as its logger, still runs from source here.
 */
function collectWorkspacePackages(args: {
  packageDirectory: string;
  visited: Set<string>;
}): Set<string> {
  args.visited.add(args.packageDirectory);

  const dependencies = readDependencies(args.packageDirectory)
    .filter(([, specifier]) => String(specifier).startsWith(WORKSPACE_PROTOCOL))
    .map(([name]) =>
      locateDependency({ fromDirectory: args.packageDirectory, name }),
    )
    .filter((dependency) => !args.visited.has(dependency));

  for (const dependency of dependencies) {
    collectWorkspacePackages({
      packageDirectory: dependency,
      visited: args.visited,
    });
  }

  return args.visited;
}

/** The real directory of the `@codependix/cli` this plugin runs. */
function locateCommandLine(): string {
  return path.dirname(
    realpathSync(
      createRequire(import.meta.url).resolve(
        `${CLI_PACKAGE_NAME}/package.json`,
      ),
    ),
  );
}

/**
 * Finds the real directory a package directory's dependency is linked from,
 * through Node's own resolver — which is why every package here exports its
 * `./package.json`. One that does not throws, and the caller falls back.
 */
function locateDependency(args: {
  fromDirectory: string;
  name: string;
}): string {
  return path.dirname(
    realpathSync(
      createRequire(path.join(args.fromDirectory, "package.json")).resolve(
        `${args.name}/package.json`,
      ),
    ),
  );
}

/** Reads the dependency maps of the manifest in a package directory. */
function readDependencies(packageDirectory: string): [string, unknown][] {
  const manifest = toRecord(
    JSON.parse(
      readFileSync(path.join(packageDirectory, "package.json"), "utf8"),
    ) as unknown,
  );

  return [
    ...Object.entries(toRecord(manifest["dependencies"])),
    ...Object.entries(toRecord(manifest["devDependencies"])),
  ];
}

/**
 * Pins an installed command line by version: it and the codependix packages
 * it depends on, as npm packages Nx hashes by their locked version.
 */
function resolveExternalInputs(cliDirectory: string): InferredInput[] {
  const packages = readDependencies(cliDirectory)
    .map(([name]) => name)
    .filter((name) => name.startsWith("@codependix/"));

  return [{ externalDependencies: [CLI_PACKAGE_NAME, ...packages].toSorted() }];
}

/**
 * Globs over the sources and manifest of the command line and of every
 * workspace package it reaches, sorted so the cache key is stable.
 */
function resolveWorkspaceInputs(args: {
  cliDirectory: string;
  workspaceRoot: string;
}): InferredInput[] {
  const realWorkspaceRoot = realpathSync(args.workspaceRoot);
  const packages = collectWorkspacePackages({
    packageDirectory: args.cliDirectory,
    visited: new Set(),
  });

  return [...packages]
    .flatMap((directory) =>
      TOOL_PACKAGE_GLOBS.map(
        (glob) =>
          `{workspaceRoot}/${path.relative(realWorkspaceRoot, directory)}/${glob}`,
      ),
    )
    .toSorted();
}

/** Copies an untrusted value into a record, or an empty one. */
function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? { ...value } : {};
}

/** The workspace-relative path of a directory, or nothing when it is outside. */
function toWorkspacePath(args: {
  directory: string;
  workspaceRoot: string;
}): string | undefined {
  const relative = path.relative(
    realpathSync(args.workspaceRoot),
    args.directory,
  );
  const isOutside =
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    relative.split(path.sep).includes("node_modules");

  return isOutside ? undefined : relative;
}
