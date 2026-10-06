import { expect } from "vitest";

/** Fetches one page of a fixed search, so pages can be walked. */
export type FetchLiteratureSearchPage = (
  pagination: LiteratureSearchPageArguments,
) => Promise<LiteratureSearchPage>;

/**
 * The parts of a Relay connection every literature search returns, whether
 * read from the service or from a GraphQL response, where an absent cursor
 * arrives as `null` rather than `undefined`.
 */
export interface LiteratureSearchPage {
  readonly edges: readonly {
    readonly cursor: string;
    readonly node: { readonly id: string };
  }[];
  readonly pageInfo: {
    readonly endCursor?: null | string | undefined;
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
    readonly startCursor?: null | string | undefined;
  };
  readonly totalCount: number;
}

/** The Relay page arguments a literature search accepts. */
export interface LiteratureSearchPageArguments {
  readonly after?: string;
  readonly before?: string;
  readonly first?: number;
  readonly last?: number;
}

/**
 * Asserts the Relay invariants of one search: walking it forward with
 * `first`/`after`, or backward with `last`/`before`, visits every result of
 * the unpaginated search exactly once and in the same order, every page
 * reports the same `totalCount`, and only the ends report no further page.
 * Returns the unpaginated ids so a test can assert what was matched.
 */
export async function expectLiteratureSearchPagination(
  fetchPage: FetchLiteratureSearchPage,
  pageSize: number,
): Promise<string[]> {
  const everything = await fetchPage({});
  const ids = pageIds(everything);

  expect(everything.totalCount).toBe(ids.length);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.length).toBeGreaterThan(pageSize);
  expect(everything.pageInfo).toMatchObject({
    hasNextPage: false,
    hasPreviousPage: false,
  });

  await expect(
    walkForward(fetchPage, pageSize, ids.length),
  ).resolves.toStrictEqual(ids);
  await expect(
    walkBackward(fetchPage, pageSize, ids.length),
  ).resolves.toStrictEqual(ids);

  return ids;
}

/** Checks the cursors and size every page must carry, whichever way it was walked. */
function expectPageShape(
  page: LiteratureSearchPage,
  pageSize: number,
  totalCount: number,
): void {
  expect(page.totalCount).toBe(totalCount);
  expect(page.edges.length).toBeGreaterThan(0);
  expect(page.edges.length).toBeLessThanOrEqual(pageSize);
  expect(page.pageInfo.startCursor).toBe(page.edges[0]?.cursor);
  expect(page.pageInfo.endCursor).toBe(page.edges.at(-1)?.cursor);
}

/** Lists a page's node ids in edge order. */
function pageIds(page: LiteratureSearchPage): string[] {
  return page.edges.map((edge) => edge.node.id);
}

/** Walks `last`/`before` pages from the end until no previous page remains. */
async function walkBackward(
  fetchPage: FetchLiteratureSearchPage,
  pageSize: number,
  totalCount: number,
): Promise<string[]> {
  const ids: string[] = [];
  let before: string | undefined;
  for (let pageNumber = 0; pageNumber <= totalCount; pageNumber++) {
    const page = await fetchPage(
      before === undefined ? { last: pageSize } : { before, last: pageSize },
    );
    expectPageShape(page, pageSize, totalCount);
    if (pageNumber === 0) expect(page.pageInfo.hasNextPage).toBe(false);
    ids.unshift(...pageIds(page));
    if (!page.pageInfo.hasPreviousPage) return ids;
    before = page.pageInfo.startCursor ?? undefined;
  }
  throw new Error("Backward pagination never reported a first page");
}

/** Walks `first`/`after` pages from the start until no next page remains. */
async function walkForward(
  fetchPage: FetchLiteratureSearchPage,
  pageSize: number,
  totalCount: number,
): Promise<string[]> {
  const ids: string[] = [];
  let after: string | undefined;
  for (let pageNumber = 0; pageNumber <= totalCount; pageNumber++) {
    const page = await fetchPage(
      after === undefined ? { first: pageSize } : { after, first: pageSize },
    );
    expectPageShape(page, pageSize, totalCount);
    if (pageNumber === 0) expect(page.pageInfo.hasPreviousPage).toBe(false);
    ids.push(...pageIds(page));
    if (!page.pageInfo.hasNextPage) return ids;
    after = page.pageInfo.endCursor ?? undefined;
  }
  throw new Error("Forward pagination never reported a last page");
}
