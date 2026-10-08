// 📤 Exports
import path from "node:path";

import { logger } from "@nx/devkit";

import { resolvePluginService } from "./modules/plugin/plugin-context.utilities";
import { resolveToolInputs } from "./modules/plugin/plugin-inputs.utilities";
import { PROJECT_CONFIGURATION_GLOB } from "./modules/plugin/plugin.constants";

import type {
  CreateNodes,
  CreateNodesContext,
  CreateNodesResultArray,
} from "@nx/devkit";

export { MainModule } from "./main.module";
export { GateModule } from "./modules/gate/gate.module";
export { GateService } from "./modules/gate/gate.service";
export type { GateOptions, GateSelection } from "./modules/gate/gate.types";
export {
  resolveGateService,
  resolvePluginService,
} from "./modules/plugin/plugin-context.utilities";
export {
  CODEPENDIX_NX_PLUGIN_NAME,
  DEFAULT_GATE_TARGET_NAME,
} from "./modules/plugin/plugin.constants";
export { PluginModule } from "./modules/plugin/plugin.module";
export { PluginService } from "./modules/plugin/plugin.service";
export type { CodependixPluginOptions } from "./modules/plugin/plugin.types";

/**
 * Infers the gate onto every project but the workspace root.
 *
 * Nx hands this every matched file at once, which is why inference reads the
 * plugin options a single time rather than once per project.
 */
const createNodes: CreateNodes = [
  PROJECT_CONFIGURATION_GLOB,
  async (
    projectConfigurationFiles: readonly string[],
    options: unknown,
    context: CreateNodesContext,
  ): Promise<CreateNodesResultArray> => {
    const pluginService = await resolvePluginService();
    const targetsByProjectRoot = pluginService.inferTargets({
      options,
      projectConfigurationFiles,
      toolInputs: resolveToolInputs({
        logger,
        workspaceRoot: context.workspaceRoot,
      }),
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

const codependixPlugin = {
  createNodes,
  name: "@codependix/nx",
};

export default codependixPlugin;
