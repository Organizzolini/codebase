import {
  createConnection,
  createEdge,
  fromCursorSafe,
  toCursor,
} from "../../lexico-api.utilities";

import { ENTITY_ID_PATTERN, LOAD_CHUNK_SIZE } from "./literature.constants";

import type { Connection } from "../../lexico-api.types";
import type { PaginationArguments } from "../search/pagination-arguments.entities";
import type {
  ConnectionQuery,
  CursorPosition,
  IdentifiedEntity,
  PageLimits,
  QueryBuilder,
} from "./literature.types";

/** Returns a connection holding no edges and counting nothing. */
export function createEmptyConnection<T>(): Connection<T> {
  return createConnection<T>({
    edges: [],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0,
  });
}

/**
 * Pages a filtered query into a Relay connection in SQL: the cursors become
 * keyset bounds on the sort key and id, `first` or `last` becomes a limit one
 * row past the page, and `totalCount` becomes a count of the filtered rows.
 * The page matches the original load-everything-then-slice behavior exactly:
 * a cursor naming no row of the filtered set is ignored, `first` is applied
 * before `last`, and a negative count is no limit at all.
 */
export async function paginateQuery<Entity extends IdentifiedEntity>(
  query: ConnectionQuery<Entity>,
  pagination: PaginationArguments = {},
): Promise<Connection<Entity>> {
  const limits: PageLimits = {
    first: readCount(pagination.first),
    last: readCount(pagination.last),
  };
  const [totalCount, after, before] = await Promise.all([
    query.filter().getCount(),
    findCursorPosition(query, pagination.after),
    findCursorPosition(query, pagination.before),
  ]);
  const windowIds = await findWindowIds(query, { after, before }, limits);
  const page = slicePage(windowIds, limits);
  const nodes = await loadInOrder(query, page.ids);
  const startsAfterFirstRow =
    after !== null && (before === null || (await hasRowBefore(query, before)));

  return createConnection<Entity>({
    edges: nodes.map((node) => createEdge(node, toCursor({ id: node.id }))),
    hasNextPage: before !== null || page.hasNext,
    hasPreviousPage: page.hasPrevious || startsAfterFirstRow,
    totalCount,
  });
}

/**
 * Cuts a window's ids to `first` and then to `last`, flagging each cut, the
 * same way the original in-memory slicing did.
 */
export function slicePage(
  ids: readonly string[],
  limits: PageLimits,
): { hasNext: boolean; hasPrevious: boolean; ids: string[] } {
  let result = [...ids];
  let hasNext = false;
  let hasPrevious = false;

  if (limits.first !== null && result.length > limits.first) {
    result = result.slice(0, limits.first);
    hasNext = true;
  }
  if (limits.last !== null && result.length > limits.last) {
    result = result.slice(result.length - limits.last);
    hasPrevious = true;
  }

  return { hasNext, hasPrevious, ids: result };
}

/** Narrows a filtered query to the rows strictly between two cursor positions. */
function boundWindow<Entity extends IdentifiedEntity>(
  query: ConnectionQuery<Entity>,
  bounds: { after: CursorPosition | null; before: CursorPosition | null },
): QueryBuilder<Entity> {
  const builder = query.filter();
  const row = `(${query.sortKey}, ${builder.alias}.id)`;

  if (bounds.after !== null) {
    builder.andWhere(`${row} > (:paginationAfterKey, :paginationAfterId)`, {
      paginationAfterId: bounds.after.id,
      paginationAfterKey: bounds.after.key,
    });
  }
  if (bounds.before !== null) {
    builder.andWhere(`${row} < (:paginationBeforeKey, :paginationBeforeId)`, {
      paginationBeforeId: bounds.before.id,
      paginationBeforeKey: bounds.before.key,
    });
  }

  return builder;
}

/**
 * Resolves a cursor to the sort key of the row it names within the filtered
 * set, or null when it is absent, malformed, or names no such row.
 */
async function findCursorPosition<Entity extends IdentifiedEntity>(
  query: ConnectionQuery<Entity>,
  cursor: null | string | undefined,
): Promise<CursorPosition | null> {
  const id = fromCursorSafe<null | { id?: unknown }>(cursor)?.id;
  if (
    typeof id !== "string" ||
    !ENTITY_ID_PATTERN.test(id) ||
    toCursor({ id }) !== cursor
  ) {
    return null;
  }

  const builder = query.filter();
  const row = await builder
    .select(query.sortKey, "key")
    .andWhere(`${builder.alias}.id = :paginationCursorId`, {
      paginationCursorId: id,
    })
    .getRawOne<{ key: unknown }>();

  return row === undefined ? null : { id, key: row.key };
}

/**
 * Reads the ids of the window's rows in order, at most one past the page: from
 * the front for `first`, or from the back for `last` alone.
 */
async function findWindowIds<Entity extends IdentifiedEntity>(
  query: ConnectionQuery<Entity>,
  bounds: { after: CursorPosition | null; before: CursorPosition | null },
  limits: PageLimits,
): Promise<string[]> {
  const fromBack = limits.first === null && limits.last !== null;
  const direction = fromBack ? "DESC" : "ASC";
  const limit = limits.first ?? limits.last;
  const builder = boundWindow(query, bounds);
  builder
    .select(`${builder.alias}.id`, "id")
    .orderBy(query.sortKey, direction)
    .addOrderBy(`${builder.alias}.id`, direction);
  if (limit !== null) {
    builder.limit(limit + 1);
  }

  const rows = await builder.getRawMany<{ id: string }>();
  const ids = rows.map((row) => row.id);
  return fromBack ? ids.toReversed() : ids;
}

/** Reports whether any filtered row sorts before a cursor's position. */
async function hasRowBefore<Entity extends IdentifiedEntity>(
  query: ConnectionQuery<Entity>,
  before: CursorPosition,
): Promise<boolean> {
  const builder = boundWindow(query, { after: null, before });
  const row = await builder
    .select(`${builder.alias}.id`, "id")
    .limit(1)
    .getRawOne<{ id: string }>();

  return row !== undefined;
}

/**
 * Loads a page's entities in chunks, so an unlimited page never binds more ids
 * than Postgres accepts in one statement, and returns them in the page's order.
 */
async function loadInOrder<Entity extends IdentifiedEntity>(
  query: ConnectionQuery<Entity>,
  ids: string[],
): Promise<Entity[]> {
  if (ids.length === 0) {
    return [];
  }

  const chunks: string[][] = [];
  for (let start = 0; start < ids.length; start += LOAD_CHUNK_SIZE) {
    chunks.push(ids.slice(start, start + LOAD_CHUNK_SIZE));
  }
  const loaded = await Promise.all(
    chunks.map(async (chunk) => query.load(chunk)),
  );
  const byId = new Map(loaded.flat().map((entity) => [entity.id, entity]));
  return ids.flatMap((id) => {
    const entity = byId.get(id);
    return entity === undefined ? [] : [entity];
  });
}

/** Reads a page count, treating an absent or negative count as no limit. */
function readCount(count: null | number | undefined): null | number {
  return typeof count === "number" && count >= 0 ? count : null;
}
