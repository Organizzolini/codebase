// ♟️ Constants

/**
 * Score an instance must reach when no threshold is configured anywhere.
 *
 * A perfect match, which is what conformetry has always demanded: adding
 * scoring must not quietly relax any existing run.
 */
export const DEFAULT_THRESHOLD = 1;

/**
 * Separator joining an instance path and a template name into a score key.
 * A NUL byte cannot occur in either, so it can never collide.
 */
export const SCORE_KEY_SEPARATOR = "\u0000";

/**
 * Separator joining an instance path and a template path into a deduplication
 * key. A NUL byte cannot occur in either, so it can never collide.
 */
export const FINDING_KEY_SEPARATOR = "\u0000";
