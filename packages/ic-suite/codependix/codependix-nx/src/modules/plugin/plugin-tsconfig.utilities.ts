// 🛠️ Utilities

import { existsSync, realpathSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { readJsonFile } from "@nx/devkit";

import { isInsideWorkspace, readDependencies } from "./plugin-inputs.utilities";
import {
  LOCAL_DEPENDENCY_PROTOCOLS,
  PACKAGE_TSCONFIG_FILENAME,
  SKIPPED_BASE_REASONS,
  WORKSPACE_TSCONFIG_INPUT,
} from "./plugin.constants";

import type {
  ExtendedBase,
  ExtendsChain,
  InferredInput,
  ResolveTsconfigInputsArguments,
  ToolInputsLogger,
} from "./plugin.types";

/**
 * The cache inputs that tie a gate to the compiler options its loader reads.
 *
 * The loader takes them from the workspace root's `tsconfig.json`, and
 * through it from every base that file `extends` — directly, through an
 * array, or through a base's own `extends` — so an edit to any of them can
 * change how a gate compiles what it judges. A base in the workspace is
 * named as a `{workspaceRoot}` file, which Nx's affected computation follows
 * as well as hashes. A base an installed package provides is named in
 * `externalDependencies` instead, since its version is what changes — but
 * only when the root `package.json` declares the package, because Nx fails
 * every task naming an external dependency missing from its graph.
 *
 * Nothing here throws: inference runs while Nx builds the project graph,
 * where a throw stops every command in the workspace. A base that cannot be
 * read, or cannot be named, is skipped and named in a warning instead.
 */
export function resolveTsconfigInputs(
  args: ResolveTsconfigInputsArguments,
): InferredInput[] {
  try {
    const workspaceRoot = realpathSync(args.workspaceRoot);
    const { files, packages } = followExtendsChain({
      logger: args.logger,
      workspaceRoot,
    });
    const fileInputs = [...files]
      .map(
        (file) =>
          `{workspaceRoot}/${path.relative(workspaceRoot, file).split(path.sep).join("/")}`,
      )
      .toSorted();

    return packages.size === 0
      ? fileInputs
      : [...fileInputs, { externalDependencies: [...packages].toSorted() }];
  } catch (error) {
    args.logger.warn(
      `🕸️ Skipped following the bases the root tsconfig.json extends, so a change to one will not invalidate a cached codependix gate: ${String(error)}`,
    );

    return [WORKSPACE_TSCONFIG_INPUT];
  }
}

/** Why a base no input can cover was skipped, as a warning phrases it. */
function describeSkippedBase(
  base: Exclude<ExtendedBase, { kind: "file" | "package" }>,
): string {
  return base.kind === "undeclared"
    ? `the root package.json does not declare ${base.name} from a registry`
    : SKIPPED_BASE_REASONS[base.kind];
}

/**
 * Walks the root tsconfig's `extends` chain, each workspace file once, so a
 * chain that loops still ends.
 *
 * The root's own file is named whether or not it exists: the loader falls
 * back to its defaults without one, and creating it must still invalidate
 * the gate. So is an extended file that is missing or cannot be parsed —
 * a fix to it must invalidate the gate too — though what it would extend in
 * turn cannot be followed.
 */
function followExtendsChain(args: {
  logger: ToolInputsLogger;
  workspaceRoot: string;
}): ExtendsChain {
  const rootFile = path.join(args.workspaceRoot, "tsconfig.json");
  const declared = readRegistryDependencies(args.workspaceRoot);
  const files = new Set([rootFile]);
  const packages = new Set<string>();
  const pending = existsSync(rootFile) ? [rootFile] : [];

  for (
    let current = pending.pop();
    current !== undefined;
    current = pending.pop()
  ) {
    for (const specifier of readExtends({ ...args, file: current })) {
      const base = resolveExtendedBase({
        ...args,
        declared,
        file: current,
        specifier,
      });

      if (base.kind === "file") {
        if (!files.has(base.file)) {
          files.add(base.file);
          pending.push(base.file);
        }
      } else if (base.kind === "package") {
        packages.add(base.name);
      } else {
        warnSkipped({ ...args, base, file: current, specifier });
      }
    }
  }

  return { files, packages };
}

/**
 * Every string a tsconfig's `extends` names, read as TypeScript reads it:
 * JSON with comments and trailing commas, and a string or an array of them.
 * Nothing, with a warning, when the file is missing or cannot be parsed.
 */
function readExtends(args: {
  file: string;
  logger: ToolInputsLogger;
  workspaceRoot: string;
}): string[] {
  try {
    const config = readJsonFile<Record<string, unknown>>(args.file, {
      expectComments: true,
    });

    return [config["extends"]]
      .flat()
      .filter((specifier) => typeof specifier === "string");
  } catch (error) {
    args.logger.warn(
      `🕸️ Skipped the bases ${path.relative(args.workspaceRoot, args.file)} extends, which could not be read, so a change to one will not invalidate a cached codependix gate: ${String(error)}`,
    );

    return [];
  }
}

/**
 * The installed package a real path outside the workspace belongs to — the
 * one under its last `node_modules`, which under pnpm's store is the package
 * itself rather than the store — or nothing for a path under none.
 */
function readInstalledPackageName(file: string): string | undefined {
  const segments = file.split(path.sep);
  const start = segments.lastIndexOf("node_modules") + 1;
  const scope = segments[start];

  if (start === 0 || scope === undefined) {
    return undefined;
  }

  return segments
    .slice(start, scope.startsWith("@") ? start + 2 : start + 1)
    .join("/");
}

/**
 * The packages the root manifest declares from a registry, which Nx's
 * lockfile parsing puts in its graph. One it declares through `workspace:`,
 * `file:`, `link:`, or `portal:` is local, and may be no external node at
 * all — naming it would fail every gate.
 */
function readRegistryDependencies(workspaceRoot: string): Set<string> {
  return new Set(
    readDependencies(workspaceRoot)
      .filter(
        ([, specifier]) =>
          !LOCAL_DEPENDENCY_PROTOCOLS.some((protocol) =>
            String(specifier).startsWith(protocol),
          ),
      )
      .map(([name]) => name),
  );
}

/**
 * Resolves one `extends` entry to the base it names, as TypeScript does, and
 * sorts it by where that base lives.
 *
 * A base in the workspace is a file — a package of the same workspace
 * included, since its files are what change. One under `node_modules` is an
 * installed package, named by its version, whether the entry named the
 * package or a path into it — when the root manifest declares it, which puts
 * it in Nx's graph. One that resolves nowhere is neither: nothing shows that
 * Nx's graph holds it, and TypeScript itself would fail to read it.
 */
function resolveExtendedBase(args: {
  declared: ReadonlySet<string>;
  file: string;
  specifier: string;
  workspaceRoot: string;
}): ExtendedBase {
  // TypeScript reads either separator, on every platform.
  const specifier = args.specifier.replaceAll("\\", "/");
  const file =
    path.isAbsolute(specifier) ||
    specifier.startsWith("./") ||
    specifier.startsWith("../")
      ? resolvePathBase({ file: args.file, specifier })
      : resolvePackageBase({ file: args.file, specifier });

  if (file === undefined) {
    return { kind: "unresolved" };
  }
  if (
    isInsideWorkspace({ directory: file, workspaceRoot: args.workspaceRoot })
  ) {
    return { file, kind: "file" };
  }

  const name = readInstalledPackageName(file);

  if (name === undefined) {
    return { kind: "outside" };
  }

  return args.declared.has(name)
    ? { kind: "package", name }
    : { kind: "undeclared", name };
}

/**
 * Resolves an entry naming a package, from the extending file, as Node
 * resolves a module: the path inside the package it names, with `.json`
 * appended when that names no file. One naming no path inside the package
 * is its own `tsconfig.json`, or whatever its `exports` map the package to —
 * TypeScript tries the latter first, and a package exporting only that
 * refuses the former. Only a JSON file counts, since only one can be a base.
 */
function resolvePackageBase(args: {
  file: string;
  specifier: string;
}): string | undefined {
  const { specifier } = args;
  const candidates =
    specifier.split("/").length > (specifier.startsWith("@") ? 2 : 1)
      ? [specifier, `${specifier}.json`]
      : [`${specifier}/${PACKAGE_TSCONFIG_FILENAME}`, specifier];
  const resolver = createRequire(args.file);

  // Every candidate is tried, at most two, so none needs a sentinel.
  const [file] = candidates.flatMap((candidate) => {
    try {
      const resolved = realpathSync(resolver.resolve(candidate));

      return resolved.endsWith(".json") ? [resolved] : [];
    } catch {
      return [];
    }
  });

  return file;
}

/**
 * Resolves an entry naming a path, from the extending file's directory, with
 * `.json` appended when it names no file — a directory of that name is no
 * file, so `./configuration` beside a `configuration/` folder still means
 * `configuration.json`. A missing file is still named, at the path it would
 * have, so the edit that creates it invalidates the gate.
 */
function resolvePathBase(args: { file: string; specifier: string }): string {
  const named = path.resolve(path.dirname(args.file), args.specifier);
  const target =
    statSync(named, { throwIfNoEntry: false })?.isFile() === true ||
    named.endsWith(".json")
      ? named
      : `${named}.json`;

  return existsSync(target) ? realpathSync(target) : target;
}

/** Names a base no input can cover, so a cached gate will not notice it. */
function warnSkipped(args: {
  base: Exclude<ExtendedBase, { kind: "file" | "package" }>;
  file: string;
  logger: ToolInputsLogger;
  specifier: string;
  workspaceRoot: string;
}): void {
  args.logger.warn(
    `🕸️ Skipped the cache input of ${args.specifier}, which ${path.relative(args.workspaceRoot, args.file)} extends, because ${describeSkippedBase(args.base)}, so a change to it will not invalidate a cached codependix gate.`,
  );
}
