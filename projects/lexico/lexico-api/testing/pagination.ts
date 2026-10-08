import { paginateArray, toCursor } from "../src/lexico-api.utilities";

import type { Connection } from "../src/lexico-api.types";

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

/**
 * The page the original in-memory slicing produced for these arguments, used
 * as the oracle the SQL pagination must agree with on every boundary.
 */
export function expectedPage(
  ids: readonly string[],
  request: PageRequest,
): PageSummary {
  const page = paginateArray(
    ids.map((id) => ({ id })),
    { ...request, getCursor: (item) => toCursor({ id: item.id }) },
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
 * Cursor and count combinations worth pinning: the first, a middle, and the
 * last member, a row outside the filtered set, an undecodable cursor, and two
 * non-canonical encodings of a member, each as `after` and as `before`, plus
 * ordered, equal, and crossed pairs of both. A quick matrix keeps only the
 * middle member, the outsider, and one pair.
 */
export function paginationMatrix(
  ids: readonly string[],
  outsiderId: string,
  quick = false,
): PageRequest[] {
  const cursorOf = (id: string | undefined): string => toCursor({ id });
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
        cursorOf(middleId.toUpperCase()),
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
