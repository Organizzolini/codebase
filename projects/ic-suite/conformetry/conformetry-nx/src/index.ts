// 📤 Exports
import path from "node:path";

import { resolvePluginService } from "./modules/plugin/plugin-context.utilities";
import { PROJECT_CONFIGURATION_GLOB } from "./modules/plugin/plugin.constants";

import type {
  CreateNodes,
  CreateNodesContext,
  CreateNodesResultArray,
  Tree,
} from "@nx/devkit";

export { MainModule } from "./main.module";
export { AdapterModule } from "./modules/adapter/adapter.module";
export { AdapterService } from "./modules/adapter/adapter.service";
export {
  bootstrapPlugin,
  runBootstrapCli,
} from "./modules/generator/bootstrap.utilities";
export { InstancesModule } from "./modules/instances/instances.module";
export { InstancesService } from "./modules/instances/instances.service";
export type { ProjectScope } from "./modules/instances/instances.types";
export { OptionsModule } from "./modules/options/options.module";
export { OptionsService } from "./modules/options/options.service";
export type { ConformetryPluginOptions } from "./modules/options/options.types";
export { resolvePluginService } from "./modules/plugin/plugin-context.utilities";
export { PluginModule } from "./modules/plugin/plugin.module";
export { PluginService } from "./modules/plugin/plugin.service";
export { ScopeModule } from "./modules/scope/scope.module";
export { ScopeService } from "./modules/scope/scope.service";
export type {
  ConformetryNxConfiguration,
  ConformetryNxGeneratorDefinition,
  ConformetryNxInstanceGroup,
  ConformetryNxProjectInstanceGroup,
  ConformetryNxWorkspaceInstanceGroup,
} from "./modules/scope/scope.types";

/**
 * Infers a `conformetry-validate` target onto every project holding instances.
 *
 * Nx hands this every `project.json` at once, which is why the conformetry
 * configuration is read a single time inside `inferTargets` rather than once
 * per project — the older per-file hook reloaded and re-globbed for each one.
 */
const createNodes: CreateNodes = [
  PROJECT_CONFIGURATION_GLOB,
  async (
    projectConfigurationFiles: readonly string[],
    options: unknown,
    context: CreateNodesContext,
  ): Promise<CreateNodesResultArray> => {
    const pluginService = await resolvePluginService();
    const targetsByProjectRoot = await pluginService.inferTargets({
      options,
      projectConfigurationFiles,
      workspaceRoot: context.workspaceRoot,
    });

    return projectConfigurationFiles
      .map((projectConfigurationFile): CreateNodesResultArray[number] => {
        const projectRoot = path.dirname(projectConfigurationFile);
        const targets = targetsByProjectRoot.get(projectRoot);

        return [
          projectConfigurationFile,
          targets === undefined
            ? {}
            : { projects: { [projectRoot]: { targets } } },
        ];
      })
      .filter(([, result]) => Object.keys(result).length > 0);
  },
];

const conformetryPlugin = {
  createNodes,
  name: "@conformetry/nx",
};

export default conformetryPlugin;

/**
 * Runs one configured generator against an Nx tree.
 *
 * This is the machinery a consumer's generated generator wrappers call. The
 * published package deliberately declares no generators of its own: which
 * generators exist is a property of the consumer's configuration, not of this
 * package, so `nx g @conformetry/nx:anything` resolves nothing by
 * design.
 */
export async function runConformetryGenerator(args: {
  generatorName: string;
  options?: Record<string, unknown>;
  tree: Tree;
}): Promise<string[]> {
  const pluginService = await resolvePluginService();

  return await pluginService.runGenerator({
    generatorName: args.generatorName,
    options: args.options ?? {},
    tree: args.tree,
    workspaceRoot: args.tree.root,
  });
}
