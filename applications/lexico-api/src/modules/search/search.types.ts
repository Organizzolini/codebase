// 🏷️ Types

/**
 * Result of Latin enclitic decomposition.
 */
export interface EncliticDecompositionResult {
  enclitic: null | string;
  stem: string;
}

/**
 * Payload encoded into search pagination cursors.
 */
export interface SearchCursorPayload {
  id: string;
  score: number;
}

/**
 * Options controlling Relay search pagination.
 */
export interface SearchPaginationOptions {
  after?: null | string | undefined;
  before?: null | string | undefined;
  first?: null | number | undefined;
  last?: null | number | undefined;
}
