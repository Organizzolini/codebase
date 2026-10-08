// 📤 Exports
import path from "node:path";

import { resolvePluginService } from "./modules/plugin/plugin-context.utilities";
import { PROJECT_CONFIGURATION_GLOB } from "./modules/plugin/plugin.constants";

import type {
  CreateNodes,
  CreateNodesContext,
  CreateNodesResultArray,
} from "@nx/devkit";

export { MainModule } from "./main.module";
export { AddressModule } from "./modules/address/address.module";
export { AddressService } from "./modules/address/address.service";
export type {
  LookupArguments,
  LookupResult,
} from "./modules/address/address.types";
export {
  CALLIDESCOPE_NX_PLUGIN_NAME,
  DEFAULT_BREADTH_TARGET_NAME,
  DEFAULT_DEPTH_TARGET_NAME,
  DEFAULT_GATE_TARGET_NAME,
  DEFAULT_TRACE_TARGET_NAME,
} from "./modules/options/options.constants";
export { OptionsModule } from "./modules/options/options.module";
export { OptionsService } from "./modules/options/options.service";
export type { CallidescopePluginOptions } from "./modules/options/options.types";
export {
  resolveAddressService,
  resolveOptionsService,
  resolvePluginService,
  resolveProjectsService,
} from "./modules/plugin/plugin-context.utilities";
export { PluginModule } from "./modules/plugin/plugin.module";
export { PluginService } from "./modules/plugin/plugin.service";
export type {
  ResolvedTraceScope,
  RunTraceResult,
} from "./modules/plugin/plugin.types";
export { ProjectsModule } from "./modules/projects/projects.module";
export { ProjectsService } from "./modules/projects/projects.service";
export type {
  NxProject,
  ResolvedProjectDirectories,
  ResolvedProjectSelection,
} from "./modules/projects/projects.types";

/**
 * Infers this plugin's targets onto every project holding a `tsconfig.json`.
 *
 * Nx hands this every `project.json` at once, which is why inference reads the
 * plugin options a single time inside `inferTargets` rather than once per
 * project.
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

const callidescopePlugin = {
  createNodes,
  name: "@callidescope/nx",
};

export default callidescopePlugin;
