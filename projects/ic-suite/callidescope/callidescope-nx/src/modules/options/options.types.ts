// 🏷️ Types

/** Options accepted from this plugin's `nx.json` registration. */
export interface CallidescopePluginOptions {
  /** Name of the inferred per-project breadth-lookup target. */
  readonly breadthTargetName: string;
  /** Where the callidescope configuration lives, workspace-root relative. */
  readonly configurationPath: string;
  /** Name of the inferred per-project depth-lookup target. */
  readonly depthTargetName: string;
  /** Name of the inferred per-project gate target. */
  readonly gateTargetName: string;
  /** Name of the inferred per-project trace target. */
  readonly traceTargetName: string;
}
