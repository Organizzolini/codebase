import { createEdge, toCursor } from "../src/lexico-api.utilities";

import type { Connection, Edge } from "../src/lexico-api.types";

/** Plain Relay arguments, so matrix entries can be spread and combined. */
export interface PageRequest {
  readonly after?: string;
  readonly before?: string;
  readonly first?: number;
  readonly last?: number;
}

/** The observable shape of one Relay page, independent of entity hydration. */
export interface PageSummary {
  readonly endCursor: string | undefined;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly ids: readonly string[];
  readonly startCursor: string | undefined;
  readonly totalCount: number;
}

/**
 * Page counts covering `first`, `last`, both together, zero, and the negative
 * counts the original slicing read as no limit.
 */
const FULL_LIMITS: readonly PageRequest[] = [
  {},
  { first: 0 },
  { first: 2 },
  { first: -1 },
  { last: 0 },
  { last: 2 },
  { last: -1 },
  { first: 2, last: 1 },
];

/** The counts a quick matrix keeps: none, `first`, and `last`. */
const QUICK_LIMITS: readonly PageRequest[] = [{}, { first: 2 }, { last: 2 }];

/** How a matrix is built: its cursor encoding, and whether to keep it quick. */
export interface MatrixOptions {
  /** Encodes the cursor a connection hands out for an id; `{ id }` by default. */
  readonly cursorOf?: (id: string) => string;
  /** Keeps only the middle member, the outsider, and one pair. */
  readonly quick?: boolean;
}

/**
 * Parameters for finding index bounds for array pagination.
 */
interface PaginationBoundsParameters<T> {
  after?: null | string | undefined;
  before?: null | string | undefined;
  getCursor: (item: T) => string;
}

/**
 * The page the original in-memory slicing produced for these arguments, used
 * as the oracle the SQL pagination must agree with on every boundary.
 */
export function expectedPage(
  ids: readonly string[],
  request: PageRequest,
  cursorOf: (id: string) => string = toIdCursor,
): PageSummary {
  const page = paginateArray(
    ids.map((id) => ({ id })),
    { ...request, getCursor: (item) => cursorOf(item.id) },
  );

  return {
    endCursor: page.edges.at(-1)?.cursor,
    hasNextPage: page.hasNextPage,
    hasPreviousPage: page.hasPreviousPage,
    ids: page.edges.map((edge) => edge.node.id),
    startCursor: page.edges[0]?.cursor,
    totalCount: ids.length,
  };
}

/**
 * Slices an array of items according to forward (first, after) and backward
 * (last, before) Relay pagination parameters: how every connection paged
 * before paging moved into SQL, kept here as the oracle SQL paging must agree
 * with on every boundary.
 */
export function paginateArray<T>(
  items: T[],
  parameters: {
    after?: null | string | undefined;
    before?: null | string | undefined;
    first?: null | number | undefined;
    getCursor: (item: T) => string;
    last?: null | number | undefined;
  },
): {
  edges: Edge<T>[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} {
  const { endIndex, startIndex } = getPaginationBounds(items, parameters);
  const sliced = items.slice(startIndex, endIndex);
  const { hasNext, hasPrevious, result } = sliceWithLimits(sliced, parameters);

  return {
    edges: result.map((item) => createEdge(item, parameters.getCursor(item))),
    hasNextPage: endIndex < items.length || hasNext,
    hasPreviousPage: startIndex > 0 || hasPrevious,
  };
}

/**
 * Cursor and count combinations worth pinning: the first, a middle, and the
 * last member, a row outside the filtered set, an undecodable cursor, and two
 * non-canonical encodings of a member, each as `after` and as `before`, plus
 * ordered, equal, and crossed pairs of both. A quick matrix keeps only the
 * middle member, the outsider, and one pair.
 */
export function paginationMatrix(
  ids: readonly string[],
  outsiderId: string,
  options: MatrixOptions = {},
): PageRequest[] {
  const { quick = false } = options;
  const encode = options.cursorOf ?? toIdCursor;
  const cursorOf = (id: string | undefined): string =>
    id === undefined ? toCursor({ id }) : encode(id);
  const head = cursorOf(ids[0]);
  const middleId = ids[Math.floor(ids.length / 2)] ?? "";
  const middle = cursorOf(middleId);
  const tail = cursorOf(ids.at(-1));
  const outsider = cursorOf(outsiderId);
  const cursors = quick
    ? [middle, outsider]
    : [
        "not-a-cursor",
        outsider,
        toCursor({ id: middleId.toUpperCase() }),
        toCursor({ extra: 1, id: middleId }),
        head,
        middle,
        tail,
      ];
  const pairs: PageRequest[] = quick
    ? [{ after: head, before: tail }]
    : [
        { after: head, before: tail },
        { after: middle, before: middle },
        { after: tail, before: head },
        { after: head, before: head },
      ];
  const bounds: PageRequest[] = [
    {},
    ...cursors.map((after) => ({ after })),
    ...cursors.map((before) => ({ before })),
    ...pairs,
  ];
  const limits = quick ? QUICK_LIMITS : FULL_LIMITS;

  return bounds.flatMap((bound) =>
    limits.map((limit) => ({ ...bound, ...limit })),
  );
}

/** Reduces a connection to what a GraphQL client can observe of it. */
export function summarize(connection: Connection<{ id: string }>): PageSummary {
  return {
    endCursor: connection.pageInfo.endCursor,
    hasNextPage: connection.pageInfo.hasNextPage,
    hasPreviousPage: connection.pageInfo.hasPreviousPage,
    ids: connection.edges.map((edge) => edge.node.id),
    startCursor: connection.pageInfo.startCursor,
    totalCount: connection.totalCount,
  };
}

/**
 * Computes start and end slice indices based on after and before cursors.
 */
function getPaginationBounds<T>(
  items: T[],
  parameters: PaginationBoundsParameters<T>,
): { endIndex: number; startIndex: number } {
  let startIndex = 0;
  let endIndex = items.length;

  if (parameters.after) {
    const afterIndex = items.findIndex(
      (item) => parameters.getCursor(item) === parameters.after,
    );
    if (afterIndex !== -1) {
      startIndex = afterIndex + 1;
    }
  }

  if (parameters.before) {
    const beforeIndex = items.findIndex(
      (item) => parameters.getCursor(item) === parameters.before,
    );
    if (beforeIndex !== -1) {
      endIndex = beforeIndex;
    }
  }

  return { endIndex, startIndex: Math.min(startIndex, endIndex) };
}

/**
 * Slices a sub-array based on first and last count limits.
 */
function sliceWithLimits<T>(
  items: T[],
  limits: {
    first?: null | number | undefined;
    last?: null | number | undefined;
  },
): { hasNext: boolean; hasPrevious: boolean; result: T[] } {
  let result = items;
  let hasNext = false;
  let hasPrevious = false;

  if (
    typeof limits.first === "number" &&
    limits.first >= 0 &&
    result.length > limits.first
  ) {
    result = result.slice(0, limits.first);
    hasNext = true;
  }

  if (
    typeof limits.last === "number" &&
    limits.last >= 0 &&
    result.length > limits.last
  ) {
    result = result.slice(result.length - limits.last);
    hasPrevious = true;
  }

  return { hasNext, hasPrevious, result };
}

/** The cursor every entity connection hands out: its id alone. */
function toIdCursor(id: string): string {
  return toCursor({ id });
}
