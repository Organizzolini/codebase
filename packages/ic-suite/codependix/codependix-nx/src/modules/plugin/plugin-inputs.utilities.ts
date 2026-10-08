// 🛠️ Utilities

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import {
  CLI_PACKAGE_NAME,
  TOOL_PACKAGE_GLOBS,
  WORKSPACE_PROTOCOL,
} from "./plugin.constants";

import type {
  InferredInput,
  ResolveToolInputsArguments,
  ToolInputsLogger,
  WorkspacePackages,
} from "./plugin.types";

/**
 * Whether a real path sits in the workspace rather than an install: under its
 * root, and under no `node_modules` on the way.
 */
export function isInsideWorkspace(args: {
  directory: string;
  workspaceRoot: string;
}): boolean {
  const relative = path.relative(
    realpathSync(args.workspaceRoot),
    args.directory,
  );

  return !(
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    relative.split(path.sep).includes("node_modules")
  );
}

/** Every dependency a package's manifest declares, in either map. */
export function readDependencies(directory: string): [string, unknown][] {
  const manifest = readManifest(directory);

  return Object.entries({
    ...toRecord(manifest["dependencies"]),
    ...toRecord(manifest["devDependencies"]),
  });
}

/**
 * The cache inputs that tie a gate to the codependix command line it runs.
 *
 * A gate's verdict is decided by `@codependix/cli` and the packages beneath
 * it, none of which a judged project depends on — so without these, a change
 * to the judging logic would replay every cached verdict. Inside this
 * workspace they are `{workspaceRoot}` globs over each package's sources,
 * which is the input form Nx's affected computation follows as well as
 * hashes; an installed command line is pinned by its npm version instead.
 * The compiler options its loader reads are `resolveTsconfigInputs`'s.
 *
 * Nothing here throws: inference runs while Nx builds the project graph,
 * where a throw stops every command in the workspace. What cannot be resolved
 * is left out and named in a warning instead.
 */
export function resolveToolInputs(
  args: ResolveToolInputsArguments,
): InferredInput[] {
  try {
    const cliDirectory = locatePackage({
      fromFile: args.resolveFrom ?? import.meta.url,
      name: CLI_PACKAGE_NAME,
    });

    if (cliDirectory === undefined) {
      warnUnresolved({ logger: args.logger, names: [CLI_PACKAGE_NAME] });

      return [];
    }

    return isInsideWorkspace({
      directory: cliDirectory,
      workspaceRoot: args.workspaceRoot,
    })
      ? resolveWorkspaceInputs({ ...args, cliDirectory })
      : resolveExternalInputs(cliDirectory);
  } catch (error) {
    args.logger.warn(
      `🕸️ Skipped the cache inputs of ${CLI_PACKAGE_NAME}, so a change to it will not invalidate a cached codependix gate: ${String(error)}`,
    );

    return [];
  }
}

/**
 * Collects a workspace package and every workspace package it reaches,
 * development dependencies included: a package this repository bundles at
 * build time, such as its logger, still runs from source here.
 *
 * Each dependency is located on its own, so one that cannot be resolved is
 * reported and skipped rather than costing every other package its inputs.
 */
function collectWorkspacePackages(cliDirectory: string): WorkspacePackages {
  const directories = new Set([cliDirectory]);
  const unresolved = new Set<string>();
  const pending = [cliDirectory];

  for (
    let current = pending.pop();
    current !== undefined;
    current = pending.pop()
  ) {
    const names = readDependencies(current)
      .filter(([, specifier]) =>
        String(specifier).startsWith(WORKSPACE_PROTOCOL),
      )
      .map(([name]) => name);

    for (const name of names) {
      const dependency = locatePackage({
        fromFile: path.join(current, "package.json"),
        name,
      });

      if (dependency === undefined) {
        unresolved.add(name);
      } else if (!directories.has(dependency)) {
        directories.add(dependency);
        pending.push(dependency);
      }
    }
  }

  return { directories, unresolved: [...unresolved].toSorted() };
}

/**
 * Finds the real directory of the package a file would import by name, or
 * nothing when it cannot.
 *
 * Resolves the package's entry and climbs to the manifest that names it,
 * rather than asking for `<name>/package.json` — which only resolves when a
 * package exports its manifest, and nothing obliges one to.
 */
function locatePackage(args: {
  fromFile: string;
  name: string;
}): string | undefined {
  let directory: string;

  try {
    directory = path.dirname(
      realpathSync(createRequire(args.fromFile).resolve(args.name)),
    );
  } catch {
    return undefined;
  }

  for (; ; directory = path.dirname(directory)) {
    if (readManifest(directory)["name"] === args.name) {
      return directory;
    }
    if (path.dirname(directory) === directory) {
      return undefined;
    }
  }
}

/**
 * Reads a package directory's manifest, or an empty one when there is none or
 * it cannot be parsed — which leaves that directory naming no package.
 */
function readManifest(directory: string): Record<string, unknown> {
  const manifestPath = path.join(directory, "package.json");

  try {
    const manifest = existsSync(manifestPath)
      ? (JSON.parse(readFileSync(manifestPath, "utf8")) as unknown)
      : undefined;

    // Narrowed in place rather than through `toRecord`, which would put this
    // one frame past the depth this package is held to.
    return typeof manifest === "object" && manifest !== null
      ? { ...manifest }
      : {};
  } catch {
    return {};
  }
}

/**
 * Pins an installed command line by version: it and the codependix packages
 * it depends on, as npm packages Nx hashes by their locked version. Nx
 * follows an external dependency's own dependencies when it hashes one, so
 * the packages beneath these are covered without being listed.
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
  logger: ToolInputsLogger;
  workspaceRoot: string;
}): InferredInput[] {
  const realWorkspaceRoot = realpathSync(args.workspaceRoot);
  const { directories, unresolved } = collectWorkspacePackages(
    args.cliDirectory,
  );

  if (unresolved.length > 0) {
    warnUnresolved({ logger: args.logger, names: unresolved });
  }

  return [...directories]
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

/** Names the packages whose changes a cached gate will not notice. */
function warnUnresolved(args: {
  logger: ToolInputsLogger;
  names: readonly string[];
}): void {
  args.logger.warn(
    `🕸️ Skipped the cache inputs of ${args.names.join(", ")}, which could not be resolved, so a change to ${args.names.length === 1 ? "it" : "them"} will not invalidate a cached codependix gate.`,
  );
}
