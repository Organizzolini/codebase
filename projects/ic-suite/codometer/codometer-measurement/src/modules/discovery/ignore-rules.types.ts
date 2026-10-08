// 🏷️ Types

import type { Ignore } from "ignore";

/** Arguments accepted when building a rule set from patterns already in hand. */
export interface CreateIgnoreScopeArguments {
  directory: string;
  patterns: string[];
}

/**
 * A gitignore-syntax rule set together with the directory it is anchored to.
 *
 * The directory matters because gitignore patterns are relative to the file
 * they were written in: `/output` in a project's own ignore file claims that
 * project's `output`, not the one at the repository root.
 */
export interface IgnoreScope {
  /** Directory the patterns are relative to, `/`-separated from the walk root. `""` is the root itself. */
  directory: string;
  matcher: Ignore;
}

/** Arguments accepted when reading a rule set out of a gitignore-syntax file. */
export interface ReadIgnoreScopeArguments {
  directory: string;
  filePath: string;
}
