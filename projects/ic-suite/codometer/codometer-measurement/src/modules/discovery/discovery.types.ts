// 🏷️ Types

import type { IgnoreScope } from "./ignore-rules.types";

/** Arguments accepted when discovering the files to measure. */
export interface DiscoverFilesArguments {
  exclude: string[];
  excludeFrom: string[];
  workingDirectory: string;
}

/** Categorized lists of file paths, relative to the working directory. */
export interface DiscoveryResult {
  cssFiles: string[];
  /** Every file the target holds, before any category claims it. */
  files: string[];
  hclFiles: string[];
  jsFiles: string[];
  jsonFiles: string[];
  markdownFiles: string[];
  notebookFiles: string[];
  pyFiles: string[];
  shellFiles: string[];
  sourceFiles: string[];
  sqlFiles: string[];
  testFiles: string[];
  tomlFiles: string[];
  tsFiles: string[];
  yamlFiles: string[];
}

/** Arguments accepted when walking one directory of the measured tree. */
export interface WalkDirectoryArguments {
  absoluteDirectory: string;
  exclude: string[];
  /** Rule sets from the configured ignore files, all anchored at the walk root. */
  excludeFromScopes: readonly IgnoreScope[];
  /** Rule sets from the `.gitignore` files seen so far, outermost first. */
  ignoreScopes: readonly IgnoreScope[];
  relativeDirectory: string;
}

/** Arguments accepted when descending into one subdirectory. */
export interface WalkSubdirectoryArguments extends WalkDirectoryArguments {
  absolutePath: string;
  relativePath: string;
}
