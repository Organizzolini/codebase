import { existsSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  CODEPENDIX_NX_PLUGIN_NAME,
  DEFAULT_CONFIGURATION_PATHS,
  DEFAULT_GATE_TARGET_NAME,
  PROJECT_CONFIGURATION_FILENAME,
  PROJECT_CONFIGURATION_INPUT,
  WORKSPACE_PROJECT_ROOT,
} from "./plugin.constants";

import type {
  CodependixPluginOptions,
  InferredTargets,
  InferTargetsArguments,
  ResolvePluginOptionsArguments,
} from "./plugin.types";

/**
 * Reads this plugin's registration and infers the gate from it.
 *
 * Nx calls plugins from module-level functions with no injection of their own,
 * so the bare entry point in `index.ts` builds nothing itself — it resolves this
 * service and hands it the arguments.
 *
 * Nx passes whatever the consumer wrote in `nx.json` with no validation, so
 * every option is checked before use rather than cast. A bad value falls back
 * to its default: a typo in a target name should not stop the project graph
 * from being built.
 */
@Injectable()
export class PluginService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Narrows an untrusted value to an array without widening it to `any`. */
  private isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  /** Reads a non-empty string field from an untrusted record. */
  private readString(args: {
    key: string;
    record: Record<string, unknown>;
  }): string | undefined {
    const value = args.record[args.key];

    return typeof value === "string" && value !== "" ? value : undefined;
  }

  /**
   * The project roots among the files Nx matched: each `project.json`'s
   * directory, the workspace root excepted.
   */
  private selectProjectRoots(
    projectConfigurationFiles: readonly string[],
  ): string[] {
    return projectConfigurationFiles
      .filter(
        (projectConfigurationFile) =>
          path.basename(projectConfigurationFile) ===
          PROJECT_CONFIGURATION_FILENAME,
      )
      .map((projectConfigurationFile) => path.dirname(projectConfigurationFile))
      .filter((projectRoot) => projectRoot !== WORKSPACE_PROJECT_ROOT);
  }

  /** Copies an untrusted value into a record, or an empty one. */
  private toRecord(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null ? { ...value } : {};
  }

  // 🌎 Public Methods

  /**
   * Builds the gate for every project Nx matched, keyed by project root.
   *
   * Every project gets one, the workspace root excepted. The gate builds over
   * a project's dependency closure, so its inputs reach the dependencies'
   * sources through `^default`; the workspace configuration holds the rules,
   * so editing it invalidates every gate; the project's own configuration is
   * the one file only this project's gate reads; and the command line's own
   * code decides every verdict, through the `toolInputs` the caller resolved
   * with `resolveToolInputs`. No `configurations` are
   * declared, so an aggregator run with `--configuration=check` falls through
   * to the defaults rather than failing for a configuration this target lacks.
   */
  public inferTargets(
    args: InferTargetsArguments,
  ): Map<string, InferredTargets> {
    const pluginOptions = this.resolvePluginOptions({
      exists: (candidatePath) =>
        existsSync(path.join(args.workspaceRoot, candidatePath)),
      options: args.options,
    });
    const targets: InferredTargets = {
      [pluginOptions.gateTargetName]: {
        cache: true,
        executor: `${CODEPENDIX_NX_PLUGIN_NAME}:gate`,
        inputs: [
          "default",
          "^default",
          `{workspaceRoot}/${pluginOptions.configurationPath}`,
          PROJECT_CONFIGURATION_INPUT,
          ...args.toolInputs,
        ],
        options: {},
      },
    };
    return new Map(
      this.selectProjectRoots(args.projectConfigurationFiles).map(
        (projectRoot) => [projectRoot, targets],
      ),
    );
  }

  /**
   * Finds this plugin's own entry in an `nx.json` and returns its options.
   *
   * Nx hands plugin options to `createNodes` and to nothing else, so the gate
   * executor reads them back from the file the workspace registered them in —
   * the only way a target inferred without options can honor the path the
   * registration chose.
   */
  public readRegisteredOptions(nxConfiguration: unknown): unknown {
    const { plugins } = this.toRecord(nxConfiguration);

    if (!this.isUnknownArray(plugins)) {
      return undefined;
    }

    const registration = plugins
      .map((entry) => this.toRecord(entry))
      .find(({ plugin }) => plugin === CODEPENDIX_NX_PLUGIN_NAME);
    const { options } = registration ?? {};

    return options;
  }

  /**
   * Resolves the effective plugin options from an untrusted value.
   *
   * A configuration path nobody named is searched for rather than assumed,
   * because it becomes a cache input: an input naming a file that does not
   * exist would leave every gate cached across an edit to the one that does.
   */
  public resolvePluginOptions(
    args: ResolvePluginOptionsArguments,
  ): CodependixPluginOptions {
    const record = this.toRecord(args.options);

    return {
      configurationPath:
        this.readString({ key: "configurationPath", record }) ??
        DEFAULT_CONFIGURATION_PATHS.find((candidatePath) =>
          args.exists(candidatePath),
        ) ??
        DEFAULT_CONFIGURATION_PATHS[0],
      gateTargetName:
        this.readString({ key: "gateTargetName", record }) ??
        DEFAULT_GATE_TARGET_NAME,
    };
  }
}
