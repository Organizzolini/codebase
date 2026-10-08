// 🏷️ Types

import type { PLUGIN_CONTEXT_GLOBAL_KEY } from "./plugin.constants";
import type { CallidescopeOutputFormat } from "@callidescope/configuration";
import type { OwnedFindings } from "@callidescope/output";
import type { INestApplicationContext } from "@nestjs/common";

/** The scoping options every executor in this plugin accepts. */
export interface ExecutorScopeOptions {
  readonly projects?: string[] | undefined;
  readonly tags?: string[] | undefined;
  readonly withDependencies?: boolean | undefined;
}

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

/** What a selection of Nx projects resolved to before a trace runs. */
export interface ResolvedTraceScope {
  /** Workspace-relative directories to hand `callidescope --directories`. */
  readonly directories: string[];
  /** Every project name the workspace has, for naming an unknown one back. */
  readonly knownNames: string[];
  /** Every tag the workspace carries, for naming an unmatched one back. */
  readonly knownTags: string[];
  /** Every project the selection reached, including pulled-in dependencies. */
  readonly projectNames: string[];
  /**
   * Directories of the projects the selection itself named, before the
   * dependency widening.
   *
   * What a verdict covers, where `directories` is what a trace reads: a
   * dependency pulled in to keep a stack from stopping at a package boundary
   * is measured by this run and judged by its own.
   */
  readonly selectedDirectories: string[];
  /** Names the workspace does not have. */
  readonly unknownNames: string[];
  /** Tags no project in the workspace carries. */
  readonly unmatchedTags: string[];
}

/** Arguments for resolving what one executor invocation should trace. */
export interface ResolveTraceScopeArguments {
  /** Names from the executor's `projects` option. Empty selects nothing. */
  readonly projectNames: readonly string[];
  /** Tags from the executor's `tags` option. Empty selects nothing. */
  readonly tags: readonly string[];
  /** Whether the selection widens along the Nx dependency graph. */
  readonly withDependencies: boolean;
}

/**
 * Arguments for gating one resolved selection against its limits.
 *
 * The trace's arguments without `format`: a gate's output is the findings that
 * decided its exit code, so there is no second rendering of it to ask for.
 */
export type RunGateArguments = Omit<RunTraceArguments, "format">;

/** Arguments for tracing one resolved selection. */
export interface RunTraceArguments {
  /** Resolved from this plugin's `nx.json` registration when omitted. */
  readonly configurationPath?: string | undefined;
  readonly directories: readonly string[];
  /** What the run prints. Defaults to markdown when omitted. */
  readonly format?: CallidescopeOutputFormat | undefined;
  /**
   * The projects whose findings decide the verdict.
   *
   * A subset of `directories`, which is what gets traced: a run reaches into
   * the dependencies of what it was pointed at, and a finding there belongs
   * to the task named after the project that owns it.
   *
   * Workspace-relative roots, because that is what callidescope calls a
   * project name — `WorkspaceService.discoverProjects` names each project by
   * the directory holding its `tsconfig.json`, and a report's `projectName`
   * is that same string. An Nx project name would match nothing.
   */
  readonly judgedProjectNames: readonly string[];
  readonly workspaceRoot: string;
}

/** The outcome of tracing one selection. */
export interface RunTraceResult {
  readonly ok: boolean;
  readonly report: string;
}

/**
 * What one predicate decided about a traced result.
 *
 * The findings come back with the verdict so the rendering shows what was
 * judged rather than what was measured — the two differ for every scoped run.
 *
 * `reason` carries the rendering a verdict owes the reader when the findings
 * cannot explain it themselves — a run that read nothing has no finding to
 * show, and a bare red task there is the guessing game this rule exists to
 * end.
 */
export interface RunVerdict {
  readonly findings: OwnedFindings;
  /** Whether every rule both targets share was cleared. */
  readonly ok: boolean;
  readonly reason: string | undefined;
  /**
   * Judged projects none of whose own files were read.
   *
   * Reported beside `ok` rather than folded into it, because this is the one
   * rule the two targets act on differently: a `gate` fails on it, a `trace`
   * prints it and passes. Every project the workspace configuration excludes
   * reads nothing of its own and keeps its trace while losing its gate, so a
   * trace failing here would be permanently red for being configured as asked.
   * The rule itself still lives in one place — `PluginService.judge` — and only
   * the consequence is the caller's.
   */
  readonly unreadProjectNames: readonly string[];
}
