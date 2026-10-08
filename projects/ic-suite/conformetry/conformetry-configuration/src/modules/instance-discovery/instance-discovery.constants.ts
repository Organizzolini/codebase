// ♟️ Constants

/**
 * Separator joining an instance's directory, name, and scope kind into a map
 * key. A NUL byte cannot occur in any of the three, so it can never collide.
 */
export const INSTANCE_KEY_SEPARATOR = "\u0000";

/**
 * Coverage at which an instance has every file a template declares.
 *
 * Several templates reaching this together are all applied rather than being
 * reported as ambiguous — the instance satisfies each of them.
 */
export const COMPLETE_MATCH_RATIO = 1;

/** Matches a filename's final extension, used to name an unsuffixed file. */
export const FILE_EXTENSION_PATTERN = /\.[^.]+$/u;

/** Characters that make a glob segment a pattern rather than a literal name. */
export const GLOB_WILDCARD_CHARACTERS = ["*", "?", "]"];

/**
 * Minimum share of a template's files an instance must already have before the
 * template is considered a match.
 *
 * Set to zero: any overlap puts a template in the running, and ranking decides
 * between them. A higher floor would silently drop instances that have drifted
 * far from their template — which is exactly the drift worth reporting.
 */
export const MINIMUM_MATCH_RATIO = 0;
