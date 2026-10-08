import { describe, expect, it, vi } from "vitest";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";

import { createRepositoryMock } from "../../../testing/mocks";
import { toCursor } from "../../lexico-api.utilities";
import { WordType } from "../words/word.entities";

import { AuthorType } from "./author.entities";
import { LineType } from "./line.entities";
import { LOAD_CHUNK_SIZE } from "./literature.constants";
import {
  createEmptyConnection,
  paginateQuery,
  slicePage,
  toAuthorType,
  toLineType,
  toTextType,
  toTokenType,
} from "./literature.utilities";
import { TextType } from "./text.entities";
import { TokenType } from "./token.entities";

import type { ConnectionQuery, PageReadRow } from "./literature.types";

const FIRST_ID = "01a10ee5-dd0a-77b5-97b1-2c6e9baec33e";
const SECOND_ID = "01a10ee5-dd0a-77b5-97b1-2c6e9baec33f";
const THIRD_ID = "01a10ee5-dd0a-77b5-97b1-2c6e9baec340";

/** The page statement a line query ran, and the parameters it bound. */
interface PageStatement {
  readonly parameters: Record<string, unknown>;
  readonly sql: string;
}

/** Builds an author with ingestion metadata the API must not expose. */
function createAuthor(): Author {
  return Object.assign(new Author(), {
    id: "author-1",
    metadata: { era: "augustan" },
    name: "Vergil",
    slug: "vergil",
  });
}

/** Builds a book of a work, loaded with its author and parent work. */
function createBook(): Text {
  const author = createAuthor();
  const work = Object.assign(new Text(), {
    author,
    id: "text-1",
    metadata: { books: 12 },
    parentText: null,
    slug: "vergil/aeneid",
    title: "Aeneid",
  });
  return Object.assign(new Text(), {
    author,
    id: "text-2",
    parentText: work,
    slug: "vergil/aeneid/1",
    title: "Book I",
    type: "book",
  });
}

/**
 * Builds a line query whose one page statement reads back this row, with the
 * window as positions keyed by their order, and records what it ran.
 */
function createLineQuery(
  windowIds: string[],
  read: Partial<PageReadRow> = {},
): {
  query: ConnectionQuery<Line>;
  statements: PageStatement[];
} {
  const repository = createRepositoryMock<Line>();
  const builder = repository.createQueryBuilder();
  const statements: PageStatement[] = [];
  const lines = windowIds.map((id) => Object.assign(new Line(), { id }));
  Object.defineProperty(builder, "alias", { value: "line" });
  vi.mocked(builder.getQuery).mockReturnValue("SELECT filtered");
  vi.mocked(builder.getParameters).mockReturnValue({ textId: "text-1" });
  Object.defineProperty(builder, "dataSource", {
    value: {
      driver: {
        escapeQueryWithParameters: (
          sql: string,
          parameters: Record<string, unknown>,
        ): [string, unknown[]] => {
          statements.push({ parameters, sql });
          return [sql, []];
        },
      },
      query: vi.fn<() => Promise<PageReadRow[]>>().mockResolvedValue([
        {
          after: null,
          before: null,
          hasRowBefore: false,
          totalCount: String(windowIds.length),
          window: windowIds.map((id, key) => ({ id, key })),
          ...read,
        },
      ]),
    },
  });

  return {
    query: {
      filter: () => builder,
      load: vi
        .fn<ConnectionQuery<Line>["load"]>()
        .mockResolvedValue(lines.toReversed()),
      sortKey: "line.index",
    },
    statements,
  };
}

describe("literature utilities", () => {
  describe(slicePage, () => {
    it("cuts to first before last and flags each cut", () => {
      expect(
        slicePage(["a", "b", "c", "d"], { first: 3, last: 2 }),
      ).toStrictEqual({
        hasNext: true,
        hasPrevious: true,
        ids: ["b", "c"],
      });
      expect(slicePage(["a", "b"], { first: 0, last: null })).toStrictEqual({
        hasNext: true,
        hasPrevious: false,
        ids: [],
      });
      expect(slicePage(["a", "b"], { first: null, last: null })).toStrictEqual({
        hasNext: false,
        hasPrevious: false,
        ids: ["a", "b"],
      });
    });
  });

  describe(createEmptyConnection, () => {
    it("holds no edges, no cursors, and no count", () => {
      expect(createEmptyConnection()).toMatchObject({
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0,
      });
    });
  });

  describe(paginateQuery, () => {
    it("loads an unlimited page in chunks and drops rows that vanished before loading", async () => {
      expect.hasAssertions();

      const ids = Array.from(
        { length: LOAD_CHUNK_SIZE + 1 },
        (_, index) =>
          `01a10ee5-dd0a-77b5-97b1-${index.toString(16).padStart(12, "0")}`,
      );
      const { query, statements } = createLineQuery(ids);
      vi.mocked(query.load).mockResolvedValue(
        ids.slice(1).map((id) => Object.assign(new Line(), { id })),
      );
      const connection = await paginateQuery(query);

      expect(query.load).toHaveBeenCalledTimes(2);
      expect(
        vi.mocked(query.load).mock.calls.map(([chunk]) => chunk.length),
      ).toStrictEqual([LOAD_CHUNK_SIZE, 1]);
      expect(connection.edges.map((edge) => edge.node.id)).toStrictEqual(
        ids.slice(1),
      );
      expect(connection.totalCount).toBe(LOAD_CHUNK_SIZE + 1);
      expect(statements).toHaveLength(1);
      expect(statements[0]?.sql).not.toMatch(/LIMIT/u);
      expect(statements[0]?.parameters).toStrictEqual({ textId: "text-1" });
    });

    it("reads one row past the first page in ascending order and keeps the page order", async () => {
      expect.hasAssertions();

      const { query, statements } = createLineQuery([
        FIRST_ID,
        SECOND_ID,
        THIRD_ID,
      ]);
      const connection = await paginateQuery(query, { first: 2 });

      expect(connection.edges.map((edge) => edge.node.id)).toStrictEqual([
        FIRST_ID,
        SECOND_ID,
      ]);
      expect(connection.edges[0]?.cursor).toBe(toCursor({ id: FIRST_ID }));
      expect(connection.pageInfo).toMatchObject({
        hasNextPage: true,
        hasPreviousPage: false,
      });
      expect(connection.totalCount).toBe(3);
      expect(statements[0]?.sql).toMatch(
        /^WITH "filtered" AS MATERIALIZED \(SELECT filtered\),.*ORDER BY "key" ASC, "id" ASC LIMIT 3\) "page"\) AS "window"$/u,
      );
    });

    it("reads the last page from the back and reverses it into order", async () => {
      expect.hasAssertions();

      const { query, statements } = createLineQuery([
        THIRD_ID,
        SECOND_ID,
        FIRST_ID,
      ]);
      const connection = await paginateQuery(query, { last: 2 });

      expect(connection.edges.map((edge) => edge.node.id)).toStrictEqual([
        SECOND_ID,
        THIRD_ID,
      ]);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
      expect(statements[0]?.sql).toMatch(/"key" DESC, "id" DESC LIMIT 3\)/u);
    });

    it("ignores malformed, foreign, and negative arguments without binding a cursor", async () => {
      expect.hasAssertions();

      const { query, statements } = createLineQuery([FIRST_ID]);
      const connection = await paginateQuery(query, {
        after: "not-a-cursor",
        before: toCursor({ id: "not-a-uuid" }),
        first: -1,
        last: -1,
      });

      expect(connection.edges).toHaveLength(1);
      expect(connection.pageInfo).toMatchObject({
        hasNextPage: false,
        hasPreviousPage: false,
      });
      expect(statements[0]?.parameters).toStrictEqual({ textId: "text-1" });
      expect(statements[0]?.sql).toContain(
        `"after" AS (SELECT "id", "key" FROM "filtered" WHERE FALSE)`,
      );
    });

    it("bounds the window by both cursors and checks for rows before the earlier one", async () => {
      expect.hasAssertions();

      const { query, statements } = createLineQuery([], {
        after: { id: THIRD_ID, key: 4 },
        before: { id: FIRST_ID, key: 2 },
        hasRowBefore: false,
      });
      const connection = await paginateQuery(query, {
        after: toCursor({ id: THIRD_ID }),
        before: toCursor({ id: FIRST_ID }),
      });

      expect(connection.edges).toStrictEqual([]);
      expect(connection.pageInfo).toMatchObject({
        hasNextPage: true,
        hasPreviousPage: false,
      });
      expect(statements[0]?.parameters).toMatchObject({
        afterCursorId: THIRD_ID,
        beforeCursorId: FIRST_ID,
      });
      expect(statements[0]?.sql).toContain(
        `"after" AS (SELECT "id", "key" FROM "filtered" WHERE "id" = :afterCursorId)`,
      );
    });

    it("matches a cursor's claimed sort key too, and encodes cursors its own way", async () => {
      expect.hasAssertions();

      const { query, statements } = createLineQuery([SECOND_ID], {
        after: { id: FIRST_ID, key: 7 },
      });
      const connection = await paginateQuery(
        {
          ...query,
          cursor: {
            decode: (cursor) =>
              cursor === "seventh" ? { id: FIRST_ID, key: 7 } : null,
            encode: (position) => `${position.id}@${String(position.key)}`,
          },
        },
        { after: "seventh", before: null },
      );

      expect(connection.edges[0]?.cursor).toBe(`${SECOND_ID}@0`);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
      expect(statements[0]?.parameters).toMatchObject({
        afterCursorId: FIRST_ID,
        afterCursorKey: 7,
      });
      expect(statements[0]?.sql).toContain(
        `WHERE "id" = :afterCursorId AND "key" = :afterCursorKey)`,
      );
    });

    it("reads a statement that returned no row as an empty page", async () => {
      expect.hasAssertions();

      const { query } = createLineQuery([]);
      const builder = query.filter();
      vi.mocked(builder.dataSource.query).mockResolvedValueOnce([]);

      await expect(paginateQuery(query, { last: 1 })).resolves.toStrictEqual(
        createEmptyConnection(),
      );
    });
  });

  describe(toAuthorType, () => {
    it("maps an author, leaving out its metadata and the texts its resolver loads", () => {
      expect.hasAssertions();

      const author = createAuthor();
      author.texts = [createBook()];
      const mapped = toAuthorType(author);

      expect(mapped).toBeInstanceOf(AuthorType);
      expect(mapped).toMatchObject({ name: "Vergil", slug: "vergil" });
      expect(mapped).not.toHaveProperty("metadata");
      expect(mapped).not.toHaveProperty("texts");
    });
  });

  describe(toTextType, () => {
    it("maps a text's author and parent text, leaving out its metadata", () => {
      expect.hasAssertions();

      const mapped = toTextType(createBook());

      expect(mapped).toBeInstanceOf(TextType);
      expect(mapped.author).toBeInstanceOf(AuthorType);
      expect(mapped.parentText).toBeInstanceOf(TextType);
      expect(mapped.parentText).toMatchObject({
        parentText: null,
        title: "Aeneid",
      });
      expect(mapped).not.toHaveProperty("metadata");
      expect(mapped.parentText).not.toHaveProperty("metadata");
      expect(mapped).not.toHaveProperty("lines");
    });
  });

  describe(toLineType, () => {
    it("maps a line with its author and text, leaving its tokens to its resolver", () => {
      expect.hasAssertions();

      const book = createBook();
      const line = Object.assign(new Line(), {
        author: book.author,
        data: "arma",
        id: "line-1",
        index: 0,
        label: "1",
        text: book,
        tokens: [Object.assign(new Token(), { data: "arma", id: "token-1" })],
      });
      const mapped = toLineType(line);

      expect(mapped).toBeInstanceOf(LineType);
      expect(mapped).toMatchObject({ data: "arma", index: 0, label: "1" });
      expect(mapped.author).toBeInstanceOf(AuthorType);
      expect(mapped.text).toBeInstanceOf(TextType);
      expect(mapped).not.toHaveProperty("tokens");
    });
  });

  describe(toTokenType, () => {
    it("maps a token's word, and keeps a token with no word null", () => {
      expect.hasAssertions();

      const token = Object.assign(new Token(), {
        data: "arma",
        id: "token-1",
        index: 0,
        isPunctuation: false,
        word: Object.assign(new Word(), { data: "arma", id: "word-1" }),
      });
      const punctuation = Object.assign(new Token(), {
        data: ",",
        id: "token-2",
        isPunctuation: true,
        word: null,
      });

      expect(toTokenType(token)).toBeInstanceOf(TokenType);
      expect(toTokenType(token).word).toBeInstanceOf(WordType);
      expect(toTokenType(punctuation).word).toBeNull();
      expect(toTokenType(punctuation).line).toBeUndefined();
    });
  });
});
