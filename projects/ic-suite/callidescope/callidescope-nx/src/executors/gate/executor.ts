// 🛠️ Utilities

import { resolvePluginService } from "../../modules/plugin/plugin-context.utilities";
import { EMPTY_SCOPE_REPORT } from "../../modules/plugin/plugin.constants";
import { resolveExecutorScope } from "../../modules/plugin/plugin.utilities";

import type { GateExecutorOptions } from "./executor.types";
import type { ExecutorContext } from "@nx/devkit";

/**
 * Fails one project's task when its call stacks broke the limits it is held to.
 *
 * The gate rather than the trace: `trace` prints every stack in a project for
 * somebody reading it, and this prints only the stacks and callables that
 * decided the exit code, which is what a failed pipeline is asked to explain.
 *
 * Inferred onto every project holding a `tsconfig.json` that the workspace
 * configuration does not exclude, so `nx affected -t gate` gates a branch by
 * the projects it changed — and a project whose stacks got deeper is named by
 * the task that failed, which one workspace-wide task never could.
 *
 * With neither `projects` nor `tags` given, the selection is the project this
 * target belongs to, widened along the Nx dependency graph: a stack truncated
 * at a package boundary measures the wrong thing. The widening decides what is
 * traced and not what is judged — a dependency's breach fails the dependency's
 * own gate, which is the task named after the project that owns it.
 */
export default async function gateExecutor(
  options: GateExecutorOptions,
  context: ExecutorContext,
): Promise<{ success: boolean }> {
  const scope = await resolveExecutorScope({
    context,
    label: "gate",
    options,
  });

  // A gate with nothing to point a trace at has no verdict to record, so it
  // records a failure rather than a pass — the same rule the run itself is
  // held to one step later, and for the same reason: a green task here would
  // report the project clean without ever having read it.
  if (scope.directories.length === 0) {
    process.stdout.write(`${EMPTY_SCOPE_REPORT}\n`);

    return { success: false };
  }

  const pluginService = await resolvePluginService();
  const result = await pluginService.runGate({
    ...(options.configurationPath === undefined
      ? {}
      : { configurationPath: options.configurationPath }),
    directories: scope.directories,
    judgedProjectNames: scope.selectedDirectories,
    workspaceRoot: context.root,
  });

  // The findings are the executor's product rather than a log line, so they go
  // to stdout verbatim — and they go there whether or not the gate passed,
  // because a report saying nothing was found is how a reader tells a green
  // gate from one that never ran.
  process.stdout.write(`${result.report}\n`);

  return { success: result.ok };
}
