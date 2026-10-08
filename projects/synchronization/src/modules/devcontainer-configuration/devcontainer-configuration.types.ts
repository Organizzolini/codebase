// 🏷️ Types

/** Minimal shape required for devcontainer synchronization and comparison. */
export interface DevcontainerConfiguration {
  [key: string]: unknown;
  features?: Record<string, unknown>;
  name?: string;
  remoteEnv?: Record<string, string>;
  runArgs?: string[];
}
