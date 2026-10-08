// 🏷️ Types

import type { ResolvedCodometerInput } from "@codometer/configuration";

/** What a directory entry counts as while an input's tree is walked. */
export type InputEntryKind = "directory" | "file" | "other";

/** Arguments accepted when listing the files an input holds. */
export interface MatchInputFilesArguments {
  input: ResolvedCodometerInput;
  workingDirectory: string;
}

/** Arguments accepted when walking one directory of an input's tree. */
export interface WalkInputArguments {
  absoluteDirectory: string;
  /**
   * The literal path prefix of each include glob.
   *
   * A glob's prefix is where its matches can begin, so a directory neither
   * leading to a prefix nor sitting inside one holds nothing the input wants.
   */
  includeBases: readonly string[];
  input: ResolvedCodometerInput;
  relativeDirectory: string;
}
