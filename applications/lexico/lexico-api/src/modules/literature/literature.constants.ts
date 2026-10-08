// ♟️ Constants

import type { PartitionCounts } from "./literature.types";

/** A parent with no children counts nothing. */
export const EMPTY_PARTITION_COUNTS: PartitionCounts = {
  beforeCount: 0,
  totalCount: 0,
  windowCount: 0,
};

/**
 * The lowercase uuid an entity id cursor must carry — Postgres returns uuids
 * lowercase — checked before Postgres sees it, so a malformed cursor is
 * ignored rather than failing the query.
 */
export const ENTITY_ID_PATTERN =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/u;

/**
 * The most ids one page load binds at once; Postgres rejects a statement with
 * more than 65,535 parameters, which an unlimited page could otherwise reach.
 */
export const LOAD_CHUNK_SIZE = 1000;
