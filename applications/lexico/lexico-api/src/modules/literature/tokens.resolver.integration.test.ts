import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";

import {
  DATABASE_TIMEOUT_MILLISECONDS,
  startLexicoDatabaseTestingModule,
} from "../../../testing/database";
import { createLiteratureServices } from "../../../testing/literature-services";
import {
  passageLineAt,
  passageTokensAt,
  type ReadingPassage,
  seedReadingPassage,
} from "../../../testing/reading-passage";

import { TokensResolver } from "./tokens.resolver";

import type { Connection } from "../../lexico-api.types";
import type { TokenType } from "./token.entities";
import type { TokensArguments } from "./tokens-arguments.entities";
import type { DatabaseTestingModule } from "@codebase/database/testing";

/** A page of tokens, reduced to what a reader can observe of it. */
interface TokensPage {
  readonly data: string[];
  readonly endCursor: null | string;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly startCursor: null | string;
  readonly totalCount: number;
}

/** Reduces a connection to the token strings it holds and its page info. */
function summarize(connection: Connection<TokenType>): TokensPage {
  return {
    data: connection.edges.map((edge) => edge.node.data),
    endCursor: connection.pageInfo.endCursor ?? null,
    hasNextPage: connection.pageInfo.hasNextPage,
    hasPreviousPage: connection.pageInfo.hasPreviousPage,
    startCursor: connection.pageInfo.startCursor ?? null,
    totalCount: connection.totalCount,
  };
}

/**
 * Executes the `tokens` connection query, with each token's joined word,
 * through the real resolver and service against a migrated Postgres database.
 */
describe("tokens resolver integration suite", () => {
  let database: DatabaseTestingModule;
  let passage: ReadingPassage;
  let resolver: TokensResolver;

  /** The first passage line, which mixes words, spaces, and punctuation. */
  const FIRST_LINE_TOKENS = passageTokensAt(0);

  /** Fetches one page of a line's tokens, the first line's by default. */
  async function tokensPage(
    arguments_: Partial<TokensArguments>,
  ): Promise<TokensPage> {
    return summarize(
      await resolver.tokens({
        lineId: passageLineAt(passage, 0).id,
        ...arguments_,
      }),
    );
  }

  beforeAll(async () => {
    database = await startLexicoDatabaseTestingModule([
      Author,
      Line,
      Text,
      Token,
      Word,
    ]);
    passage = await seedReadingPassage(database.dataSource);
    resolver = new TokensResolver(createLiteratureServices(database).service);
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await database.close();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  it("lists a line's tokens in index order and counts them", async () => {
    expect.hasAssertions();

    const connection = await resolver.tokens({
      lineId: passageLineAt(passage, 0).id,
    });

    expect(
      connection.edges.map((edge) => ({
        data: edge.node.data,
        isPunctuation: edge.node.isPunctuation,
        word: edge.node.word?.data ?? null,
      })),
    ).toStrictEqual(FIRST_LINE_TOKENS);
    expect(connection.edges.map((edge) => edge.node.index)).toStrictEqual(
      FIRST_LINE_TOKENS.map((_token, index) => index),
    );
    expect(connection.totalCount).toBe(FIRST_LINE_TOKENS.length);
    expect(connection.pageInfo).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it("walks every token forward with first and after", async () => {
    expect.hasAssertions();

    const seen: string[] = [];
    let page = await tokensPage({ first: 4 });
    seen.push(...page.data);
    while (page.hasNextPage) {
      page = await tokensPage({ after: page.endCursor, first: 4 });
      seen.push(...page.data);

      expect(page.hasPreviousPage).toBe(true);
    }

    expect(seen).toStrictEqual(FIRST_LINE_TOKENS.map((token) => token.data));
    expect(page.totalCount).toBe(FIRST_LINE_TOKENS.length);
  });

  it("walks every token backward with last and before", async () => {
    expect.hasAssertions();

    const seen: string[] = [];
    let page = await tokensPage({ last: 4 });
    seen.unshift(...page.data);
    while (page.hasPreviousPage) {
      page = await tokensPage({ before: page.startCursor, last: 4 });
      seen.unshift(...page.data);

      expect(page.hasNextPage).toBe(true);
    }

    expect(seen).toStrictEqual(FIRST_LINE_TOKENS.map((token) => token.data));
  });

  it("returns an empty connection for an unknown line", async () => {
    expect.hasAssertions();

    await expect(
      tokensPage({ first: 3, lineId: randomUUID() }),
    ).resolves.toStrictEqual({
      data: [],
      endCursor: null,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      totalCount: 0,
    });
  });
});
