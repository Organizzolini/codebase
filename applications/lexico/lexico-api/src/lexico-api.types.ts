import type { PageInfo } from "./lexico-api.entities";

/**
 * Constructor type for class references.
 */
export type ClassConstructor<T> = abstract new (...arguments_: never[]) => T;

/**
 * Generic Relay Connection interface.
 */
export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number;
}

/**
 * Generic Relay Edge interface.
 */
export interface Edge<T> {
  cursor: string;
  node: T;
}

/**
 * Parameters for finding index bounds for array pagination.
 */
export interface PaginationBoundsParameters<T> {
  after?: null | string | undefined;
  before?: null | string | undefined;
  getCursor: (item: T) => string;
}
