/* cspell:words Troiae */

import { DataSource } from "typeorm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { DATABASE_TIMEOUT_MILLISECONDS } from "../../../testing/database";
import {
  type ReadingApplication,
  startReadingApplication,
} from "../../../testing/reading-application";
import { PASSAGE_TOKENS } from "../../../testing/reading-passage";

/** A line as the reader query below selects one. */
interface ReaderLine {
  readonly data: string;
  readonly index: number;
  readonly label: string;
  readonly tokens: {
    readonly edges: readonly { readonly node: ReaderToken }[];
    readonly pageInfo: {
      readonly endCursor: null | string;
      readonly hasNextPage: boolean;
      readonly hasPreviousPage: boolean;
    };
    readonly totalCount: number;
  };
}

/** A page of the reader query's `lines` connection. */
interface ReaderPage {
  readonly edges: readonly { readonly node: ReaderLine }[];
  readonly pageInfo: {
    readonly endCursor: null | string;
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
  };
  readonly totalCount: number;
}

/** A token as the reader query below selects one. */
interface ReaderToken {
  readonly data: string;
  readonly index: number;
  readonly isPunctuation: boolean;
  readonly word: null | { readonly data: string; readonly id: string };
}

/**
 * Reads a passage the way the reader does: a page of lines, a page of each
 * line's tokens, and the word each token resolves to.
 */
const READER = `
  query Reader(
    $textId: ID!
    $range: LinesRangeInput
    $first: Int
    $after: String
    $tokensFirst: Int
    $tokensAfter: String
  ) {
    lines(textId: $textId, range: $range, first: $first, after: $after) {
      totalCount
      pageInfo { endCursor hasNextPage hasPreviousPage }
      edges {
        node {
          index
          label
          data
          tokens(first: $tokensFirst, after: $tokensAfter) {
            totalCount
            pageInfo { endCursor hasNextPage hasPreviousPage }
            edges { node { index data isPunctuation word { id data } } }
          }
        }
      }
    }
  }
`;

/** Matches a statement reading from a table, not merely joining it. */
function readsFrom(table: string): RegExp {
  return new RegExp(String.raw`FROM ("\w+"\.)?"${table}"`, "u");
}

/** Reduces a reader page's tokens to what a reader sees of each one. */
function tokensOf(page: ReaderPage): unknown[] {
  return page.edges.map((edge) =>
    edge.node.tokens.edges.map(({ node: token }) => ({
      data: token.data,
      isPunctuation: token.isPunctuation,
      word: token.word?.data ?? null,
    })),
  );
}

/**
 * Executes the reader's `lines` → `tokens` → `word` query over HTTP against
 * the literature API and a real database, and counts the statements each
 * request issues.
 */
describe("lines resolver end-to-end suite", () => {
  let application: ReadingApplication;

  /** Executes an operation expected to succeed and returns its data. */
  async function query<Data>(
    document: string,
    variables: Record<string, unknown> = {},
  ): Promise<Data> {
    const body = await application.execute(document, {
      textId: application.passage.text.id,
      ...variables,
    });

    expect(body.errors).toBeUndefined();

    if (!body.data) {
      throw new Error("GraphQL returned no data");
    }
    return body.data as Data;
  }

  /** Executes the reader query and collects every SQL statement it issued. */
  async function readWithStatements(
    variables: Record<string, unknown>,
  ): Promise<{ page: ReaderPage; statements: string[] }> {
    const logQuery = vi.spyOn(
      application.server.get(DataSource).logger,
      "logQuery",
    );
    const { lines } = await query<{ lines: ReaderPage }>(READER, variables);
    const statements = logQuery.mock.calls.map(([statement]) => statement);
    logQuery.mockRestore();
    return { page: lines, statements };
  }

  beforeAll(async () => {
    application = await startReadingApplication();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await application.close();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  it("reads every line's tokens in order, resolving words and leaving markers wordless", async () => {
    expect.hasAssertions();

    const { lines } = await query<{ lines: ReaderPage }>(READER);

    expect(lines.totalCount).toBe(5);
    expect(lines.edges.map((edge) => edge.node.index)).toStrictEqual([
      0, 1, 2, 3, 4,
    ]);
    expect(lines.edges[0]?.node).toMatchObject({
      data: "arma virumque cano, Troiae qui primus ab oris",
      label: "1.1",
    });
    expect(tokensOf(lines)).toStrictEqual(PASSAGE_TOKENS);
    expect(
      lines.edges.map((edge) => edge.node.tokens.totalCount),
    ).toStrictEqual(PASSAGE_TOKENS.map((tokens) => tokens.length));
    expect(
      lines.edges.every((edge) =>
        edge.node.tokens.edges.every(
          ({ node: token }, position) => token.index === position,
        ),
      ),
    ).toBe(true);

    const et = lines.edges
      .flatMap((edge) => edge.node.tokens.edges.map(({ node }) => node))
      .filter((token) => token.data === "et");

    expect(et.length).toBeGreaterThan(1);
    expect(new Set(et.map((token) => token.word?.id)).size).toBe(1);
  });

  it("pages the reader query by range and opaque cursor", async () => {
    expect.hasAssertions();

    const range = { endIndex: 3, startIndex: 1 };
    const first = await query<{ lines: ReaderPage }>(READER, {
      first: 2,
      range,
    });
    const next = await query<{ lines: ReaderPage }>(READER, {
      after: first.lines.pageInfo.endCursor,
      first: 2,
      range,
    });

    expect(first.lines.edges.map((edge) => edge.node.index)).toStrictEqual([
      1, 2,
    ]);
    expect(first.lines).toMatchObject({
      pageInfo: { hasNextPage: true, hasPreviousPage: false },
      totalCount: 3,
    });
    expect(next.lines.edges.map((edge) => edge.node.index)).toStrictEqual([3]);
    expect(tokensOf(next.lines)).toStrictEqual([PASSAGE_TOKENS[3]]);
    expect(next.lines.pageInfo).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it("costs the same statements for one line as for every line, however many tokens", async () => {
    expect.hasAssertions();

    const one = await readWithStatements({ range: { endIndex: 0 } });
    const all = await readWithStatements({});
    const tokenReads = all.statements.filter((statement) =>
      readsFrom("tokens").test(statement),
    );

    expect(tokensOf(all.page)).toStrictEqual(PASSAGE_TOKENS);
    expect(PASSAGE_TOKENS.flat().length).toBeGreaterThan(50);
    expect(all.statements).toHaveLength(one.statements.length);
    expect(all.statements).toHaveLength(4);
    expect(tokenReads).toHaveLength(2);
    expect(
      all.statements.filter((statement) => readsFrom("words").test(statement)),
    ).toStrictEqual([]);
  });

  it("pages each line's tokens on its own, applying a token cursor only to its line", async () => {
    expect.hasAssertions();

    const first = await query<{ lines: ReaderPage }>(READER, {
      tokensFirst: 2,
    });
    const [opening] = first.lines.edges;
    const next = await query<{ lines: ReaderPage }>(READER, {
      tokensAfter: opening?.node.tokens.pageInfo.endCursor,
      tokensFirst: 2,
    });

    expect(tokensOf(first.lines)).toStrictEqual(
      PASSAGE_TOKENS.map((tokens) => tokens.slice(0, 2)),
    );
    expect(
      first.lines.edges.map((edge) => edge.node.tokens.pageInfo),
    ).toStrictEqual(
      PASSAGE_TOKENS.map(() =>
        expect.objectContaining({ hasNextPage: true, hasPreviousPage: false }),
      ),
    );
    expect(tokensOf(next.lines)).toStrictEqual([
      PASSAGE_TOKENS[0]?.slice(2, 4),
      ...PASSAGE_TOKENS.slice(1).map((tokens) => tokens.slice(0, 2)),
    ]);
    expect(next.lines.edges[0]?.node.tokens.pageInfo.hasPreviousPage).toBe(
      true,
    );
    expect(next.lines.edges[1]?.node.tokens.pageInfo.hasPreviousPage).toBe(
      false,
    );
  });
});
