// ♟️ Constants

/**
 * Characters that make a glob segment match more than its literal self.
 *
 * Everything before the first of them is a path the walk can descend to
 * directly, which is what keeps an input over one build directory from
 * enumerating the whole repository to find it.
 */
export const GLOB_MAGIC_CHARACTERS = /[!*+?@[\]{}()]/;

/** Separator every relative path the walk produces uses, on every platform. */
export const PATH_SEPARATOR = "/";

// 🚨 Errors

/**
 * Raised when an input's directory reaches outside the repository.
 *
 * An input may name its way out of the folder being measured — that is how a
 * project reaches build output written above it — but not out of the
 * repository holding both. Beyond that boundary a configuration file could
 * read any file on the machine and report its size, which is not a measurement
 * anybody asked for and is exactly what a tool published as a shared action
 * must not be able to do.
 */
export class InputOutsideRepositoryError extends Error {
  constructor(input: string, directory: string, boundary: string) {
    super(
      `Input "${input}" starts at ${directory}, which is outside ${boundary}. An input may reach out of the measured folder but not out of the repository holding it — write its directory relative to something inside.`,
    );
    this.name = "InputOutsideRepositoryError";
  }
}
