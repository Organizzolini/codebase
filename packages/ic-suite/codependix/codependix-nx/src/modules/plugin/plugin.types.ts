// 🏷️ Types

import type { PLUGIN_CONTEXT_GLOBAL_KEY } from "./plugin.constants";
import type { INestApplicationContext } from "@nestjs/common";

/** Options accepted from this plugin's `nx.json` registration. */
export interface CodependixPluginOptions {
  /** Where the codependix configuration lives, workspace-root relative. */
  readonly configurationPath: string;
  /** Name of the inferred per-project gate target. */
  readonly gateTargetName: string;
}

/**
 * One cache input of an inferred target: a file glob, or the npm packages an
 * installed command line is versioned by.
 */
export type InferredInput = string | { externalDependencies: string[] };

/** A target this plugin infers onto a project. */
export interface InferredTarget {
  readonly cache: boolean;
  readonly executor: string;
  /** Files whose change must invalidate the cached result. */
  readonly inputs: InferredInput[];
  readonly options: Record<string, unknown>;
}

/** One project's inferred targets, keyed by target name. */
export type InferredTargets = Record<string, InferredTarget>;

/** Arguments for inferring targets across every project in a workspace. */
export interface InferTargetsArguments {
  /** Whatever the `nx.json` registration holds, unvalidated. */
  readonly options: unknown;
  /** Every file Nx matched, workspace-root relative. */
  readonly projectConfigurationFiles: readonly string[];
  /** The command line's own inputs, from `resolveToolInputs`. */
  readonly toolInputs: readonly InferredInput[];
  readonly workspaceRoot: string;
}

/** `globalThis`, widened with the slot the plugin caches its context in. */
export type PluginContextGlobal = typeof globalThis & {
  [PLUGIN_CONTEXT_GLOBAL_KEY]?: Promise<INestApplicationContext>;
};

/** Arguments for resolving the plugin options from an untrusted value. */
export interface ResolvePluginOptionsArguments {
  /** Whether a workspace-relative path exists, for the default search. */
  readonly exists: (candidatePath: string) => boolean;
  /** Whatever the `nx.json` registration holds, unvalidated. */
  readonly options: unknown;
}
