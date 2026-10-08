// 🏷️ Types

import type {
  FileSystemAdapter,
  FormatterAdapter,
} from "@conformetry/generation";
import type { Tree } from "@nx/devkit";

/** Arguments for building the adapters that back one generator run. */
export interface CreateAdaptersArguments {
  readonly tree: Tree;
  readonly workspaceRoot: string;
}

/** The filesystem and formatter adapters one generator run writes through. */
export interface TreeAdapters {
  readonly filesystem: FileSystemAdapter;
  readonly formatter: FormatterAdapter;
}
