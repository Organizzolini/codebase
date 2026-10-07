/* cspell:words diligo FULLTEXT puella puellam puellamque tabula vocabant voco */

import { createMock } from "@golevelup/ts-vitest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
import { MacronsService } from "../macrons/macrons.service";

import { SearchMatchSource } from "./search.entities";
import { SearchService } from "./search.service";

import type { DatabaseTestingModule } from "@codebase/database/testing";
import type { LoggerService } from "@codebase/logging";

/** One headword to seed, with the English senses it translates to. */
interface SeededLexeme {
  readonly forms?: readonly Form[];
  readonly lemma: string;
  readonly meanings: readonly string[];
  readonly partOfSpeech: PartOfSpeech;
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
});
