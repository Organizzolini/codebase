/* cspell:words Aeneid Amores colonorum Eclogues faciat Georgics laetas Metamorphoses rustica segetes Troiae vergil virumque */

import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";

import {
  DATABASE_TIMEOUT_MILLISECONDS,
  type LexicoTestDatabase,
  startLexicoTestDatabase,
} from "../../../testing/database";
import {
  expectedPage,
  type PageRequest,
  paginationMatrix,
  summarize,
} from "../../../testing/pagination";
import { toCursor } from "../../lexico-api.utilities";

import { LiteratureService } from "./literature.service";

import type { Connection } from "../../lexico-api.types";

/** Each boundary matrix issues a few hundred queries, which a slow runner needs time for. */
const MATRIX_TIMEOUT_MILLISECONDS = 120_000;

/** Orders entities by a sort key and then id, the order every connection pages in. */
function idsInOrder<Entity extends { id: string }>(
  entities: readonly Entity[],
  key: (entity: Entity) => number | string,
): string[] {
  return entities
    .toSorted((left, right) => {
      const [leftKey, rightKey] = [key(left), key(right)];
      if (leftKey !== rightKey) {
        return leftKey < rightKey ? -1 : 1;
      }
      return left.id < right.id ? -1 : 1;
    })
    .map((entity) => entity.id);
}

/**
 * Pages literature connections against a real `lexico_testing` database so
 * the cursor, limit, and count SQL is checked against the original
 * load-everything-then-slice behavior on every boundary.
 */
describe("literature pagination integration suite", () => {
  let database: LexicoTestDatabase;
  let service: LiteratureService;
  const authors: Record<string, Author> = {};
  const texts: Record<string, Text> = {};
  let aeneidLines: Line[] = [];
  let georgicsLines: Line[] = [];
  let tokens: Token[] = [];

  /** Saves an author with a unique slug. */
  async function seedAuthor(name: string, slug: string): Promise<Author> {
    return database
      .repository(Author)
      .save(Object.assign(new Author(), { name, slug }));
  }

  /** Saves a text, optionally nested under a parent text. */
  async function seedText(
    title: string,
    author: Author,
    parentText?: Text,
  ): Promise<Text> {
    return database.repository(Text).save(
      Object.assign(new Text(), {
        author,
        parentText: parentText ?? null,
        slug: `${author.slug}/${title.toLowerCase()}`,
        title,
      }),
    );
  }

  /** Saves one line per datum, indexed in order, for a text. */
  async function seedLines(text: Text, data: string[]): Promise<Line[]> {
    return database.repository(Line).save(
      data.map((datum, index) =>
        Object.assign(new Line(), {
          author: text.author,
          data: datum,
          index,
          label: String(index + 1),
          text,
        }),
      ),
    );
  }

  beforeAll(async () => {
    database = await startLexicoTestDatabase([Author, Line, Text, Token, Word]);
    service = new LiteratureService(
      database.repository(Author),
      database.repository(Line),
      database.repository(Text),
      database.repository(Token),
      database.repository(Word),
    );

    authors["vergil"] = await seedAuthor("Vergil", "vergil");
    authors["ovid"] = await seedAuthor("Ovid", "ovid");
    authors["elder"] = await seedAuthor("Seneca", "seneca-elder");
    authors["younger"] = await seedAuthor("Seneca", "seneca-younger");
    authors["cicero"] = await seedAuthor("Cicero", "cicero");

    const vergil = authors["vergil"];
    const ovid = authors["ovid"];
    texts["aeneid"] = await seedText("Aeneid", vergil);
    texts["eclogues"] = await seedText("Eclogues", vergil);
    texts["georgics"] = await seedText("Georgics", vergil);
    texts["amores"] = await seedText("Amores", ovid);
    texts["metamorphoses"] = await seedText("Metamorphoses", ovid);
    texts["book"] = await seedText("Book", vergil, texts["aeneid"]);

    aeneidLines = await seedLines(
      texts["aeneid"],
      Array.from({ length: 12 }, (_, index) =>
        index % 3 === 0 ? `arma ${String(index)}` : `cano ${String(index)}`,
      ),
    );
    georgicsLines = await seedLines(texts["georgics"], [
      "arma quid faciat laetas segetes",
      "arma colonorum",
      "arma rustica",
    ]);

    const [firstLine] = aeneidLines;
    tokens = await database.repository(Token).save(
      ["arma", "virumque", "cano", ",", "Troiae"].map((datum, index) =>
        Object.assign(new Token(), {
          author: vergil,
          data: datum,
          index,
          isPunctuation: datum === ",",
          line: firstLine,
          text: texts["aeneid"],
        }),
      ),
    );
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await database.stop();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  /** Asserts a connection agrees with the original slicing for every argument combination. */
  async function expectMatrixAgreement(
    ids: readonly string[],
    outsiderId: string,
    page: (
      pagination: PageRequest,
    ) => Promise<Connection<Author | Line | Text | Token>>,
    quick = true,
  ): Promise<void> {
    for (const pagination of paginationMatrix(ids, outsiderId, quick)) {
      expect({
        pagination,
        summary: summarize(await page(pagination)),
      }).toStrictEqual({
        pagination,
        summary: expectedPage(ids, pagination),
      });
    }
  }

  it("orders lines by index within the requested range and counts the whole range", async () => {
    expect.hasAssertions();

    const connection = await service.listLinesConnection(
      texts["aeneid"]?.id,
      { endIndex: 7, startIndex: 3 },
      { first: 2 },
    );

    expect(
      connection.edges.map((edge) => String(edge.node.index)),
    ).toStrictEqual(["3", "4"]);
    expect(connection.totalCount).toBe(5);
    expect(connection.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
    });
    expect(connection.edges[0]?.node.text.id).toBe(texts["aeneid"]?.id);
    expect(connection.edges[0]?.node.author.id).toBe(authors["vergil"]?.id);

    const next = await service.listLinesConnection(
      texts["aeneid"]?.id,
      { endIndex: 7, startIndex: 3 },
      { after: connection.pageInfo.endCursor ?? null, first: 10 },
    );

    expect(next.edges.map((edge) => String(edge.node.index))).toStrictEqual([
      "5",
      "6",
      "7",
    ]);
    expect(next.pageInfo).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
    });

    const previous = await service.listLinesConnection(
      texts["aeneid"]?.id,
      { endIndex: 7, startIndex: 3 },
      { before: next.pageInfo.startCursor ?? null, last: 1 },
    );

    expect(previous.edges.map((edge) => String(edge.node.index))).toStrictEqual(
      ["4"],
    );
    expect(previous.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("returns an empty connection for a missing text and past the last line", async () => {
    expect.hasAssertions();

    const missing = await service.listLinesConnection(
      undefined,
      {},
      { first: 5 },
    );
    const pastEnd = await service.listLinesConnection(
      texts["aeneid"]?.id,
      {},
      { after: toCursor({ id: aeneidLines.at(-1)?.id }), first: 5 },
    );
    const emptyRange = await service.listLinesConnection(
      texts["aeneid"]?.id,
      { endIndex: 2, startIndex: 5 },
      { first: 5 },
    );

    expect(summarize(missing)).toStrictEqual(expectedPage([], { first: 5 }));
    expect(pastEnd.edges).toStrictEqual([]);
    expect(pastEnd.totalCount).toBe(12);
    expect(pastEnd.pageInfo).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
    });
    expect(summarize(emptyRange)).toStrictEqual(expectedPage([], { first: 5 }));
  });

  it(
    "agrees with the original slicing for lines on every cursor and count boundary",
    { timeout: MATRIX_TIMEOUT_MILLISECONDS },
    async () => {
      expect.hasAssertions();

      const ids = aeneidLines.map((line) => line.id);
      await expectMatrixAgreement(
        ids,
        georgicsLines[0]?.id ?? "",
        async (pagination) =>
          service.listLinesConnection(texts["aeneid"]?.id, {}, pagination),
        false,
      );
      await expectMatrixAgreement(
        ids.slice(2, 9),
        ids[0] ?? "",
        async (pagination) =>
          service.listLinesConnection(
            texts["aeneid"]?.id,
            { endIndex: 8, startIndex: 2 },
            pagination,
          ),
      );
    },
  );

  it("asks the database for one page of lines rather than every line", async () => {
    expect.hasAssertions();

    const { logger } = database.module.get(DataSource);
    const spy = vi.spyOn(logger, "logQuery");

    const connection = await service.listLinesConnection(
      texts["aeneid"]?.id,
      {},
      { after: toCursor({ id: aeneidLines[3]?.id }), first: 2 },
    );
    const lineReads = spy.mock.calls
      .map(([statement]) => statement)
      .filter((statement) => /FROM ("[a-z_]+"\.)?"lines"/u.test(statement));
    spy.mockRestore();

    expect(
      connection.edges.map((edge) => String(edge.node.index)),
    ).toStrictEqual(["4", "5"]);
    expect(connection.totalCount).toBe(12);
    expect(lineReads).toContainEqual(expect.stringMatching(/LIMIT 3$/u));
    expect(
      lineReads.filter(
        (statement) => !/LIMIT|COUNT\(|IN \(|"id" = \$/u.test(statement),
      ),
    ).toStrictEqual([]);
  });

  it(
    "orders authors by name then id and agrees with the original slicing",
    { timeout: MATRIX_TIMEOUT_MILLISECONDS },
    async () => {
      expect.hasAssertions();

      const all = await service.listAuthorsConnection({});
      const names = all.edges.map((edge) => edge.node.name);

      expect(names).toStrictEqual([
        "Cicero",
        "Ovid",
        "Seneca",
        "Seneca",
        "Vergil",
      ]);
      expect(all.edges.map((edge) => edge.node.id)).toStrictEqual(
        idsInOrder(Object.values(authors), (author) => author.name),
      );
      expect(
        all.edges.find((edge) => edge.node.id === authors["vergil"]?.id)?.node
          .texts,
      ).toHaveLength(4);

      await expectMatrixAgreement(
        idsInOrder(Object.values(authors), (author) => author.name),
        texts["aeneid"]?.id ?? "",
        async (pagination) => service.listAuthorsConnection(pagination),
      );
    },
  );

  it(
    "filters texts by author and parent, orders by title, and agrees with the original slicing",
    { timeout: MATRIX_TIMEOUT_MILLISECONDS },
    async () => {
      expect.hasAssertions();

      const byVergil = await service.listTextsConnection(authors["vergil"]?.id);
      const children = await service.listTextsConnection(
        undefined,
        texts["aeneid"]?.id,
      );
      const all = await service.listTextsConnection();

      expect(byVergil.edges.map((edge) => edge.node.title)).toStrictEqual([
        "Aeneid",
        "Book",
        "Eclogues",
        "Georgics",
      ]);
      expect(children.edges.map((edge) => edge.node.title)).toStrictEqual([
        "Book",
      ]);
      expect(children.edges[0]?.node.parentText?.id).toBe(texts["aeneid"]?.id);
      expect(children.edges[0]?.node.author.id).toBe(authors["vergil"]?.id);

      await expectMatrixAgreement(
        byVergil.edges.map((edge) => edge.node.id),
        texts["amores"]?.id ?? "",
        async (pagination) =>
          service.listTextsConnection(
            authors["vergil"]?.id,
            undefined,
            pagination,
          ),
      );

      expect(all.totalCount).toBe(6);
    },
  );

  it(
    "pages tokens of a line by index and agrees with the original slicing",
    { timeout: MATRIX_TIMEOUT_MILLISECONDS },
    async () => {
      expect.hasAssertions();

      const firstLineId = aeneidLines[0]?.id ?? "";
      const all = await service.listTokensForLineConnection(firstLineId);

      expect(all.edges.map((edge) => edge.node.data)).toStrictEqual([
        "arma",
        "virumque",
        "cano",
        ",",
        "Troiae",
      ]);
      expect(all.edges[0]?.node.line.id).toBe(firstLineId);

      await expectMatrixAgreement(
        tokens.map((token) => token.id),
        aeneidLines[1]?.id ?? "",
        async (pagination) =>
          service.listTokensForLineConnection(firstLineId, pagination),
      );
    },
  );

  it(
    "pages search results for authors, texts, and lines with the original slicing",
    { timeout: MATRIX_TIMEOUT_MILLISECONDS },
    async () => {
      expect.hasAssertions();

      const authorHits = await service.searchAuthors("SEN");
      const textHits = await service.searchTexts("e", authors["vergil"]?.id);
      const lineHits = await service.searchLines("arma");
      const georgicsHits = await service.searchLines(
        "arma",
        texts["georgics"]?.id,
      );

      const senecaIds = idsInOrder(
        Object.values(authors).filter((author) => author.name === "Seneca"),
        (author) => author.name,
      );
      const armaIds = idsInOrder(
        [...aeneidLines, ...georgicsLines].filter((line) =>
          line.data.includes("arma"),
        ),
        (line) => line.index,
      );

      expect(authorHits.edges.map((edge) => edge.node.id)).toStrictEqual(
        senecaIds,
      );
      expect(textHits.edges.map((edge) => edge.node.title)).toStrictEqual([
        "Aeneid",
        "Book",
        "Eclogues",
        "Georgics",
      ]);
      expect(textHits.edges[0]?.node.author.id).toBe(authors["vergil"]?.id);
      expect(lineHits.totalCount).toBe(7);
      expect(lineHits.edges.map((edge) => edge.node.id)).toStrictEqual(armaIds);
      await expect(service.searchLiterature("arma")).resolves.toMatchObject({
        lines: armaIds.map((id) => ({ id })),
      });
      expect(georgicsHits.edges.map((edge) => edge.node.data)).toStrictEqual([
        "arma quid faciat laetas segetes",
        "arma colonorum",
        "arma rustica",
      ]);

      await expectMatrixAgreement(
        armaIds,
        aeneidLines[1]?.id ?? "",
        async (pagination) =>
          service.searchLines("arma", undefined, pagination),
      );
      await expectMatrixAgreement(
        textHits.edges.map((edge) => edge.node.id),
        texts["amores"]?.id ?? "",
        async (pagination) =>
          service.searchTexts("e", authors["vergil"]?.id, pagination),
      );
      await expectMatrixAgreement(
        senecaIds,
        authors["ovid"]?.id ?? "",
        async (pagination) => service.searchAuthors("sen", pagination),
      );
    },
  );
});
