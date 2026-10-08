/* cspell:words amatoria amores carmina FLACCUS Horatius natus nondum nunc omnia ORATORE oratore Ovidius poetica Quintus satirae valerius vergil vinum */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";

import {
  DATABASE_TIMEOUT_MILLISECONDS,
  startLexicoDatabaseTestingModule,
} from "../../../testing/database";
import {
  type LiteratureSearchCorpus,
  seedLiteratureSearchCorpus,
} from "../../../testing/literature-search-corpus";
import { expectLiteratureSearchPagination } from "../../../testing/literature-search-pagination";

import { LiteratureService } from "./literature.service";

import type { Connection } from "../../lexico-api.types";
import type { DatabaseTestingModule } from "@codebase/database/testing";

/** Lists a connection's node ids in edge order. */
function ids<Node extends { id: string }>(
  connection: Connection<Node>,
): string[] {
  return connection.edges.map((edge) => edge.node.id);
}

/** Lists rows' ids in the order given. */
function idsOf(rows: readonly { id: string }[]): string[] {
  return rows.map((row) => row.id);
}

/**
 * Searches a real `lexico_testing` database, built by lexico's migrations and
 * seeded once with a small corpus, so author, text, and line matching, the
 * author and text filters, and Relay pagination all run as real SQL.
 */
describe("literature search service integration suite", () => {
  let corpus: LiteratureSearchCorpus;
  let database: DatabaseTestingModule;
  let service: LiteratureService;

  beforeAll(async () => {
    database = await startLexicoDatabaseTestingModule([
      Author,
      Line,
      Text,
      Token,
      Word,
    ]);
    service = new LiteratureService(
      database.repository(Author),
      database.repository(Line),
      database.repository(Text),
      database.repository(Token),
    );
    corpus = await seedLiteratureSearchCorpus(database);
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await database.close();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  describe("searchAuthors", () => {
    it("matches author names case-insensitively, ordered by name", async () => {
      expect.hasAssertions();

      const result = await service.searchAuthors("FLACCUS");

      expect(ids(result)).toStrictEqual([
        corpus.author("valerius-flaccus").id,
        corpus.author("horace").id,
      ]);
      expect(result.totalCount).toBe(2);
    });

    it("matches an author by slug when the name does not contain the query", async () => {
      expect.hasAssertions();

      const result = await service.searchAuthors("  horace  ");

      expect(ids(result)).toStrictEqual([corpus.author("horace").id]);
      expect(result.edges[0]?.node.name).toBe("Quintus Horatius Flaccus");
    });

    it.each([
      ["a blank query", "   "],
      ["an unmatched query", "vergil"],
    ])("returns an empty connection for %s", async (_label, query) => {
      expect.hasAssertions();

      const result = await service.searchAuthors(query);

      expect(result.edges).toStrictEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo).toMatchObject({
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it("pages through matching authors under the Relay invariants", async () => {
      expect.hasAssertions();

      const matched = await expectLiteratureSearchPagination(
        async (pagination) => service.searchAuthors("a", pagination),
        2,
      );

      expect(matched).toStrictEqual([
        corpus.author("valerius-flaccus").id,
        corpus.author("cicero").id,
        corpus.author("ovid").id,
        corpus.author("horace").id,
      ]);
    });
  });

  describe("searchTexts", () => {
    it("matches text titles case-insensitively, with the author loaded", async () => {
      expect.hasAssertions();

      const result = await service.searchTexts("DE ORATORE");

      expect(ids(result)).toStrictEqual([corpus.text("cicero/oratore").id]);
      expect(result.edges[0]?.node.author.id).toBe(corpus.author("cicero").id);
    });

    it("matches texts by slug, ordered by title", async () => {
      expect.hasAssertions();

      const result = await service.searchTexts("horace/");

      expect(ids(result)).toStrictEqual([
        corpus.text("horace/ars-poetica").id,
        corpus.text("horace/carmina").id,
        corpus.text("horace/satirae").id,
      ]);
    });

    it("keeps only the given author's texts among title and slug matches", async () => {
      expect.hasAssertions();

      const everyAuthor = await service.searchTexts("ars");
      const horace = await service.searchTexts(
        "ars",
        corpus.author("horace").id,
      );

      expect(ids(everyAuthor)).toStrictEqual([
        corpus.text("ovid/ars-amatoria").id,
        corpus.text("horace/ars-poetica").id,
      ]);
      expect(ids(horace)).toStrictEqual([corpus.text("horace/ars-poetica").id]);
      expect(horace.totalCount).toBe(1);
    });

    it.each([
      ["a blank query", "   ", undefined],
      ["an unmatched query", "vergil", undefined],
      ["an author without a matching text", "ars", "cicero"],
    ] as const)(
      "returns an empty connection for %s",
      async (_label, query, authorSlug) => {
        expect.hasAssertions();

        const result = await service.searchTexts(
          query,
          authorSlug && corpus.author(authorSlug).id,
        );

        expect(result.edges).toStrictEqual([]);
        expect(result.totalCount).toBe(0);
      },
    );

    it("pages through every matching text under the Relay invariants", async () => {
      expect.hasAssertions();

      const matched = await expectLiteratureSearchPagination(
        async (pagination) => service.searchTexts("o", null, pagination),
        3,
      );

      expect(matched).toHaveLength(8);
    });

    it("pages through one author's matching texts under the Relay invariants", async () => {
      expect.hasAssertions();

      const matched = await expectLiteratureSearchPagination(
        async (pagination) =>
          service.searchTexts("o", corpus.author("ovid").id, pagination),
        2,
      );

      expect(matched).toStrictEqual([
        corpus.text("ovid/amores").id,
        corpus.text("ovid/ars-amatoria").id,
        corpus.text("ovid/metamorphoses").id,
      ]);
    });
  });

  describe("searchLines", () => {
    /** The seeded lines whose content contains "amor", in any case. */
    function amorLines(): Line[] {
      return corpus.lines.filter((line) =>
        line.data.toLowerCase().includes("amor"),
      );
    }

    it("matches line content case-insensitively across the whole library", async () => {
      expect.hasAssertions();

      const result = await service.searchLines("amor");

      // 🔢 The seeded matches sit at line indexes 1, 2, and 3: index order.
      expect(ids(result)).toStrictEqual(idsOf(amorLines()));
      expect(result.totalCount).toBe(3);
    });

    it("matches line content within one text, in index order, with the text loaded", async () => {
      expect.hasAssertions();

      const carmina = corpus.text("horace/carmina");
      const result = await service.searchLines("amor", carmina.id);

      expect(ids(result)).toStrictEqual(
        idsOf(amorLines().filter((line) => line.text.id === carmina.id)),
      );
      expect(result.edges.map((edge) => edge.node.data)).toStrictEqual([
        "nunc amor et vinum",
        "AMOR vincit omnia",
      ]);
      expect(result.edges[0]?.node.text.id).toBe(carmina.id);
    });

    it.each([
      ["a blank query", "   ", undefined],
      ["an unmatched query", "vergil", undefined],
      ["a text without a matching line", "amor", "cicero/oratore"],
    ] as const)(
      "returns an empty connection for %s",
      async (_label, query, textSlug) => {
        expect.hasAssertions();

        const result = await service.searchLines(
          query,
          textSlug && corpus.text(textSlug).id,
        );

        expect(result.edges).toStrictEqual([]);
        expect(result.totalCount).toBe(0);
      },
    );

    it("pages through library-wide line matches under the Relay invariants", async () => {
      expect.hasAssertions();

      const matched = await expectLiteratureSearchPagination(
        async (pagination) => service.searchLines("amor", null, pagination),
        2,
      );

      expect(matched).toStrictEqual(idsOf(amorLines()));
    });

    it("pages through one text's line matches under the Relay invariants", async () => {
      expect.hasAssertions();

      const metamorphoses = corpus.text("ovid/metamorphoses");
      const matched = await expectLiteratureSearchPagination(
        async (pagination) =>
          service.searchLines("a", metamorphoses.id, pagination),
        3,
      );

      expect(matched).toStrictEqual(
        idsOf(corpus.lines.filter((line) => line.text.id === metamorphoses.id)),
      );
    });
  });

  describe("searchLiterature", () => {
    it("combines author, text, and line matches for one query", async () => {
      expect.hasAssertions();

      const result = await service.searchLiterature("ovid");

      expect(idsOf(result.authors)).toStrictEqual([corpus.author("ovid").id]);
      expect(idsOf(result.texts)).toStrictEqual([
        corpus.text("ovid/amores").id,
        corpus.text("ovid/ars-amatoria").id,
        corpus.text("ovid/metamorphoses").id,
      ]);
      expect(result.lines.map((line) => line.data)).toStrictEqual([
        "Ovidius nondum natus erat",
      ]);
    });

    it("narrows only the texts to the given author", async () => {
      expect.hasAssertions();

      const result = await service.searchLiterature(
        "ovid",
        corpus.author("cicero").id,
      );

      expect(idsOf(result.authors)).toStrictEqual([corpus.author("ovid").id]);
      expect(result.texts).toStrictEqual([]);
      expect(result.lines).toHaveLength(1);
    });

    it("returns every match rather than a first page", async () => {
      expect.hasAssertions();

      const result = await service.searchLiterature("o");

      expect(result.texts).toHaveLength(8);
      expect(result.lines.length).toBeGreaterThan(8);
    });

    it.each([
      ["a blank query", "   "],
      ["an unmatched query", "vergil"],
    ])("returns nothing for %s", async (_label, query) => {
      expect.hasAssertions();

      await expect(service.searchLiterature(query)).resolves.toStrictEqual({
        authors: [],
        lines: [],
        texts: [],
      });
    });
  });
});
