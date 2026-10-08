// 🛠️ Utilities

import {
  resolveOptionsService,
  resolvePluginService,
} from "../../modules/plugin/plugin-context.utilities";
import { resolveExecutorScope } from "../../modules/plugin/plugin.utilities";

import type { TraceExecutorOptions } from "./executor.types";
import type { ExecutorContext } from "@nx/devkit";

/**
 * Traces one selection of Nx projects with callidescope.
 *
 * Inferred onto every project holding a `tsconfig.json`, so
 * `nx run-many -t trace` covers the workspace,
 * `nx run-many -t trace --projects=tag:type:package` covers a category, and
 * `nx affected -t trace` covers only what changed — none of which the
 * workspace-wide command can do, and none of which needs a flag of its own:
 * selecting projects is what the task runner is for.
 *
 * With neither `projects` nor `tags` given, the selection is the project this
 * target belongs to.
 */
export default async function traceExecutor(
  options: TraceExecutorOptions,
  context: ExecutorContext,
): Promise<{ success: boolean }> {
  const scope = await resolveExecutorScope({
    context,
    label: "trace",
    options,
  });

  if (scope.directories.length === 0) {
    return { success: true };
  }

  const optionsService = await resolveOptionsService();
  const pluginService = await resolvePluginService();
  const result = await pluginService.runTrace({
    ...(options.configurationPath === undefined
      ? {}
      : { configurationPath: options.configurationPath }),
    directories: scope.directories,
    format: optionsService.readFormat(options.format),
    judgedProjectNames: scope.selectedDirectories,
    workspaceRoot: context.root,
  });

  // The report is the executor's product rather than a log line, so it goes
  // to stdout verbatim.
  process.stdout.write(`${result.report}\n`);

  return { success: result.ok };
}
