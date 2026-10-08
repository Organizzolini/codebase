// 🛠️ Utilities

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { NX_CONFIGURATION_FILENAME } from "../options/options.constants";
import {
  resolveGeneratorService,
  resolveOptionsService,
  resolveProjectsService,
} from "../plugin/plugin-context.utilities";

import {
  DEFAULT_OUTPUT_PATH,
  DEFAULT_PACKAGE_NAME,
} from "./generator.constants";

import type { EmittedFile } from "./generator.types";

/**
 * Emits the generator plugin and puts it where Nx will find it.
 *
 * Run from a `postinstall`, which is what makes the emitted plugin a build
 * artifact rather than a committed one. `GeneratorService.emitPlugin` is called
 * directly rather than through `nx sync`, which builds the whole project graph
 * before it emits anything — too slow to pay for on every install, and it would
 * fail the install itself whenever any project in the workspace momentarily
 * fails to load.
 */
export async function bootstrapPlugin(
  workspaceRoot: string,
): Promise<EmittedFile[]> {
  const generatorService = await resolveGeneratorService();
  const optionsService = await resolveOptionsService();
  const projectsService = await resolveProjectsService();
  const files = await generatorService.emitPlugin({
    // Taken from the workspace's own plugin registration rather than assumed:
    // this runs from a `postinstall`, where Nx passes nothing.
    configurationPath: optionsService.resolveConfigurationPath({
      exists: (candidatePath) => {
        return existsSync(path.resolve(workspaceRoot, candidatePath));
      },
      nxConfiguration: readNxConfiguration(workspaceRoot),
    }),
    outputPath: DEFAULT_OUTPUT_PATH,
    packageName: DEFAULT_PACKAGE_NAME,
    projects: projectsService.listWorkspaceProjects(workspaceRoot),
  });

  writePlugin({ files, workspaceRoot });
  linkPlugin(workspaceRoot);

  return files;
}

/**
 * Bootstraps the plugin, warning rather than failing the install.
 *
 * A `postinstall` that exits non-zero fails `pnpm install` itself, which would
 * leave an unrelated dependency change uninstallable for as long as the
 * conformetry configuration is mid-edit. Nothing is lost by warning: every
 * conformetry command re-checks the emitted plugin against the configuration
 * and refuses to run against a stale one.
 */
export async function runBootstrapCli(workspaceRoot: string): Promise<void> {
  try {
    const files = await bootstrapPlugin(workspaceRoot);

    // No Nest container exists during `postinstall`, so this cannot go
    // through `LoggerService`. The message still follows its convention —
    // emoji, then a verb — so bootstrap output reads like everything else.
    console.info(
      `👔 Emitted the conformetry generator plugin to ${DEFAULT_OUTPUT_PATH}`,
      { count: files.length },
    );
  } catch (error) {
    console.warn("👔 Skipped emitting the conformetry generator plugin");
    console.warn(error instanceof Error ? error.message : error);
  }
}

/**
 * Whether a path resolves to the emitted plugin, and so is ours to replace.
 *
 * A link this bootstrap left behind but whose target has since been deleted
 * counts: it resolves to nothing, which no installed package ever does.
 */
function leadsTo(args: { linkPath: string; outputPath: string }): boolean {
  try {
    return realpathSync(args.linkPath) === realpathSync(args.outputPath);
  } catch {
    return !existsSync(args.linkPath);
  }
}

/**
 * Links the emitted plugin into the workspace's root `node_modules`.
 *
 * Nx resolves `nx g <package>:<generator>` by requiring the package by name,
 * and the emitted directory is gitignored, so it is invisible to project
 * discovery — the link is the only thing that makes the generators
 * addressable. The package manager will not create it: pnpm links a workspace
 * package into the root only when the root manifest depends on it, and a
 * `workspace:*` dependency on a package that has not been emitted yet fails
 * `pnpm install` outright on a fresh clone.
 */
function linkPlugin(workspaceRoot: string): void {
  const linkPath = path.resolve(
    workspaceRoot,
    "node_modules",
    DEFAULT_PACKAGE_NAME,
  );
  const outputPath = path.resolve(workspaceRoot, DEFAULT_OUTPUT_PATH);

  mkdirSync(path.dirname(linkPath), { recursive: true });

  // The plugin's name is unscoped, so this path is one an installed dependency
  // could legitimately occupy. Refuse it rather than deleting someone's
  // package: the emitted plugin is replaceable, an installed one is not.
  // Checked by where the path leads rather than by whether it is a link, since
  // pnpm installs packages as symlinks into its store and a link is therefore
  // no evidence that this one is ours.
  if (
    lstatSync(linkPath, { throwIfNoEntry: false }) !== undefined &&
    !leadsTo({ linkPath, outputPath })
  ) {
    throw new Error(
      `node_modules/${DEFAULT_PACKAGE_NAME} is an installed package, not a link to ${DEFAULT_OUTPUT_PATH}. Rename the emitted plugin via the sync generator's packageName option.`,
    );
  }

  // `rmSync` on a symlink removes the link, never what it points at, so a
  // re-run replaces the link rather than writing through into the emitted
  // directory.
  rmSync(linkPath, { force: true, recursive: true });
  symlinkSync(
    path.relative(path.dirname(linkPath), outputPath),
    linkPath,
    "dir",
  );
}

/**
 * Reads the workspace's `nx.json`, or nothing when there is none.
 *
 * A missing or unreadable file is not an error here — every field it would
 * supply has a default, and failing the install over it would be worse than
 * emitting from the conventional path.
 */
function readNxConfiguration(workspaceRoot: string): unknown {
  const nxConfigurationPath = path.resolve(
    workspaceRoot,
    NX_CONFIGURATION_FILENAME,
  );

  if (!existsSync(nxConfigurationPath)) {
    return undefined;
  }

  const parsed: unknown = JSON.parse(readFileSync(nxConfigurationPath, "utf8"));

  return parsed;
}

/**
 * Writes the emitted files, replacing whatever the last emit left behind.
 *
 * `src` is cleared rather than overwritten so that dropping a generator from
 * the configuration drops its schema too — the drift check compares the files
 * that should exist against disk, and would never notice one that should not.
 */
function writePlugin(args: {
  files: EmittedFile[];
  workspaceRoot: string;
}): void {
  rmSync(path.resolve(args.workspaceRoot, DEFAULT_OUTPUT_PATH, "src"), {
    force: true,
    recursive: true,
  });

  for (const file of args.files) {
    const absolutePath = path.resolve(args.workspaceRoot, file.filePath);

    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, file.content, "utf8");
  }
}
