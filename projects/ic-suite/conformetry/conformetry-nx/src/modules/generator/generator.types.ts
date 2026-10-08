// 🏷️ Types

import type { ProjectScope } from "../instances/instances.types";

/** Arguments for emitting the consumer's generator plugin. */
export interface EmitPluginArguments {
  readonly configurationPath: string;
  /** Directory the plugin is written to, relative to the workspace root. */
  readonly outputPath: string;
  /** Package name the emitted plugin is addressed by, as in `nx g <name>:x`. */
  readonly packageName: string;
  /**
   * The workspace's projects, used to enumerate a scoped generator's choices.
   *
   * Passed in rather than read here so emitting stays pure with respect to the
   * filesystem: the graph, the sync generator, and the install-time bootstrap
   * each know how to list projects, and they do not agree on how.
   */
  readonly projects?: readonly ProjectScope[] | undefined;
}

/** One file the generator emits, with its workspace-relative path. */
export interface EmittedFile {
  readonly content: string;
  readonly filePath: string;
}
