// ♟️ Constants

/**
 * The directory a dependency's own sources sit under.
 *
 * A path this names is not workspace code, so it can never widen a dependency
 * closure: `lib.es5.d.ts` and every package a program pulled in would
 * otherwise be walked back to whichever project's root contains them, and the
 * workspace root contains them all.
 */
export const DEPENDENCY_DIRECTORY_NAME = "node_modules";

/** Says what was wrong with a directory a run was told to trace. */
export const MISSING_PROJECT_CONFIGURATION_MESSAGE =
  "the directory holds no tsconfig.json";

// 🚨 Errors

/**
 * Raised when a project's `tsconfig.json` cannot be read.
 *
 * Fatal to the whole run rather than skipped, and deliberately so. A host
 * writes its report before it weighs its findings, so a run that stepped over
 * the project would publish depths measured through a graph missing it and
 * only then fail — and on a default branch that means committing wrong numbers
 * that failing afterwards does not take back. Ending the run leaves every
 * destination exactly as it found it.
 *
 * Raised for a directory a run was told to trace that holds no
 * `tsconfig.json` at all, as well as for one whose configuration will not
 * parse. Both are the same mistake seen from two sides — the run was pointed
 * at something it cannot build a program from — and both used to be stepped
 * over, which is how a run came to pass a gate for having traced nothing.
 *
 * A project that should not be read at all is a different question, answered
 * by an exclusion: `WorkspaceService.discoverProjects` drops it before its
 * configuration is ever opened.
 */
export class ProgramConfigurationError extends Error {
  constructor(args: { configurationPath: string; messages: string[] }) {
    super(
      `Could not read ${args.configurationPath}: ${args.messages.join("; ")}`,
    );
    this.name = "ProgramConfigurationError";
  }
}
