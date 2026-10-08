// 🏷️ Types

/** Options the trace executor accepts. */
export interface TraceExecutorOptions {
  readonly configurationPath?: string | undefined;
  readonly format?: string | undefined;
  /** Nx project names to trace, replacing the target's own project. */
  readonly projects?: string[] | undefined;
  /** Nx project tags to trace, selecting a project carrying any of them. */
  readonly tags?: string[] | undefined;
  /** Widen the selection along the Nx dependency graph. Defaults to true. */
  readonly withDependencies?: boolean | undefined;
}
