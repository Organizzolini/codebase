/* cspell:words Troiae */

import { DataSource } from "typeorm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";

import { Token } from "@codebase/lexico-entities";

import { DATABASE_TIMEOUT_MILLISECONDS } from "../../../testing/database";
import {
  type ReadingApplication,
  startReadingApplication,
} from "../../../testing/reading-application";
import { PASSAGE_TOKENS } from "../../../testing/reading-passage";

import { LiteratureService } from "./literature.service";

/** A line as the reader query below selects one. */
interface ReaderLine {
  readonly data: string;
  readonly index: number;
  readonly label: string;
  readonly tokens: readonly {
    readonly data: string;
    readonly index: number;
    readonly isPunctuation: boolean;
    readonly word: null | { readonly data: string; readonly id: string };
  }[];
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

/** A spy on the token word loader's batched lookup. */
type TokenLookupSpy = MockInstance<LiteratureService["findTokensByIds"]>;

/** Selects a page of lines with every token and the word each resolves to. */
const READER_SELECTION = `
  totalCount
  pageInfo { endCursor hasNextPage hasPreviousPage }
  edges {
    node {
      index
      label
      data
      tokens { index data isPunctuation word { id data } }
    }
  }
`;

/** Reads a passage the way the reader does: lines, tokens, and their words. */
const READER = `
  query Reader($textId: ID!, $range: LinesRangeInput, $first: Int, $after: String) {
    lines(textId: $textId, range: $range, first: $first, after: $after) {
      ${READER_SELECTION}
    }
  }
`;

/** Reads the same passage twice in one request, through two aliases. */
const READER_TWICE = `
  query ReaderTwice($textId: ID!) {
    again: lines(textId: $textId) { ${READER_SELECTION} }
    once: lines(textId: $textId) { ${READER_SELECTION} }
  }
`;

/** Matches a statement whose own table, not a joined one, is the given one. */
function readsFrom(table: string): RegExp {
  return new RegExp(String.raw`FROM ("\w+"\.)?"${table}"`, "u");
}

/** Reduces a reader page's tokens to what a reader sees of each one. */
function tokensOf(page: ReaderPage): unknown[] {
  return page.edges.map((edge) =>
    edge.node.tokens.map((token) => ({
      data: token.data,
      isPunctuation: token.isPunctuation,
      word: token.word?.data ?? null,
    })),
  );
}

/**
 * Executes the reader's `lines` → `tokens` → `word` query over HTTP against
 * the literature API and a real database, and counts the statements and word
 * lookups each request issues.
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
      application.module.get(DataSource).logger,
      "logQuery",
    );
    const { lines } = await query<{ lines: ReaderPage }>(READER, variables);
    const statements = logQuery.mock.calls.map(([statement]) => statement);
    logQuery.mockRestore();
    return { page: lines, statements };
  }

  /**
   * Strips the word relation from every token a line lists, as a parent
   * that never joined it would, so `Token.word` must go through the loader.
   * Returns a spy on the loader's batched lookup.
   */
  function forceWordLoader(): TokenLookupSpy {
    const service = application.module.get(LiteratureService);
    const listTokensForLine = service.listTokensForLine.bind(service);
    vi.spyOn(service, "listTokensForLine").mockImplementation(
      async (lineId: string): Promise<Token[]> => {
        const tokens = await listTokensForLine(lineId);
        return tokens.map((token) => {
          const bare = Object.assign(new Token(), token);
          delete bare.word;
          return bare;
        });
      },
    );
    return vi.spyOn(service, "findTokensByIds");
  }

  /** Flattens every token ID a loader spy was asked for across its batches. */
  function loadedTokenIds(spy: TokenLookupSpy): string[] {
    return spy.mock.calls.flatMap(([tokenIds]) => tokenIds);
  }

  beforeAll(async () => {
    application = await startReadingApplication();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await application.stop();
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
      lines.edges.every((edge) =>
        edge.node.tokens.every((token, position) => token.index === position),
      ),
    ).toBe(true);

    const et = lines.edges
      .flatMap((edge) => edge.node.tokens)
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

  it("issues one token statement per line and no word statements, however many tokens", async () => {
    expect.hasAssertions();

    const one = await readWithStatements({ range: { endIndex: 0 } });
    const all = await readWithStatements({});
    const tokenCount = PASSAGE_TOKENS.flat().length;

    expect(tokensOf(all.page)).toStrictEqual(PASSAGE_TOKENS);
    expect(tokenCount).toBeGreaterThan(50);
    expect(
      all.statements.filter((statement) => readsFrom("tokens").test(statement)),
    ).toHaveLength(5);
    expect(
      all.statements.filter((statement) => readsFrom("words").test(statement)),
    ).toStrictEqual([]);
    expect(all.statements.length - one.statements.length).toBe(4);
  });

  it("batches unloaded token words into at most one lookup per line", async () => {
    expect.hasAssertions();

    const findTokensByIds = forceWordLoader();
    const { lines } = await query<{ lines: ReaderPage }>(READER);
    const tokenIds = loadedTokenIds(findTokensByIds);

    expect(tokensOf(lines)).toStrictEqual(PASSAGE_TOKENS);
    expect(findTokensByIds.mock.calls.length).toBeGreaterThan(0);
    expect(findTokensByIds.mock.calls.length).toBeLessThanOrEqual(5);
    expect(tokenIds).toHaveLength(PASSAGE_TOKENS.flat().length);
    expect(new Set(tokenIds).size).toBe(tokenIds.length);
  });

  it("caches each token's word for the rest of one request", async () => {
    expect.hasAssertions();

    const findTokensByIds = forceWordLoader();
    const { again, once } = await query<{
      again: ReaderPage;
      once: ReaderPage;
    }>(READER_TWICE);
    const tokenIds = loadedTokenIds(findTokensByIds);

    expect(tokensOf(again)).toStrictEqual(PASSAGE_TOKENS);
    expect(tokensOf(once)).toStrictEqual(PASSAGE_TOKENS);
    expect(tokenIds).toHaveLength(PASSAGE_TOKENS.flat().length);
    expect(new Set(tokenIds).size).toBe(tokenIds.length);
  });

  it("gives each request its own loader, so a second request looks words up again", async () => {
    expect.hasAssertions();

    const findTokensByIds = forceWordLoader();
    await query(READER);
    const firstRequest = loadedTokenIds(findTokensByIds);
    findTokensByIds.mockClear();
    const { lines } = await query<{ lines: ReaderPage }>(READER);
    const secondRequest = loadedTokenIds(findTokensByIds);

    expect(tokensOf(lines)).toStrictEqual(PASSAGE_TOKENS);
    expect(firstRequest).toHaveLength(PASSAGE_TOKENS.flat().length);
    expect(secondRequest.toSorted()).toStrictEqual(firstRequest.toSorted());
  });
});
