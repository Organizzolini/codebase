// 🏷️ Types

/**
 * One Nx project, reduced to what a directory resolution needs of it.
 *
 * `codependix-nx-projects` declares a near-identical shape and reads it out of the
 * graph the same way. They are deliberately not shared: the two packages sit
 * in different toolchains, and `configuration/eslint.config.ts` lets this one
 * depend on nothing but `logging` precisely so `@nx/devkit` cannot spread. A
 * package extracted to hold both would have to be depended on by both, which
 * is the coupling that rule exists to prevent.
 */
export interface NxProject {
  readonly name: string;
  /** Workspace-relative root, exactly as the Nx project graph states it. */
  readonly root: string;
  /** The tags `project.json` declares. Empty for a project declaring none. */
  readonly tags: string[];
}

/** A resolved selection, mapped on to the directories a trace takes. */
export interface ResolvedProjectDirectories extends ResolvedProjectSelection {
  /**
   * Workspace-relative roots of the names that resolved, sorted and
   * deduplicated — the form `callidescope --directories` takes.
   */
  readonly directories: string[];
}

/** What a set of Nx project names and tags resolved to, before directories. */
export interface ResolvedProjectSelection {
  /**
   * Every project name the graph knew, sorted — what a caller names back when
   * refusing an unknown one.
   */
  readonly knownNames: string[];
  /**
   * Every tag any project in the workspace carries, sorted and deduplicated —
   * what a caller names back when refusing one nothing carries.
   */
  readonly knownTags: string[];
  /** The projects the selection reached, sorted and deduplicated. */
  readonly projectNames: string[];
  /**
   * The names the project graph does not know, in the order they were given.
   *
   * Reported rather than dropped: a name nobody resolves is a trace that
   * silently covers less than it was asked to, which is the one failure a
   * report cannot show you.
   */
  readonly unknownNames: string[];
  /**
   * The tags no project in the workspace carries, in the order they were
   * given.
   *
   * Refused for the same reason an unknown name is: a tag matching nothing is
   * far more often a typo than an empty category, and either way the run it
   * would produce covers less than it was asked to without saying so.
   */
  readonly unmatchedTags: string[];
}
