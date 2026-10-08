// 🏷️ Types

/** Arguments for collecting the instances that belong to one project. */
export interface FindProjectInstancesArguments {
  readonly configurationPath: string;
  readonly project: ProjectScope;
  readonly workspaceRoot: string;
}

/** One Nx project, reduced to what instance scoping needs. */
export interface ProjectScope {
  readonly name: string;
  /** Project root, relative to the workspace root. */
  readonly root: string;
  readonly tags: string[];
}
