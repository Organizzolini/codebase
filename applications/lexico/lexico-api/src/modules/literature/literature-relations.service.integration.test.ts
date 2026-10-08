/* cspell:words Aeneid Amores Eclogues Georgics Troiae virumque */

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";

import {
  DATABASE_TIMEOUT_MILLISECONDS,
  startLexicoDatabaseTestingModule,
} from "../../../testing/database";
import {
  expectedPage,
  type PageRequest,
  paginationMatrix,
  summarize,
} from "../../../testing/pagination";
import { toCursor } from "../../lexico-api.utilities";

import { LiteratureRelationsService } from "./literature-relations.service";
import { createEmptyConnection } from "./literature.utilities";

import type { Connection } from "../../lexico-api.types";
import type { DatabaseTestingModule } from "@codebase/database/testing";

/** Each boundary matrix issues a few hundred statements, which a slow runner needs time for. */
const MATRIX_TIMEOUT_MILLISECONDS = 120_000;

/** Pages several parents' children in one call, as a loader batch does. */
type PageByParent = (
  parentIds: readonly string[],
  pagination: PageRequest,
) => Promise<Map<string, Connection<{ id: string }>>>;

/**
 * Pages the relations beneath many authors, texts, and lines at once against
 * a real `lexico_testing` database, checking every parent's page against the
 * original load-everything-then-slice behavior on every boundary, and that a
 * batch costs the same statements however many parents and children it holds.
 */
describe("literature relations integration suite", () => {
  let database: DatabaseTestingModule;
  let service: LiteratureRelationsService;
  const authors: Record<string, Author> = {};
  const texts: Record<string, Text> = {};
  const lines: Record<string, Line[]> = {};
  const tokens: Record<string, Token[]> = {};

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
        slug: `${author.slug}/${title.toLowerCase().replaceAll(" ", "-")}`,
        title,
      }),
    );
  }

  /** Saves one line per datum for a text, last index first. */
  async function seedLines(text: Text, count: number): Promise<Line[]> {
    const saved = await database.repository(Line).save(
      Array.from({ length: count }, (_, index) =>
        Object.assign(new Line(), {
          author: text.author,
          data: `${text.title} ${String(index)}`,
          index,
          label: String(index + 1),
          text,
        }),
      ).toReversed(),
    );
    return saved.toSorted((left, right) => left.index - right.index);
  }

  /** Saves one token per datum for a line, last index first. */
  async function seedTokens(line: Line, data: string[]): Promise<Token[]> {
    const saved = await database.repository(Token).save(
      data
        .map((datum, index) =>
          Object.assign(new Token(), {
            author: line.author,
            data: datum,
            index,
            isPunctuation: datum === ",",
            line,
            text: line.text,
          }),
        )
        .toReversed(),
    );
    return saved.toSorted((left, right) => left.index - right.index);
  }

  /**
   * Asserts that paging every parent at once gives each parent the page the
   * original slicing gives it alone, for every argument combination built
   * from one parent's children. Its cursors name no child of the others.
   */
  async function expectMatrixAgreement(
    childIdsByParent: ReadonlyMap<string, readonly string[]>,
    page: PageByParent,
    quick = true,
  ): Promise<void> {
    const [cursorIds = [], outsiderIds = []] = [...childIdsByParent.values()];
    const parentIds = [...childIdsByParent.keys()];
    for (const pagination of paginationMatrix(
      cursorIds,
      outsiderIds[0] ?? randomUUID(),
      { quick },
    )) {
      const connections = await page(parentIds, pagination);
      for (const [parentId, childIds] of childIdsByParent) {
        const connection = connections.get(parentId);

        expect({
          pagination,
          parentId,
          summary: connection && summarize(connection),
        }).toStrictEqual({
          pagination,
          parentId,
          summary: expectedPage(childIds, pagination),
        });
      }
    }
  }

  /** Runs a page and collects every SQL statement it issued. */
  async function statementsOf(run: () => Promise<unknown>): Promise<string[]> {
    const spy = vi.spyOn(database.dataSource.logger, "logQuery");
    await run();
    const statements = spy.mock.calls.map(([statement]) => statement);
    spy.mockRestore();
    return statements;
  }

  /** The ids of a parent's children, in the order its connection pages them. */
  function idsOf(entities: readonly { id: string }[] | undefined): string[] {
    return (entities ?? []).map((entity) => entity.id);
  }

  beforeAll(async () => {
    database = await startLexicoDatabaseTestingModule([
      Author,
      Line,
      Text,
      Token,
      Word,
    ]);
    service = new LiteratureRelationsService(
      database.repository(Line),
      database.repository(Text),
      database.repository(Token),
    );

    authors["vergil"] = await database
      .repository(Author)
      .save(Object.assign(new Author(), { name: "Vergil", slug: "vergil" }));
    authors["ovid"] = await database
      .repository(Author)
      .save(Object.assign(new Author(), { name: "Ovid", slug: "ovid" }));
    authors["cicero"] = await database
      .repository(Author)
      .save(Object.assign(new Author(), { name: "Cicero", slug: "cicero" }));

    const { ovid, vergil } = authors;
    texts["aeneid"] = await seedText("Aeneid", vergil);
    texts["eclogues"] = await seedText("Eclogues", vergil);
    texts["georgics"] = await seedText("Georgics", vergil);
    texts["amores"] = await seedText("Amores", ovid);
    texts["bookTwo"] = await seedText("Book II", vergil, texts["aeneid"]);
    texts["bookOne"] = await seedText("Book I", vergil, texts["aeneid"]);
    texts["bookThree"] = await seedText("Book III", vergil, texts["aeneid"]);
    texts["elegy"] = await seedText("Elegy", ovid, texts["amores"]);

    const { aeneid, georgics } = texts;
    lines["aeneid"] = await seedLines(aeneid, 9);
    lines["georgics"] = await seedLines(georgics, 3);

    const [first, second, third] = lines["aeneid"];
    if (!first || !second || !third) {
      throw new Error("Seeding the lines saved nothing");
    }
    tokens["first"] = await seedTokens(first, [
      "arma",
      " ",
      "virumque",
      " ",
      "cano",
      ",",
      "Troiae",
    ]);
    tokens["second"] = await seedTokens(second, ["qui", " ", "primus"]);
    tokens["third"] = [];
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await database.close();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  it(
    "pages every line's tokens at once, each exactly as the original slicing pages it",
    { timeout: MATRIX_TIMEOUT_MILLISECONDS },
    async () => {
      expect.hasAssertions();

      const [first, second, third] = lines["aeneid"] ?? [];
      const all = await service.listTokensByLine([
        first?.id ?? "",
        second?.id ?? "",
      ]);

      expect(
        all.get(first?.id ?? "")?.edges.map((edge) => edge.node.data),
      ).toStrictEqual(["arma", " ", "virumque", " ", "cano", ",", "Troiae"]);
      expect(all.get(first?.id ?? "")?.edges[0]?.node).toMatchObject({
        index: 0,
        line: { id: first?.id, text: { author: { slug: "vergil" } } },
        text: { id: texts["aeneid"]?.id },
      });

      await expectMatrixAgreement(
        new Map([
          [first?.id ?? "", idsOf(tokens["first"])],
          [second?.id ?? "", idsOf(tokens["second"])],
          [third?.id ?? "", idsOf(tokens["third"])],
        ]),
        async (parentIds, pagination) =>
          service.listTokensByLine(parentIds, pagination),
        false,
      );
    },
  );

  it(
    "pages every text's lines at once in index order",
    { timeout: MATRIX_TIMEOUT_MILLISECONDS },
    async () => {
      expect.hasAssertions();

      const all = await service.listLinesByText([texts["aeneid"]?.id ?? ""]);

      expect(
        all
          .get(texts["aeneid"]?.id ?? "")
          ?.edges.map((edge) => edge.node.index),
      ).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);

      await expectMatrixAgreement(
        new Map([
          [texts["aeneid"]?.id ?? "", idsOf(lines["aeneid"])],
          [texts["eclogues"]?.id ?? "", []],
          [texts["georgics"]?.id ?? "", idsOf(lines["georgics"])],
        ]),
        async (parentIds, pagination) =>
          service.listLinesByText(parentIds, pagination),
      );
    },
  );

  it(
    "pages every text's children and every author's texts at once in title order",
    { timeout: MATRIX_TIMEOUT_MILLISECONDS },
    async () => {
      expect.hasAssertions();

      const books = [texts["bookOne"], texts["bookTwo"], texts["bookThree"]];
      const vergilTexts = [
        texts["aeneid"],
        texts["bookOne"],
        texts["bookTwo"],
        texts["bookThree"],
        texts["eclogues"],
        texts["georgics"],
      ];
      const children = await service.listChildTextsByParent([
        texts["aeneid"]?.id ?? "",
      ]);

      expect(
        children
          .get(texts["aeneid"]?.id ?? "")
          ?.edges.map((edge) => edge.node.title),
      ).toStrictEqual(["Book I", "Book II", "Book III"]);
      expect(
        children.get(texts["aeneid"]?.id ?? "")?.edges[0]?.node,
      ).toMatchObject({
        author: { slug: "vergil" },
        parentText: { author: { slug: "vergil" }, id: texts["aeneid"]?.id },
      });

      await expectMatrixAgreement(
        new Map([
          [
            texts["aeneid"]?.id ?? "",
            idsOf(books.flatMap((book) => book ?? [])),
          ],
          [
            texts["amores"]?.id ?? "",
            idsOf(texts["elegy"] && [texts["elegy"]]),
          ],
        ]),
        async (parentIds, pagination) =>
          service.listChildTextsByParent(parentIds, pagination),
      );
      await expectMatrixAgreement(
        new Map([
          [authors["cicero"]?.id ?? "", []],
          [
            authors["ovid"]?.id ?? "",
            idsOf(
              [texts["amores"], texts["elegy"]].flatMap((text) => text ?? []),
            ),
          ],
          [
            authors["vergil"]?.id ?? "",
            idsOf(vergilTexts.flatMap((text) => text ?? [])),
          ],
        ]),
        async (parentIds, pagination) =>
          service.listTextsByAuthor(parentIds, pagination),
      );
    },
  );

  it("costs the same statements for one line as for every line, however many tokens", async () => {
    expect.hasAssertions();

    const lineIds = idsOf(lines["aeneid"]);
    const afterFirst = toCursor({ id: tokens["first"]?.[1]?.id });
    const one = await statementsOf(async () =>
      service.listTokensByLine(lineIds.slice(0, 1), { first: 2 }),
    );
    const every = await statementsOf(async () =>
      service.listTokensByLine(lineIds, { first: 2 }),
    );
    const everyWithCursor = await statementsOf(async () =>
      service.listTokensByLine(lineIds, { after: afterFirst, first: 2 }),
    );

    expect(one).toHaveLength(2);
    expect(every).toHaveLength(2);
    expect(everyWithCursor).toHaveLength(3);
    expect(
      every.filter((statement) => statement.includes('"words"')),
    ).toHaveLength(1);
  });

  it("bounds each parent by its own cursor when a batch carries cursors from two parents", async () => {
    expect.hasAssertions();

    const [first, second, third] = lines["aeneid"] ?? [];
    const childIds = new Map([
      [first?.id ?? "", idsOf(tokens["first"])],
      [second?.id ?? "", idsOf(tokens["second"])],
      [third?.id ?? "", idsOf(tokens["third"])],
    ]);
    const request = {
      after: toCursor({ id: tokens["first"]?.[2]?.id }),
      before: toCursor({ id: tokens["second"]?.[2]?.id }),
      first: 2,
    };

    const connections = await service.listTokensByLine(
      [...childIds.keys()],
      request,
    );

    expect(
      [...childIds].map(([parentId]) =>
        summarize(connections.get(parentId) ?? createEmptyConnection()),
      ),
    ).toStrictEqual(
      [...childIds.values()].map((ids) => expectedPage(ids, request)),
    );
  });

  it("ignores a cursor naming no child of any requested parent", async () => {
    expect.hasAssertions();

    const lineIds = idsOf(lines["aeneid"]);
    const stranger = toCursor({ id: randomUUID() });
    const plain = await service.listTokensByLine(lineIds, { first: 2 });

    await expect(
      service.listTokensByLine(lineIds, { after: stranger, first: 2 }),
    ).resolves.toStrictEqual(plain);
    await expect(
      service.listTokensByLine(lineIds, { before: stranger, first: 2 }),
    ).resolves.toStrictEqual(plain);
  });

  it("finds each text's parent with its author in one statement, and null for a top-level or unknown text", async () => {
    expect.hasAssertions();

    const unknown = randomUUID();
    const textIds = [
      texts["bookOne"]?.id ?? "",
      texts["elegy"]?.id ?? "",
      texts["aeneid"]?.id ?? "",
      unknown,
    ];
    let parents = new Map<string, null | Text>();
    const statements = await statementsOf(async () => {
      parents = await service.findParentTexts(textIds);
    });

    expect(statements).toHaveLength(1);
    expect(parents.get(texts["bookOne"]?.id ?? "")).toMatchObject({
      author: { slug: "vergil" },
      title: "Aeneid",
    });
    expect(parents.get(texts["elegy"]?.id ?? "")?.title).toBe("Amores");
    expect(parents.get(texts["aeneid"]?.id ?? "")).toBeNull();
    expect(parents.has(unknown)).toBe(false);
    await expect(service.findParentTexts([])).resolves.toStrictEqual(new Map());
    await expect(service.listTokensByLine([])).resolves.toStrictEqual(
      new Map(),
    );
  });
});
