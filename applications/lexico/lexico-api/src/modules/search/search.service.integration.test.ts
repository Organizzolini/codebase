/* cspell:words ILIKE duco fero gero laudove veho laudo laudō lupusve virum virumve cantonis cantor cantorum cantoque cantosum diligo incanto FULLTEXT porto puella puellam puellamque tabula vocabant voco */

import { createMock } from "@golevelup/ts-vitest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  FiniteVerbForm,
  type Form,
  Lexeme,
  NominalForm,
  type PartOfSpeech,
  Translation,
  Word,
  WordForm,
  WordLexeme,
} from "@codebase/lexico-entities";

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
import { MacronsService } from "../macrons/macrons.service";

import { SearchMatchSource } from "./search.entities";
import { SearchService } from "./search.service";

import type { Connection } from "../../lexico-api.types";
import type { LexemeSearchMatch } from "./search.types";
import type { DatabaseTestingModule } from "@codebase/database/testing";
import type { LoggerService } from "@codebase/logging";

/** One headword to seed, with the English senses it translates to. */
interface SeededLexeme {
  readonly forms?: readonly Form[];
  readonly lemma: string;
  readonly meanings: readonly string[];
  readonly partOfSpeech: PartOfSpeech;
}

/** Each boundary matrix issues a few hundred statements, which a slow runner needs time for. */
const MATRIX_TIMEOUT_MILLISECONDS = 120_000;

/** A search connection as a GraphQL client observes it, with nodes reduced to ids. */
function summarizeSearch(
  connection: Connection<LexemeSearchMatch>,
): ReturnType<typeof summarize> {
  return summarize({
    ...connection,
    edges: connection.edges.map((edge) => ({
      cursor: edge.cursor,
      node: { id: edge.node.lexeme.id },
    })),
  });
}

/**
 * Searches a real `lexico_testing` database, built by lexico's migrations,
 * so each tier's SQL — exact and prefix headwords, inflected words, and
 * English full-text ranking — runs against the schema the API reads.
 */
describe("search service integration suite", () => {
  let database: DatabaseTestingModule;
  let service: SearchService;

  /** Saves a lexeme with its translations and forms, cascading all three. */
  async function seedLexeme(seed: SeededLexeme): Promise<Lexeme> {
    const lexeme = new Lexeme();
    lexeme.lemma = seed.lemma;
    lexeme.partOfSpeech = seed.partOfSpeech;
    lexeme.forms = [...(seed.forms ?? [])];
    lexeme.translations = seed.meanings.map(
      (meaning) => new Translation(meaning, lexeme),
    );

    return database.repository(Lexeme).save(lexeme);
  }

  /** Saves an inflected word linked to one form of one lexeme. */
  async function seedWord(
    data: string,
    lexeme: Lexeme,
    form: Form,
  ): Promise<void> {
    const word = new Word();
    word.data = data;
    const savedWord = await database.repository(Word).save(word);

    const wordForm = new WordForm();
    wordForm.form = form;
    wordForm.word = savedWord;
    await database.repository(WordForm).save(wordForm);

    const wordLexeme = new WordLexeme();
    wordLexeme.lexeme = lexeme;
    wordLexeme.word = savedWord;
    await database.repository(WordLexeme).save(wordLexeme);
  }

  beforeAll(async () => {
    database = await startLexicoDatabaseTestingModule([
      Lexeme,
      Translation,
      Word,
      WordForm,
      WordLexeme,
    ]);
    service = new SearchService(
      database.repository(Lexeme),
      database.repository(Word),
      database.repository(Translation),
      new MacronsService(),
      createMock<LoggerService>(),
    );
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await database.close();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  it("integrates Latin dictionary search across word forms and enclitic parsing", async () => {
    expect.hasAssertions();

    const accusative = new NominalForm();
    accusative.case = "accusative";
    accusative.number = "singular";
    const puella = await seedLexeme({
      forms: [accusative],
      lemma: "puella",
      meanings: ["girl"],
      partOfSpeech: "noun",
    });
    await seedWord("puellam", puella, accusative);

    const result = await service.searchLatin("puellamque");

    expect(result.totalCount).toBe(1);
    expect(result.edges[0]?.node).toMatchObject({
      enclitic: "que",
      lexeme: { id: puella.id },
      source: SearchMatchSource.WORD_EXACT,
    });
    expect(result.edges[0]?.node.identifiers).toContain("accusative singular");
    expect(result.pageInfo.startCursor).toBeDefined();
    expect(result.pageInfo.endCursor).toBeDefined();
  });

  it("matches a headword both whole and as a stem with its enclitic split off", async () => {
    expect.hasAssertions();

    const si = await seedLexeme({
      lemma: "si",
      meanings: ["if"],
      partOfSpeech: "conjunction",
    });
    const sine = await seedLexeme({
      lemma: "sine",
      meanings: ["without"],
      partOfSpeech: "preposition",
    });

    const result = await service.searchLatin("sine");
    const nodes = new Map(
      result.edges.map((edge) => [edge.node.lexeme.id, edge.node]),
    );

    // 🧩 The whole query keeps no enclitic; its stem carries the split-off "-ne".
    expect(result.totalCount).toBe(2);
    expect(nodes.get(sine.id)).toMatchObject({
      enclitic: null,
      source: SearchMatchSource.LEMMA_EXACT,
    });
    expect(nodes.get(si.id)).toMatchObject({
      enclitic: "ne",
      source: SearchMatchSource.LEMMA_EXACT,
    });
  });

  it("integrates Relay keyset pagination forward and backward on multi-page search results", async () => {
    expect.hasAssertions();

    for (let index = 1; index <= 5; index++) {
      await seedLexeme({
        lemma: `tabula${index}`,
        meanings: [`board ${index}`],
        partOfSpeech: "noun",
      });
    }

    const page1 = await service.searchLatin("tabula", { first: 2 });

    expect(page1.totalCount).toBe(5);
    expect(page1.edges).toHaveLength(2);
    expect(page1.pageInfo.hasNextPage).toBe(true);
    expect(page1.pageInfo.hasPreviousPage).toBe(false);

    const page2 = await service.searchLatin("tabula", {
      after: page1.pageInfo.endCursor,
      first: 2,
    });

    expect(page2.edges).toHaveLength(2);
    expect(page2.pageInfo.hasNextPage).toBe(true);
    expect(page2.pageInfo.hasPreviousPage).toBe(true);

    const page3 = await service.searchLatin("tabula", {
      after: page2.pageInfo.endCursor,
      first: 2,
    });

    expect(page3.edges).toHaveLength(1);
    expect(page3.pageInfo.hasNextPage).toBe(false);
    expect(page3.pageInfo.hasPreviousPage).toBe(true);

    const backwardPage = await service.searchLatin("tabula", {
      before: page3.pageInfo.startCursor,
      last: 2,
    });

    expect(backwardPage.edges).toHaveLength(2);
    expect(backwardPage.edges[0]?.node.lexeme.id).toBe(
      page2.edges[0]?.node.lexeme.id,
    );
  });

  it("integrates English full-text search with database ranking and lexeme hydration", async () => {
    expect.hasAssertions();

    const amo = await seedLexeme({
      lemma: "amo",
      meanings: ["love, to cherish", "beloved, dear"],
      partOfSpeech: "verb",
    });
    const diligo = await seedLexeme({
      lemma: "diligo",
      meanings: ["love"],
      partOfSpeech: "verb",
    });
    await seedLexeme({
      lemma: "Amor",
      meanings: ["Love, the god"],
      partOfSpeech: "properNoun",
    });

    const result = await service.searchEnglish("love");

    // 🎯 The exact translation outranks the prefix one; proper nouns never rank.
    expect(result.totalCount).toBe(2);
    expect(result.edges.map((edge) => edge.node.lexeme.id)).toStrictEqual([
      diligo.id,
      amo.id,
    ]);
    expect(result.edges[0]?.node.score).toBeGreaterThan(
      result.edges[1]?.node.score ?? Number.POSITIVE_INFINITY,
    );
    expect(result.edges[1]?.node.lexeme.translations).toHaveLength(2);
    expect(result.edges[0]?.node.source).toBe(
      SearchMatchSource.TRANSLATION_FULLTEXT,
    );
  });

  it("handles finite verb morphological identifier resolution in search", async () => {
    expect.hasAssertions();

    const imperfect = new FiniteVerbForm();
    imperfect.mood = "indicative";
    imperfect.number = "plural";
    imperfect.person = "third";
    imperfect.tense = "imperfect";
    imperfect.voice = "active";
    const voco = await seedLexeme({
      forms: [imperfect],
      lemma: "voco",
      meanings: ["call"],
      partOfSpeech: "verb",
    });
    await seedWord("vocabant", voco, imperfect);

    const result = await service.searchLatin("vocabant");

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.node.lexeme.id).toBe(voco.id);
    expect(result.edges[0]?.node.identifiers).toContain(
      "third person plural imperfect active indicative",
    );
  });

  describe("pagination", () => {
    /**
     * Asserts every page of a search agrees with slicing its whole, ranked
     * result list in memory, the way search paged before it paged in SQL.
     */
    async function expectSearchMatrixAgreement(
      search: (
        pagination: PageRequest,
      ) => Promise<Connection<LexemeSearchMatch>>,
      outsiderId: string,
    ): Promise<string[]> {
      const all = await search({});
      const ids = all.edges.map((edge) => edge.node.lexeme.id);
      const scores = new Map(
        all.edges.map((edge) => [edge.node.lexeme.id, edge.node.score]),
      );
      const cursorOf = (id: string): string =>
        toCursor({ id, score: scores.get(id) ?? 0 });

      for (const pagination of paginationMatrix(ids, outsiderId, {
        cursorOf,
      })) {
        expect({
          pagination,
          summary: summarizeSearch(await search(pagination)),
        }).toStrictEqual({
          pagination,
          summary: expectedPage(ids, pagination, cursorOf),
        });
      }
      return ids;
    }

    it(
      "ranks a tiered Latin search by score then id and pages it on every boundary",
      { timeout: MATRIX_TIMEOUT_MILLISECONDS },
      async () => {
        expect.hasAssertions();

        const present = new NominalForm();
        present.case = "nominative";
        present.number = "singular";
        const canto = await seedLexeme({
          forms: [present],
          lemma: "canto",
          meanings: ["sing"],
          partOfSpeech: "verb",
        });
        await seedWord("canto", canto, present);
        const que = await seedLexeme({
          lemma: "-que",
          meanings: ["and"],
          partOfSpeech: "conjunction",
        });
        const prefixed = await Promise.all(
          ["cantor", "cantorum", "cantonis"].map(async (lemma) =>
            seedLexeme({ lemma, meanings: [lemma], partOfSpeech: "noun" }),
          ),
        );
        const incanto = await seedLexeme({
          lemma: "incanto",
          meanings: ["enchant"],
          partOfSpeech: "verb",
        });
        const untranslated = await seedLexeme({
          lemma: "cantosum",
          meanings: [],
          partOfSpeech: "adjective",
        });

        const ids = await expectSearchMatrixAgreement(
          async (pagination) => service.searchLatin("cantoque", pagination),
          untranslated.id,
        );
        const all = await service.searchLatin("cantoque");

        expect(ids).toStrictEqual([
          canto.id,
          que.id,
          ...prefixed.map((lexeme) => lexeme.id).toSorted(),
          incanto.id,
        ]);
        expect(
          all.edges.map((edge) => [
            edge.node.source,
            edge.node.score,
            edge.node.enclitic,
          ]),
        ).toStrictEqual([
          [SearchMatchSource.LEMMA_EXACT, 1, "que"],
          [SearchMatchSource.ENCLITIC, 0.8, null],
          [SearchMatchSource.PREFIX, 0.7, null],
          [SearchMatchSource.PREFIX, 0.7, null],
          [SearchMatchSource.PREFIX, 0.7, null],
          [SearchMatchSource.FUZZY, 0.4, null],
        ]);
        expect(all.edges[0]?.node.identifiers).toStrictEqual([
          "nominative singular",
        ]);
        expect(all.totalCount).toBe(6);
      },
    );

    it(
      "ranks an English search by its best translation then id and pages it on every boundary",
      { timeout: MATRIX_TIMEOUT_MILLISECONDS },
      async () => {
        expect.hasAssertions();

        const lexemes = await Promise.all(
          [
            { lemma: "porto", meanings: ["carry"] },
            { lemma: "fero", meanings: ["carry, bear"] },
            { lemma: "veho", meanings: ["carry", "convey"] },
            { lemma: "gero", meanings: ["to carry on"] },
          ].map(async (seed) => seedLexeme({ ...seed, partOfSpeech: "verb" })),
        );
        const outsider = await seedLexeme({
          lemma: "duco",
          meanings: ["lead"],
          partOfSpeech: "verb",
        });

        const ids = await expectSearchMatrixAgreement(
          async (pagination) => service.searchEnglish("carry", pagination),
          outsider.id,
        );

        expect(ids).toHaveLength(4);
        expect(ids.slice(0, 2).toSorted()).toStrictEqual(
          [lexemes[0]?.id, lexemes[2]?.id].toSorted(),
        );
      },
    );

    it("ranks every match once and loads only one page of them", async () => {
      expect.hasAssertions();

      const first = await service.searchLatin("tabula", { first: 2 });
      const spy = vi.spyOn(database.dataSource.logger, "logQuery");
      const page = await service.searchLatin("tabula", {
        after: first.pageInfo.endCursor,
        first: 2,
      });
      const statements = spy.mock.calls.map(([statement]) => statement);
      spy.mockRestore();

      expect(page.edges).toHaveLength(2);
      expect(page.totalCount).toBe(5);
      expect(
        statements.filter((statement) => statement.includes("ILIKE")),
      ).toStrictEqual([expect.stringMatching(/MATERIALIZED .* LIMIT 3\)/u)]);
      expect(statements).toHaveLength(3);
    });
  });

  describe("tiers", () => {
    it("adds the enclitic's own entry only once its stem matched a translated lexeme", async () => {
      expect.hasAssertions();

      const ve = await seedLexeme({
        lemma: "-ve",
        meanings: ["or"],
        partOfSpeech: "conjunction",
      });
      const accusative = new NominalForm();
      accusative.case = "accusative";
      accusative.number = "singular";
      const vir = await seedLexeme({
        forms: [accusative],
        lemma: "vir",
        meanings: [],
        partOfSpeech: "noun",
      });
      await seedWord("virum", vir, accusative);
      const laudo = await seedLexeme({
        lemma: "laudo",
        meanings: ["praise"],
        partOfSpeech: "verb",
      });

      const unmatched = await service.searchLatin("lupusve");
      const untranslated = await service.searchLatin("virumve");
      const matched = await service.searchLatin("laudove");

      expect(unmatched.totalCount).toBe(0);
      expect(untranslated.totalCount).toBe(0);
      expect(matched.edges.map((edge) => edge.node.lexeme.id)).toStrictEqual([
        laudo.id,
        ve.id,
      ]);
    });

    it("matches a query written with macrons against headwords written without", async () => {
      expect.hasAssertions();

      const result = await service.searchLatin("laudō");

      expect(result.edges[0]?.node).toMatchObject({
        lexeme: { lemma: "laudo" },
        source: SearchMatchSource.LEMMA_EXACT,
      });
    });

    it("expands no substring tier for a query under three characters", async () => {
      expect.hasAssertions();

      const ab = await seedLexeme({
        lemma: "ab",
        meanings: ["from"],
        partOfSpeech: "preposition",
      });

      const result = await service.searchLatin("ab");

      // 🔍 Each seeded "tabula" contains "ab" but none starts with it.
      expect(result.edges.map((edge) => edge.node.lexeme.id)).toStrictEqual([
        ab.id,
      ]);
    });

    it("caps an English search's ranking in the database", async () => {
      expect.hasAssertions();

      const spy = vi.spyOn(database.dataSource.logger, "logQuery");
      await service.searchEnglish("carry", { first: 1 });
      const statements = spy.mock.calls.map(([statement]) => statement);
      spy.mockRestore();

      expect(
        statements.filter((statement) => statement.includes("LIMIT 200")),
      ).not.toHaveLength(0);
    });
  });
});
