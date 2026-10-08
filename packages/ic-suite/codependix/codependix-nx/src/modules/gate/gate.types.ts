// 🏷️ Types

/** Arguments for building the command line one gate runs. */
export interface BuildCommandArguments extends GateSelection {
  /** Filesystem path of the codependix command line's entry. */
  readonly cliEntryPath: string;
  readonly configurationPath: string;
  readonly dependencies: boolean;
  /** What `node --import` registers the TypeScript loader from. */
  readonly loaderSpecifier: string;
  readonly workspaceRoot: string;
}

/** Options the gate executor accepts. */
export interface GateOptions {
  /** Workspace-relative configuration path; the registration's when omitted. */
  readonly configurationPath?: string | undefined;
  /** Build over the named projects' dependency closure. Defaults to true. */
  readonly dependencies?: boolean | undefined;
  /** Nx project names to judge, replacing the target's own project. */
  readonly projects?: string[] | undefined;
  /** Nx project tags to judge, selecting a project carrying any of them. */
  readonly tags?: string[] | undefined;
}

/** The projects one gate judges. */
export interface GateSelection {
  readonly projects: string[];
  readonly tags: string[];
}

/** Arguments for one gate run. */
export interface RunGateArguments {
  readonly options: GateOptions;
  /** The project the target belongs to, absent when run against none. */
  readonly projectName: string | undefined;
  readonly workspaceRoot: string;
}
