// 🏷️ Types

/** Arguments for building the set of paths a run will not trace. */
export interface BuildExclusionsArguments {
  readonly exclude: readonly string[];
  readonly excludeFrom: readonly string[];
  readonly workspaceRoot: string;
}

/** Arguments for layering each project's own exclusions over a run's. */
export interface BuildProjectFileFilterArguments {
  /**
   * The globs each project declared for itself, keyed by project name, exactly
   * as that project's own configuration file wrote them.
   *
   * A project that declared none is absent rather than present with an empty
   * array, so an empty map means no project in the run excludes anything and
   * the run's own filter is handed straight back.
   */
  readonly excludeByProject: ReadonlyMap<string, readonly string[]>;
  /** The run's own filter, which every project's globs are layered over. */
  readonly fileFilter: FileFilter;
  /**
   * Every project the run reached, so a file is judged by the project that
   * owns it rather than by whichever declaring root happens to contain it.
   */
  readonly projects: readonly WorkspaceProject[];
}

/** Arguments for discovering the projects a run will trace. */
export interface DiscoverProjectsArguments {
  /**
   * Project directories to trace, workspace-relative or absolute. Every
   * directory under the workspace root holding its own `tsconfig.json`
   * when empty.
   */
  readonly directories: readonly string[];
  /**
   * Decides which projects a run will not trace, judged on the
   * `tsconfig.json` that would identify each one.
   *
   * Applied here rather than only to the files a program yields, because a
   * `tsconfig.json` an exclusion already names should never be read at all —
   * one that does not parse, belonging to a directory nobody asked to trace,
   * is not a reason for the run to say anything.
   */
  readonly fileFilter?: FileFilter | undefined;
  readonly workspaceRoot: string;
}

/** Decides whether a file is traced. */
export interface FileFilter {
  /** True when the file should be left out of the graph. */
  readonly isExcluded: (workspaceRelativePath: string) => boolean;
}

/**
 * Reports the workspace-relative paths one project's program pulled in.
 *
 * How that project came to have a program at all — built fresh for this
 * traversal, reused from an earlier one — is entirely the implementation's
 * concern. `walkImportedProjectClosure` reads only the paths that come back.
 */
export type ResolveProjectFilesFunction = (
  project: WorkspaceProject,
) => readonly string[];

/** Arguments for walking the projects a set of starting roots' imports reach. */
export interface WalkImportedProjectClosureArguments {
  /** Reports the workspace-relative paths one project's program pulled in. */
  readonly resolveProjectFiles: ResolveProjectFilesFunction;
  /** Project roots the traversal begins from. Always present in the result. */
  readonly startingProjects: readonly WorkspaceProject[];
  /**
   * Every project known to the workspace, not only the ones reached so far —
   * this is what lets a pulled-in file resolve to a project the traversal has
   * not visited yet.
   */
  readonly workspaceProjects: readonly WorkspaceProject[];
}

/** One project discovered from a directory holding its own `tsconfig.json`. */
export interface WorkspaceProject {
  /** Absolute path to the project's `tsconfig.json`. */
  readonly configurationPath: string;
  /**
   * Whether the project's root holds a `package.json`, read once when the
   * project is discovered.
   *
   * A fact about the directory rather than a policy about it — what it is
   * used for is `WorkspaceService.isClosureDestination`, and
   * `PACKAGE_MANIFEST_NAME` holds why. Carried on the project so the closure
   * traversal is a walk over data rather than over the filesystem: it is
   * consulted once per pulled-in *path*, and a project reached late would
   * otherwise be stat-ed thousands of times before it was reached at all.
   */
  readonly hasPackageManifest: boolean;
  /** Same as `root`: the project's own directory is its identity. */
  readonly name: string;
  /** Workspace-relative project root, POSIX separators. */
  readonly root: string;
}
