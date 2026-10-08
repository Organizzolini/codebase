// ♟️ Constants

/**
 * Frames a stack needs before a report carries it.
 *
 * Two, because a single frame is a callable that calls nothing — accurate, but
 * not a call stack, and there are twice as many of those as there are real
 * ones.
 */
export const MINIMUM_STACK_FRAMES = 2;
