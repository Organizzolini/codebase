/** The parts of a Relay connection page a walk reads. */
export interface ConnectionPage<Node> {
  readonly edges: readonly { readonly cursor: string; readonly node: Node }[];
  readonly pageInfo: {
    readonly endCursor?: null | string | undefined;
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
    readonly startCursor?: null | string | undefined;
  };
  readonly totalCount: number;
}

/** Fetches the page next to a cursor, or the first page when there is none. */
export type FetchPage<Node> = (
  cursor: null | string,
) => Promise<ConnectionPage<Node>>;

/** A walk stops here rather than looping on a connection that never ends. */
const MAXIMUM_PAGES = 32;

/** Every node a list of pages holds, in page order then edge order. */
export function nodesOf<Node>(pages: readonly ConnectionPage<Node>[]): Node[] {
  return pages.flatMap((page) => page.edges.map((edge) => edge.node));
}

/**
 * Follows `startCursor` from the last page until `hasPreviousPage` is false,
 * returning every page in the order it was fetched — last page first.
 */
export async function walkBackward<Node>(
  fetchPage: FetchPage<Node>,
): Promise<ConnectionPage<Node>[]> {
  const pages: ConnectionPage<Node>[] = [];
  let cursor: null | string = null;

  do {
    const page = await fetchPage(cursor);
    pages.push(page);
    cursor = page.pageInfo.hasPreviousPage
      ? (page.pageInfo.startCursor ?? null)
      : null;
  } while (cursor !== null && pages.length < MAXIMUM_PAGES);

  return pages;
}

/**
 * Follows `endCursor` from the first page until `hasNextPage` is false,
 * returning every page in the order it was fetched.
 */
export async function walkForward<Node>(
  fetchPage: FetchPage<Node>,
): Promise<ConnectionPage<Node>[]> {
  const pages: ConnectionPage<Node>[] = [];
  let cursor: null | string = null;

  do {
    const page = await fetchPage(cursor);
    pages.push(page);
    cursor = page.pageInfo.hasNextPage
      ? (page.pageInfo.endCursor ?? null)
      : null;
  } while (cursor !== null && pages.length < MAXIMUM_PAGES);

  return pages;
}
