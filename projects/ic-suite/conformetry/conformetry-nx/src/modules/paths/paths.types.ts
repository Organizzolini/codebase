// 🏷️ Types

import type { Tree } from "@nx/devkit";

/** Arguments for deciding where a generator writes. */
export interface ResolveGenerationPathArguments {
  readonly configurationPath: string;
  /**
   * The generator being run, used to find the scope it is confined to.
   *
   * Optional so a caller with no generator in hand — anything resolving a path
   * outside a generator run — still gets the inferred layout.
   */
  readonly generatorName?: string | undefined;
  /** The generator's own inputs, such as `project`, `module`, and `name`. */
  readonly inputs: Record<string, string | undefined>;
  readonly tree: Tree;
  readonly workspaceRoot: string;
}
