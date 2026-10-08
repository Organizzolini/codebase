// 🏷️ Types

import type { PaginationArguments } from "../search/pagination-arguments.entities";
import type { Repository } from "@codebase/lexico-entities";

/**
 * The `Author` column the API does not expose: its unstructured ingestion
 * metadata.
 */
export type AuthorDatabaseOnlyField = "metadata";

/**
 * The `Author` relation a resolver exposes instead of the object: its texts,
 * which `AuthorsResolver` pages in title order.
 */
export type AuthorResolvedField = "texts";

/**
 * How a connection's cursors are written, and read back into the row each
 * names, so a cursor the connection never handed out is ignored.
 */
export interface ConnectionCursor {
  /**
   * Reads the row a cursor claims to name — its id, and its sort key when the
   * cursor carries one — or null when it is not a cursor this connection
   * hands out.
   */
  readonly decode: (cursor: string) => CursorClaim | null;
  /** Writes the cursor of the row at a position. */
  readonly encode: (position: CursorPosition) => string;
}

/**
 * A filtered entity query that Relay pagination pushes its ordering, cursor
 * bounds, and limits into, so only one page of rows is ever read. The rows
 * filtered are `Row`s, and the page's nodes the `Node`s loaded for them, which
 * are the same entity unless a connection pages something built from rows.
 */
export interface ConnectionQuery<
  Node extends IdentifiedEntity,
  Row extends IdentifiedEntity = Node,
> {
  /** How the connection's cursors are read and written; `{ id }` when absent. */
  readonly cursor?: ConnectionCursor;
  /** Builds a fresh query holding only the connection's filters, with no joins. */
  readonly filter: () => QueryBuilder<Row>;
  /**
   * Loads one page's nodes by id, with the relations the connection exposes,
   * given each row's sort key.
   */
  readonly load: (
    ids: string[],
    keys: ReadonlyMap<string, unknown>,
  ) => Promise<Node[]>;
  /** The expression ordered by before the id tiebreaker, such as `line.index`. */
  readonly sortKey: string;
}

/**
 * One parent's page of children asked for through a batched relation
 * connection, such as one line's `tokens(first: 20)`.
 */
export interface ConnectionRequest {
  readonly pagination: PaginationArguments;
  readonly parentId: string;
}

/**
 * The row a cursor claims to name: its id, and the sort key that row must
 * still have when the cursor carries one.
 */
export interface CursorClaim {
  readonly id: string;
  readonly key?: unknown;
}

/** The sort key and id of the row a cursor names, which bound a page's window. */
export interface CursorPosition {
  readonly id: string;
  readonly key: unknown;
}

/** An entity row with the string id every Relay cursor encodes. */
export interface IdentifiedEntity {
  id: string;
}

/** The `Line` relations the API exposes, each as its own GraphQL type. */
export type LineRelationField = "author" | "text";

/**
 * The `Line` relation a resolver exposes instead of the object: its tokens,
 * which `LinesResolver` pages in index order.
 */
export type LineResolvedField = "tokens";

/** The counts a page is cut to, with absent and negative counts read as no limit. */
export interface PageLimits {
  readonly first: null | number;
  readonly last: null | number;
}

/**
 * What one statement reads of a filtered query for a page: the rows it
 * counts, the rows the cursors name, whether any row precedes the `before`
 * cursor's, and the window between them, at most one row past the page.
 */
export interface PageRead {
  readonly after: CursorPosition | null;
  readonly before: CursorPosition | null;
  readonly hasRowBefore: boolean;
  readonly totalCount: number;
  readonly window: CursorPosition[];
}

/** The one row the page statement returns, as the driver hands it back. */
export interface PageReadRow {
  readonly after: CursorPosition | null;
  readonly before: CursorPosition | null;
  readonly hasRowBefore: boolean;
  readonly totalCount: number | string;
  readonly window: CursorPosition[];
}

/** The cursors of one partitioned page, each naming a row of one parent. */
export interface PartitionBounds {
  readonly after: null | PartitionedCursorPosition;
  readonly before: null | PartitionedCursorPosition;
}

/**
 * One parent's row counts in a partitioned connection: every child, the
 * children between the cursors, and the children before the `before` cursor.
 */
export interface PartitionCounts {
  readonly beforeCount: number;
  readonly totalCount: number;
  readonly windowCount: number;
}

/**
 * The children of many parents at once, such as the tokens of every line on a
 * reader page, which Relay pagination pages within each parent in a fixed
 * number of statements however many parents and children there are.
 */
export interface PartitionedConnectionQuery<Entity extends IdentifiedEntity> {
  /** The alias the column names below are written against, such as `token`. */
  readonly alias: string;
  /**
   * Builds a fresh query under `alias` joining every relation the connection
   * exposes, which the page's rows are then selected through.
   */
  readonly load: () => QueryBuilder<Entity>;
  /** The column naming each row's parent, such as `token.line_id`. */
  readonly parentKey: string;
  /** Reads the id of the parent a loaded row belongs to. */
  readonly parentOf: (entity: Entity) => string | undefined;
  /** The repository the rows are counted and windowed in. */
  readonly repository: Repository<Entity>;
  /** The column ordered by before the id tiebreaker, such as `token.index`. */
  readonly sortKey: string;
}

/** The row a cursor names in a partitioned connection, and its parent. */
export interface PartitionedCursorPosition extends CursorPosition {
  readonly parentId: string;
}

/** The select query builder a repository of this entity creates. */
export type QueryBuilder<Entity extends IdentifiedEntity> = ReturnType<
  Repository<Entity>["createQueryBuilder"]
>;

/** A SQL condition and the parameters it binds. */
export interface SqlCondition {
  readonly parameters: Record<string, unknown>;
  readonly sql: string;
}

/**
 * The `Text` column the API does not expose: its unstructured ingestion
 * metadata.
 */
export type TextDatabaseOnlyField = "metadata";

/** The `Text` relations the API exposes, each as its own GraphQL type. */
export type TextRelationField = "author" | "parentText";

/**
 * The `Text` relations a resolver exposes instead of the object: its child
 * texts, which `TextsResolver` pages in title order, and its lines, which it
 * pages in index order.
 */
export type TextResolvedField = "childTexts" | "lines";

/** The `Token` relations the API exposes, each as its own GraphQL type. */
export type TokenRelationField = "author" | "line" | "text" | "word";
