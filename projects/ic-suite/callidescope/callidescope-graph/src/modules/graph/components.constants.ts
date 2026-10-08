// ♟️ Constants

/**
 * Low link a node starts from when its entry is somehow missing.
 *
 * Never reached by the traversal — every node is opened before it is lifted —
 * but `Map.get` reads as possibly undefined, and zero is the value an unopened
 * node would have had anyway.
 */
export const INITIAL_LOW_LINK = 0;
