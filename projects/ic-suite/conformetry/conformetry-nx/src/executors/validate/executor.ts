// 🛠️ Utilities

import { resolvePluginService } from "../../modules/plugin/plugin-context.utilities";

import type { ValidateExecutorOptions } from "./executor.types";
import type { ExecutorContext } from "@nx/devkit";

/**
 * Validates one project's instances against their conformetry templates.
 *
 * Inferred onto every project holding at least one instance, so
 * `nx run-many -t conformetry-validate` covers the workspace and
 * `nx affected -t conformetry-validate` covers only what changed — which the
 * single workspace-wide command it replaces could not do.
 */
export default async function validateExecutor(
  options: ValidateExecutorOptions,
  context: ExecutorContext,
): Promise<{ success: boolean }> {
  const projectName = context.projectName;

  if (projectName === undefined) {
    throw new Error(
      "The conformetry validate executor must be run against a project.",
    );
  }

  const projectConfiguration =
    context.projectsConfigurations.projects[projectName];

  if (projectConfiguration === undefined) {
    throw new Error(`Unknown project: ${projectName}.`);
  }

  const pluginService = await resolvePluginService();
  const result = await pluginService.runValidation({
    ...(options.languages === undefined
      ? {}
      : { languageNames: options.languages }),
    options,
    ...(options.threshold === undefined
      ? {}
      : { threshold: options.threshold }),
    project: {
      name: projectName,
      root: projectConfiguration.root,
      tags: [...(projectConfiguration.tags ?? []), `name:${projectName}`],
    },
    workspaceRoot: context.root,
  });

  // The report is the executor's product rather than a log line, so it goes
  // to stdout verbatim — which is also what lets the suppression go away.
  process.stdout.write(`${result.report}\n`);

  return { success: result.ok };
}
