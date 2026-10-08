// 🏷️ Types

import type { ProjectScope } from "../instances/instances.types";
import type { PLUGIN_CONTEXT_GLOBAL_KEY } from "./plugin.constants";
import type { INestApplicationContext } from "@nestjs/common";
import type { Tree } from "@nx/devkit";

/** A target this plugin infers onto a project. */
export interface InferredTarget {
  readonly cache: boolean;
  readonly executor: string;
  /** Files whose change must invalidate the cached result. */
  readonly inputs?: string[];
  readonly options: Record<string, unknown>;
}

/** One project's inferred targets, keyed by target name. */
export type InferredTargets = Record<string, InferredTarget>;

/** Arguments for inferring targets across every project in a workspace. */
export interface InferTargetsArguments {
  readonly options: unknown;
  /** Every `project.json` Nx matched, workspace-root relative. */
  readonly projectConfigurationFiles: readonly string[];
  readonly workspaceRoot: string;
}

/** `globalThis`, widened with the slot the plugin caches its context in. */
export type PluginContextGlobal = typeof globalThis & {
  [PLUGIN_CONTEXT_GLOBAL_KEY]?: Promise<INestApplicationContext>;
};

/** Arguments for running one generator against an Nx tree. */
export interface RunGeneratorArguments {
  readonly generatorName: string;
  readonly options: Record<string, unknown>;
  readonly tree: Tree;
  readonly workspaceRoot: string;
}

/** Arguments for validating one project. */
export interface RunValidationArguments {
  readonly languageNames?: string[];
  readonly options: unknown;
  readonly project: ProjectScope;
  /** Run-level conformance floor; the weakest of the three threshold levels. */
  readonly threshold?: number;
  readonly workspaceRoot: string;
}

/** The outcome of validating one project. */
export interface RunValidationResult {
  readonly ok: boolean;
  readonly report: string;
}
