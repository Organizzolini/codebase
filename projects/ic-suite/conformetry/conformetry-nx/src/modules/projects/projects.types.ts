// 🏷️ Types

/** Arguments for walking a directory for project configurations. */
export interface ListProjectConfigurationFilesArguments {
  readonly directoryPath: string;
  /** Workspace-relative paths `.nxignore` excludes from discovery. */
  readonly ignoredPaths: string[];
  readonly workspaceRoot: string;
}

/** Arguments for reading one project's configuration. */
export interface ReadProjectScopeArguments {
  readonly projectConfigurationFile: string;
  readonly workspaceRoot: string;
}
