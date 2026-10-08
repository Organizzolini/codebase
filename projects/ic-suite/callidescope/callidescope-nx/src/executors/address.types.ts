// 🏷️ Types

/** Options the `depth` and `breadth` executors accept. */
export interface AddressExecutorOptions {
  /**
   * The callables to look up, each `<file>#<qualified-name>`.
   *
   * Plural to match the `--addresses` the command line takes, so one target
   * run answers about a whole rename rather than one callable at a time.
   */
  readonly addresses?: string[] | undefined;
  readonly configurationPath?: string | undefined;
  readonly format?: string | undefined;
  /** Nx project names to resolve against, replacing the target's own project. */
  readonly projects?: string[] | undefined;
  /** Nx project tags to resolve against, matching a project carrying any of them. */
  readonly tags?: string[] | undefined;
  /** Widen the selection along the Nx dependency graph. Defaults to true. */
  readonly withDependencies?: boolean | undefined;
}
