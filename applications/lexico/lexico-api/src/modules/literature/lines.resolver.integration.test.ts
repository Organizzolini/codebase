import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";

import {
  DATABASE_TIMEOUT_MILLISECONDS,
  startLexicoDatabaseTestingModule,
} from "../../../testing/database";
import {
  parseIndex,
  passageTokensAt,
  type ReadingPassage,
  seedReadingPassage,
} from "../../../testing/reading-passage";

import { LinesResolver } from "./lines.resolver";
import { LiteratureService } from "./literature.service";
import { toLineType } from "./literature.utilities";

import type { Connection } from "../../lexico-api.types";
import type { LinesArguments } from "./line-arguments.entities";
import type { LineType } from "./line.entities";
import type { DatabaseTestingModule } from "@codebase/database/testing";

/** A page of lines, reduced to what a reader can observe of it. */
interface LinesPage {
  readonly endCursor: null | string;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly indices: number[];
  readonly startCursor: null | string;
  readonly totalCount: number;
}

/** Reduces a connection to the line indices it holds and its page info. */
function summarize(connection: Connection<LineType>): LinesPage {
  return {
    endCursor: connection.pageInfo.endCursor ?? null,
    hasNextPage: connection.pageInfo.hasNextPage,
    hasPreviousPage: connection.pageInfo.hasPreviousPage,
    indices: connection.edges.map((edge) => parseIndex(edge.node)),
    startCursor: connection.pageInfo.startCursor ?? null,
    totalCount: connection.totalCount,
  };
}

/**
 * Executes the `lines` query and `Line.tokens` beneath it through the real
 * resolver and service against a migrated Postgres database.
 */
describe("lines resolver integration suite", () => {
  let database: DatabaseTestingModule;
  let passage: ReadingPassage;
  let resolver: LinesResolver;

  /** Fetches one page of the passage's lines. */
  async function linesPage(
    arguments_: Omit<LinesArguments, "textId"> & { textId?: null | string },
  ): Promise<LinesPage> {
    return summarize(
      await resolver.lines({ textId: passage.text.id, ...arguments_ }),
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
    resolver = new LinesResolver(
      new LiteratureService(
        database.repository(Author),
        database.repository(Line),
        database.repository(Text),
        database.repository(Token),
        database.repository(Word),
      ),
    );
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await database.close();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  it("lists only the text's lines, ordered by index rather than insertion", async () => {
    expect.hasAssertions();

    const page = await linesPage({});

    expect(page).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: false,
      indices: [0, 1, 2, 3, 4],
      totalCount: 5,
    });
    expect(page.startCursor).toStrictEqual(expect.any(String));
  });

  it("walks forward with first and after", async () => {
    expect.hasAssertions();

    const first = await linesPage({ first: 2 });
    const second = await linesPage({ after: first.endCursor, first: 2 });
    const last = await linesPage({ after: second.endCursor, first: 2 });

    expect(first).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
      indices: [0, 1],
      totalCount: 5,
    });
    expect(second).toMatchObject({ hasNextPage: true, indices: [2, 3] });
    expect(second.hasPreviousPage).toBe(true);
    expect(last).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
      indices: [4],
      totalCount: 5,
    });
  });

  it("walks backward with last and before", async () => {
    expect.hasAssertions();

    const last = await linesPage({ last: 2 });
    const middle = await linesPage({ before: last.startCursor, last: 2 });
    const first = await linesPage({ before: middle.startCursor, last: 2 });

    expect(last).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
      indices: [3, 4],
      totalCount: 5,
    });
    expect(middle).toMatchObject({ hasPreviousPage: true, indices: [1, 2] });
    expect(middle.hasNextPage).toBe(true);
    expect(first).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
      indices: [0],
    });
  });

  it("slices by an inclusive index range and counts only the range", async () => {
    expect.hasAssertions();

    await expect(
      linesPage({ range: { endIndex: 3, startIndex: 1 } }),
    ).resolves.toMatchObject({
      hasNextPage: false,
      hasPreviousPage: false,
      indices: [1, 2, 3],
      totalCount: 3,
    });
    await expect(
      linesPage({ range: { startIndex: 3 } }),
    ).resolves.toMatchObject({
      indices: [3, 4],
      totalCount: 2,
    });
    await expect(linesPage({ range: { endIndex: 1 } })).resolves.toMatchObject({
      indices: [0, 1],
      totalCount: 2,
    });
    await expect(
      linesPage({ range: { endIndex: 2, startIndex: 2 } }),
    ).resolves.toMatchObject({ indices: [2], totalCount: 1 });
  });

  it("pages within a range with cursors from both ends", async () => {
    expect.hasAssertions();

    const range = { endIndex: 4, startIndex: 1 };
    const first = await linesPage({ first: 2, range });
    const next = await linesPage({ after: first.endCursor, first: 10, range });
    const previous = await linesPage({
      before: next.startCursor,
      last: 1,
      range,
    });

    expect(first).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
      indices: [1, 2],
      totalCount: 4,
    });
    expect(next).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
      indices: [3, 4],
      totalCount: 4,
    });
    expect(previous).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: true,
      indices: [2],
    });
  });

  it("clamps a range that overhangs either end of the text", async () => {
    expect.hasAssertions();

    await expect(
      linesPage({ range: { endIndex: 1, startIndex: -5 } }),
    ).resolves.toMatchObject({ indices: [0, 1], totalCount: 2 });
    await expect(
      linesPage({ first: 2, range: { endIndex: 99, startIndex: 3 } }),
    ).resolves.toMatchObject({
      hasNextPage: false,
      indices: [3, 4],
      totalCount: 2,
    });
  });

  it("returns an empty connection for an empty, inverted, or out-of-range range", async () => {
    expect.hasAssertions();

    const empty = {
      endCursor: null,
      hasNextPage: false,
      hasPreviousPage: false,
      indices: [],
      startCursor: null,
      totalCount: 0,
    };

    await expect(
      linesPage({ range: { endIndex: 20, startIndex: 10 } }),
    ).resolves.toStrictEqual(empty);
    await expect(
      linesPage({ range: { endIndex: 1, startIndex: 3 } }),
    ).resolves.toStrictEqual(empty);
    await expect(
      linesPage({ first: 3, range: { endIndex: -1 } }),
    ).resolves.toStrictEqual(empty);
  });

  it("returns an empty connection without a text or for an unknown one", async () => {
    expect.hasAssertions();

    await expect(linesPage({ first: 2, textId: null })).resolves.toMatchObject({
      indices: [],
      totalCount: 0,
    });
    await expect(
      linesPage({ first: 2, textId: randomUUID() }),
    ).resolves.toMatchObject({
      indices: [],
      totalCount: 0,
    });
  });

  it("returns an empty page past the last line while still counting the text", async () => {
    expect.hasAssertions();

    const last = await linesPage({ last: 1 });

    await expect(
      linesPage({ after: last.endCursor, first: 2 }),
    ).resolves.toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
      indices: [],
      totalCount: 5,
    });
  });

  it("resolves each line's tokens in index order, with whitespace and punctuation as wordless markers", async () => {
    expect.hasAssertions();

    for (const [index, line] of passage.lines.entries()) {
      const tokens = await resolver.tokensForLine(toLineType(line));

      expect(tokens.map((token) => parseIndex(token))).toStrictEqual(
        tokens.map((_token, position) => position),
      );
      expect(
        tokens.map((token) => ({
          data: token.data,
          isPunctuation: token.isPunctuation,
          word: token.word?.data ?? null,
        })),
      ).toStrictEqual(passageTokensAt(index));
      expect(tokens.every((token) => token.line.id === line.id)).toBe(true);
    }
  });

  it("resolves no tokens for a line that has none", async () => {
    expect.hasAssertions();

    await expect(
      resolver.tokensForLine(
        toLineType(Object.assign(new Line(), { id: randomUUID() })),
      ),
    ).resolves.toStrictEqual([]);
  });
});
