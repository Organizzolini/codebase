// 🛠️ Utilities

import {
  DEFAULT_OUTPUT_PATH,
  DEFAULT_PACKAGE_NAME,
  OUT_OF_SYNC_MESSAGE,
} from "../../modules/generator/generator.constants";
import { NX_CONFIGURATION_FILENAME } from "../../modules/options/options.constants";
import {
  resolveGeneratorService,
  resolveOptionsService,
  resolveProjectsService,
} from "../../modules/plugin/plugin-context.utilities";

import type { SyncGeneratorOptions } from "./generator.types";
import type { Tree } from "@nx/devkit";

/**
 * Regenerates the workspace's conformetry generator plugin.
 *
 * Registered as a global sync generator, so `nx sync:check` fails whenever the
 * configuration declares a generator the emitted plugin does not, and `nx sync`
 * fixes it. Writing through the tree rather than to disk is what makes the
 * check possible: Nx compares the tree against the working copy.
 */
export default async function syncGenerator(
  tree: Tree,
  options?: SyncGeneratorOptions,
): Promise<{ outOfSyncMessage: string }> {
  const generatorService = await resolveGeneratorService();
  const optionsService = await resolveOptionsService();
  const projectsService = await resolveProjectsService();
  const files = await generatorService.emitPlugin({
    // Nx registers this as a global sync generator, which receives no plugin
    // options, so the workspace's own registration is read for the path.
    configurationPath:
      options?.configurationPath ??
      optionsService.resolveConfigurationPath({
        exists: (candidatePath) => tree.exists(candidatePath),
        nxConfiguration: readNxConfiguration(tree),
      }),
    outputPath: options?.outputPath ?? DEFAULT_OUTPUT_PATH,
    packageName: options?.packageName ?? DEFAULT_PACKAGE_NAME,
    projects: projectsService.listWorkspaceProjects(tree.root),
  });

  for (const file of files) {
    tree.write(file.filePath, file.content);
  }

  return { outOfSyncMessage: OUT_OF_SYNC_MESSAGE };
}

/**
 * Reads the workspace's `nx.json` through the tree, or nothing when absent.
 *
 * Through the tree rather than from disk so that a workspace mid-edit is read
 * the same way every other file in this generator is.
 */
function readNxConfiguration(tree: Tree): unknown {
  const contents = tree.read(NX_CONFIGURATION_FILENAME, "utf8");

  if (contents === null) {
    return undefined;
  }

  const parsed: unknown = JSON.parse(contents);

  return parsed;
}
