import {
  createConnection,
  createEdge,
  fromCursorSafe,
  mapNullableRelation,
  mapRelation,
  toCursor,
  toDeletableFields,
} from "../../lexico-api.utilities";
import { toWordType } from "../words/words.utilities";

import { AuthorType } from "./author.entities";
import { LineType } from "./line.entities";
import { ENTITY_ID_PATTERN, LOAD_CHUNK_SIZE } from "./literature.constants";
import { TextType } from "./text.entities";
import { TokenType } from "./token.entities";

import type { Connection, MappedFields } from "../../lexico-api.types";
import type { PaginationArguments } from "../search/pagination-arguments.entities";
import type {
  ConnectionQuery,
  CursorClaim,
  CursorPosition,
  IdentifiedEntity,
  LineRelationField,
  PageLimits,
  PageRead,
  PageReadRow,
  SqlCondition,
  TextRelationField,
  TokenRelationField,
} from "./literature.types";
import type { Author, Line, Text, Token } from "@codebase/lexico-entities";

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
export async function paginateQuery<
  Node extends IdentifiedEntity,
  Row extends IdentifiedEntity = Node,
>(
  query: ConnectionQuery<Node, Row>,
  pagination: PaginationArguments = {},
): Promise<Connection<Node>> {
  const limits: PageLimits = {
    first: readCount(pagination.first),
    last: readCount(pagination.last),
  };
  const read = await readPage(query, {
    after: decodeCursor(query, pagination.after),
    before: decodeCursor(query, pagination.before),
    limits,
  });
  const page = slicePage(read.window, limits);
  const nodes = await loadInOrder(query, page.ids);
  const keys = new Map(page.ids.map((position) => [position.id, position.key]));
  const startsAfterFirstRow =
    read.after !== null && (read.before === null || read.hasRowBefore);

  return createConnection<Node>({
    edges: nodes.map((node) =>
      createEdge(
        node,
        encodeCursor(query, { id: node.id, key: keys.get(node.id) }),
      ),
    ),
    hasNextPage: read.before !== null || page.hasNext,
    hasPreviousPage: page.hasPrevious || startsAfterFirstRow,
    totalCount: read.totalCount,
  });
}

/** Reads a page count, treating an absent or negative count as no limit. */
export function readCount(count: null | number | undefined): null | number {
  return typeof count === "number" && count >= 0 ? count : null;
}

/**
 * Reads the entity id a cursor names, or null when it is absent, malformed,
 * or not the canonical encoding of that id, which no page ever hands out.
 */
export function readCursorId(cursor: null | string | undefined): null | string {
  const id = fromCursorSafe<null | { id?: unknown }>(cursor)?.id;
  return typeof id === "string" &&
    ENTITY_ID_PATTERN.test(id) &&
    toCursor({ id }) === cursor
    ? id
    : null;
}

/**
 * Cuts a window's ids to `first` and then to `last`, flagging each cut, the
 * same way the original in-memory slicing did.
 */
export function slicePage<Item>(
  ids: readonly Item[],
  limits: PageLimits,
): { hasNext: boolean; hasPrevious: boolean; ids: Item[] } {
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

/** Maps an author to its GraphQL type. */
export function toAuthorType(author: Author): AuthorType {
  return Object.assign(new AuthorType(), {
    ...toDeletableFields(author),
    name: author.name,
    slug: author.slug,
  } satisfies MappedFields<AuthorType>);
}

/** Maps a line, and each relation it loaded, to its GraphQL type. */
export function toLineType(line: Line): LineType {
  return Object.assign(new LineType(), {
    ...toDeletableFields(line),
    author: mapRelation(line.author, toAuthorType),
    data: line.data,
    index: line.index,
    label: line.label,
    text: mapRelation(line.text, toTextType),
  } satisfies MappedFields<LineType, LineRelationField>);
}

/** Maps a text, and each relation it loaded, to its GraphQL type. */
export function toTextType(text: Text): TextType {
  return Object.assign(new TextType(), {
    ...toDeletableFields(text),
    author: mapRelation(text.author, toAuthorType),
    parentText: mapNullableRelation(text.parentText, toTextType),
    slug: text.slug,
    title: text.title,
    type: text.type,
  } satisfies MappedFields<TextType, TextRelationField>);
}

/** Maps a token, and each relation it loaded, to its GraphQL type. */
export function toTokenType(token: Token): TokenType {
  return Object.assign(new TokenType(), {
    ...toDeletableFields(token),
    author: mapRelation(token.author, toAuthorType),
    data: token.data,
    index: token.index,
    isPunctuation: token.isPunctuation,
    line: mapRelation(token.line, toLineType),
    text: mapRelation(token.text, toTextType),
    word: mapNullableRelation(token.word, toWordType),
  } satisfies MappedFields<TokenType, TokenRelationField>);
}

/**
 * Reads the row a cursor claims to name, or null when the cursor is absent or
 * not one the connection hands out.
 */
function decodeCursor<
  Node extends IdentifiedEntity,
  Row extends IdentifiedEntity,
>(
  query: ConnectionQuery<Node, Row>,
  cursor: null | string | undefined,
): CursorClaim | null {
  if (query.cursor === undefined) {
    const id = readCursorId(cursor);
    return id === null ? null : { id };
  }
  return typeof cursor === "string" ? query.cursor.decode(cursor) : null;
}

/** Encodes the cursor a connection hands out for the row at a position. */
function encodeCursor<
  Node extends IdentifiedEntity,
  Row extends IdentifiedEntity,
>(query: ConnectionQuery<Node, Row>, position: CursorPosition): string {
  return query.cursor === undefined
    ? toCursor({ id: position.id })
    : query.cursor.encode(position);
}

/**
 * Loads a page's entities in chunks, so an unlimited page never binds more ids
 * than Postgres accepts in one statement, and returns them in the page's order.
 */
async function loadInOrder<
  Node extends IdentifiedEntity,
  Row extends IdentifiedEntity,
>(
  query: ConnectionQuery<Node, Row>,
  positions: readonly CursorPosition[],
): Promise<Node[]> {
  if (positions.length === 0) {
    return [];
  }

  const chunks: CursorPosition[][] = [];
  for (let start = 0; start < positions.length; start += LOAD_CHUNK_SIZE) {
    chunks.push(positions.slice(start, start + LOAD_CHUNK_SIZE));
  }
  const loaded = await Promise.all(
    chunks.map(async (chunk) =>
      query.load(
        chunk.map((position) => position.id),
        new Map(chunk.map((position) => [position.id, position.key])),
      ),
    ),
  );
  const byId = new Map(loaded.flat().map((node) => [node.id, node]));
  return positions.flatMap((position) => {
    const node = byId.get(position.id);
    return node === undefined ? [] : [node];
  });
}

/**
 * Reads everything a page needs of a filtered query in one statement, so the
 * filter — which may rank every match — runs once: the filtered rows are
 * materialized, and their count, the rows the cursors name, whether a row
 * precedes the `before` cursor's, and the window between the cursors, at
 * most one row past the page, are all read from them. The window is read from
 * the front for `first`, or from the back for `last` alone.
 */
async function readPage<
  Node extends IdentifiedEntity,
  Row extends IdentifiedEntity,
>(
  query: ConnectionQuery<Node, Row>,
  page: {
    readonly after: CursorClaim | null;
    readonly before: CursorClaim | null;
    readonly limits: PageLimits;
  },
): Promise<PageRead> {
  const { limits } = page;
  const builder = query.filter();
  const filtered = builder
    .select(`${builder.alias}.id`, "id")
    .addSelect(query.sortKey, "key");
  const after = selectClaimedRow("after", page.after);
  const before = selectClaimedRow("before", page.before);
  const fromBack = limits.first === null && limits.last !== null;
  const direction = fromBack ? "DESC" : "ASC";
  const limit = limits.first ?? limits.last;
  const statement = [
    `WITH "filtered" AS MATERIALIZED (${filtered.getQuery()}),`,
    `"after" AS (${after.sql}),`,
    `"before" AS (${before.sql})`,
    `SELECT (SELECT COUNT(*) FROM "filtered") AS "totalCount",`,
    `(SELECT json_build_object('id', "id", 'key', "key") FROM "after") AS "after",`,
    `(SELECT json_build_object('id', "id", 'key', "key") FROM "before") AS "before",`,
    `EXISTS (SELECT 1 FROM "filtered" WHERE ("key", "id") < (SELECT "key", "id" FROM "before")) AS "hasRowBefore",`,
    `(SELECT COALESCE(json_agg(json_build_object('id', "page"."id", 'key', "page"."key") ORDER BY "page"."key" ${direction}, "page"."id" ${direction}), '[]'::json)`,
    `FROM (SELECT "id", "key" FROM "filtered"`,
    `WHERE (NOT EXISTS (SELECT 1 FROM "after") OR ("key", "id") > (SELECT "key", "id" FROM "after"))`,
    `AND (NOT EXISTS (SELECT 1 FROM "before") OR ("key", "id") < (SELECT "key", "id" FROM "before"))`,
    `ORDER BY "key" ${direction}, "id" ${direction}${limit === null ? "" : ` LIMIT ${String(limit + 1)}`}) "page") AS "window"`,
  ].join(" ");
  const [sql, parameters]: [string, unknown[]] =
    builder.dataSource.driver.escapeQueryWithParameters(statement, {
      ...filtered.getParameters(),
      ...after.parameters,
      ...before.parameters,
    });
  const [row] = await builder.dataSource.query<PageReadRow[]>(sql, parameters);

  return {
    after: row?.after ?? null,
    before: row?.before ?? null,
    hasRowBefore: row?.hasRowBefore ?? false,
    totalCount: Number(row?.totalCount ?? 0),
    window: fromBack ? (row?.window ?? []).toReversed() : (row?.window ?? []),
  };
}

/**
 * Selects the filtered row a cursor claims, as a common table expression
 * holding that row or none: a row with the claimed id and, when the cursor
 * carries one, the claimed sort key.
 */
function selectClaimedRow(
  name: "after" | "before",
  claim: CursorClaim | null,
): SqlCondition {
  if (claim === null) {
    return {
      parameters: {},
      sql: `SELECT "id", "key" FROM "filtered" WHERE FALSE`,
    };
  }

  const keyed = "key" in claim;
  return {
    parameters: {
      [`${name}CursorId`]: claim.id,
      [`${name}CursorKey`]: claim.key,
    },
    sql: `SELECT "id", "key" FROM "filtered" WHERE "id" = :${name}CursorId${keyed ? ` AND "key" = :${name}CursorKey` : ""}`,
  };
}
