// 🏷️ Types

/** Options accepted by the conformetry sync generator. */
export interface SyncGeneratorOptions {
  /** Path to the conformetry configuration, relative to the workspace root. */
  readonly configurationPath?: string;
  /** Directory the generator plugin is emitted into. */
  readonly outputPath?: string;
  /** Package name the emitted plugin is addressed by. */
  readonly packageName?: string;
}
