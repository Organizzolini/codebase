// 🏷️ Types

/** Options the gate executor accepts. */
export interface GateExecutorOptions {
  readonly configurationPath?: string | undefined;
  /** Nx project names to gate, replacing the target's own project. */
  readonly projects?: string[] | undefined;
  /** Nx project tags to gate, selecting a project carrying any of them. */
  readonly tags?: string[] | undefined;
  /** Widen the selection along the Nx dependency graph. Defaults to true. */
  readonly withDependencies?: boolean | undefined;
}
