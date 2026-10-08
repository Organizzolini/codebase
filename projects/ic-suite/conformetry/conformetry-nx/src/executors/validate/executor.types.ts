// 🏷️ Types

/** Options accepted by the conformetry validate executor. */
export interface ValidateExecutorOptions {
  /** Where the conformetry configuration lives, workspace-root relative. */
  readonly configurationPath?: string;
  /** Language names to restrict the run to; every language when absent. */
  readonly languages?: string[];
  /**
   * Lowest conformance score an instance may have, from 0 to 1.
   *
   * The weakest of the three levels: a generator's own threshold and an
   * instance group's both override it.
   */
  readonly threshold?: number;
}
