// 🏷️ Types

import type { Repository } from "@codebase/lexico-entities";

/**
 * The `Author` column the API does not expose: its unstructured ingestion
 * metadata.
 */
export type AuthorDatabaseOnlyField = "metadata";

/**
 * The `Author` relation a resolver exposes instead of the object: its texts,
 * which `AuthorsResolver` loads in title order.
 */
export type AuthorResolvedField = "texts";

/**
 * A filtered entity query that Relay pagination pushes its ordering, cursor
 * bounds, and limits into, so only one page of rows is ever read.
 */
export interface ConnectionQuery<Entity extends IdentifiedEntity> {
  /** Builds a fresh query holding only the connection's filters, with no joins. */
  readonly filter: () => QueryBuilder<Entity>;
  /** Loads one page's entities by id, with the relations the connection exposes. */
  readonly load: (ids: string[]) => Promise<Entity[]>;
  /** The column ordered by before the id tiebreaker, such as `line.index`. */
  readonly sortKey: string;
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
 * which `LinesResolver` loads in index order.
 */
export type LineResolvedField = "tokens";

/** The counts a page is cut to, with absent and negative counts read as no limit. */
export interface PageLimits {
  readonly first: null | number;
  readonly last: null | number;
}

/** The select query builder a repository of this entity creates. */
export type QueryBuilder<Entity extends IdentifiedEntity> = ReturnType<
  Repository<Entity>["createQueryBuilder"]
>;

/**
 * The `Text` column the API does not expose: its unstructured ingestion
 * metadata.
 */
export type TextDatabaseOnlyField = "metadata";

/** The `Text` relations the API exposes, each as its own GraphQL type. */
export type TextRelationField = "author" | "childTexts" | "parentText";

/**
 * The `Text` relation a resolver exposes instead of the object: its lines,
 * which `TextsResolver` loads in index order.
 */
export type TextResolvedField = "lines";

/** The `Token` relations the API exposes, each as its own GraphQL type. */
export type TokenRelationField = "author" | "line" | "text" | "word";
