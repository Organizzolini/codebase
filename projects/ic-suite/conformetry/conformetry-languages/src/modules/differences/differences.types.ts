// 🏷️ Types

/** Arguments for building a missing-directory conformance error. */
export interface BuildMissingDirectoryErrorArguments {
  readonly instanceDirectoryPath: string;
  readonly templateDirectoryPath: string;
}

/** Arguments for building a missing-file conformance error. */
export interface BuildMissingFileErrorArguments {
  readonly instanceFilePath: string;
  readonly templateFilePath: string;
}
