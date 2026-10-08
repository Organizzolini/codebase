// 🏷️ Types

/** Options accepted from this plugin's `nx.json` registration. */
export interface ConformetryPluginOptions {
  /** Where the conformetry configuration lives, workspace-root relative. */
  readonly configurationPath: string;
  /** Name of the inferred per-project validation target. */
  readonly validateTargetName: string;
}
