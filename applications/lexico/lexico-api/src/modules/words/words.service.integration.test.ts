/* cspell:words rosae rosarum rosis */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  FiniteVerbForm,
  NominalForm,
  NounInflection,
  Word,
  WordForm,
  WordLexeme,
} from "@codebase/lexico-entities";

import {
  DATABASE_TIMEOUT_MILLISECONDS,
  startLexicoDatabaseTestingModule,
} from "../../../testing/database";
import {
  type SeededWordLookups,
  seedWordLookups,
} from "../../../testing/word-lookups";

import { WordsService } from "./words.service";

import type { DatabaseTestingModule } from "@codebase/database/testing";

const UNKNOWN_WORD_ID = "00000000-0000-7000-8000-000000000000";

/**
 * Looks words up in a real `lexico_testing` database, built by lexico's
 * migrations, so the junction rows a word reaches its forms and lexemes
 * through are joined by Postgres rather than by a mock.
 */
describe("words service integration suite", () => {
  let database: DatabaseTestingModule;
  let service: WordsService;
  let seeded: SeededWordLookups;

  beforeAll(async () => {
    database = await startLexicoDatabaseTestingModule([
      Word,
      WordForm,
      WordLexeme,
    ]);
    service = new WordsService(
      database.repository(Word),
      database.repository(WordForm),
      database.repository(WordLexeme),
    );
    seeded = await seedWordLookups(database.repository);
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await database.close();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  describe("single word lookup", () => {
    it("resolves every form a word can surface as", async () => {
      expect.hasAssertions();

      const word = await service.findByData("rosae");

      expect(word?.id).toBe(seeded.rosae.id);
      expect(
        word?.wordForms
          .map(({ form }) =>
            form instanceof NominalForm
              ? `${form.case} ${form.number}`
              : form.constructor.name,
          )
          .toSorted(),
      ).toStrictEqual([
        "dative singular",
        "genitive singular",
        "nominative plural",
      ]);
    });

    it("resolves the lexeme behind a word with its eager relations", async () => {
      expect.hasAssertions();

      const word = await service.findByData("rosae");
      const lexeme = word?.wordLexemes[0]?.lexeme;

      expect(word?.wordLexemes).toHaveLength(1);
      expect(lexeme?.lemma).toBe("rosa");
      expect(lexeme?.forms).toHaveLength(4);
      expect(lexeme?.inflection).toBeInstanceOf(NounInflection);
      expect(lexeme?.principalParts).toStrictEqual([]);
      expect(lexeme?.pronunciations).toStrictEqual([]);
      expect(lexeme?.translations?.map(({ data }) => data)).toStrictEqual([
        "rose",
      ]);
    });

    it("resolves every lexeme an ambiguous word can represent", async () => {
      expect.hasAssertions();

      const word = await service.findByData("est");

      expect(
        word?.wordLexemes.map(({ lexeme }) => lexeme.lemma).toSorted(),
      ).toStrictEqual(["edo", "sum"]);
      expect(word?.wordForms).toHaveLength(2);
      expect(
        word?.wordForms.every(({ form }) => form instanceof FiniteVerbForm),
      ).toBe(true);
    });

    it("returns null for a word no row spells", async () => {
      expect.hasAssertions();
      await expect(service.findByData("rosis")).resolves.toBeNull();
    });

    it("matches the stored spelling exactly", async () => {
      expect.hasAssertions();
      await expect(service.findByData("Rosae")).resolves.toBeNull();
    });

    it("hides a soft-deleted word", async () => {
      expect.hasAssertions();
      await expect(service.findByData("rosarum")).resolves.toBeNull();
    });
  });

  describe("batched word lookup", () => {
    it("returns the words in the order they were asked for", async () => {
      expect.hasAssertions();

      const forward = await service.findByDataList(["rosae", "est"]);
      const backward = await service.findByDataList(["est", "rosae"]);

      expect(forward.map(({ data }) => data)).toStrictEqual(["rosae", "est"]);
      expect(backward.map(({ data }) => data)).toStrictEqual(["est", "rosae"]);
    });

    it("omits unknown and soft-deleted words", async () => {
      expect.hasAssertions();

      const words = await service.findByDataList(["rosis", "est", "rosarum"]);

      expect(words.map(({ data }) => data)).toStrictEqual(["est"]);
    });

    it("returns a word asked for twice only once", async () => {
      expect.hasAssertions();

      const words = await service.findByDataList(["est", "rosae", "est"]);

      expect(words.map(({ data }) => data)).toStrictEqual(["est", "rosae"]);
    });

    it("resolves forms and lexemes for every word in the batch", async () => {
      expect.hasAssertions();

      const words = await service.findByDataList(["rosae", "est"]);

      expect(
        words.map((word) => [word.wordForms.length, word.wordLexemes.length]),
      ).toStrictEqual([
        [3, 1],
        [2, 2],
      ]);
    });

    it("skips the database for an empty batch", async () => {
      expect.hasAssertions();
      await expect(service.findByDataList([])).resolves.toStrictEqual([]);
    });
  });

  describe("lookups by id", () => {
    it("resolves words by id and omits unknown ids", async () => {
      expect.hasAssertions();

      const words = await service.findByIds([
        seeded.est.id,
        UNKNOWN_WORD_ID,
        seeded.rosae.id,
      ]);

      expect(words.map(({ data }) => data).toSorted()).toStrictEqual([
        "est",
        "rosae",
      ]);
      expect(words.every(({ wordLexemes }) => wordLexemes.length > 0)).toBe(
        true,
      );
    });

    it("skips the database for an empty id list", async () => {
      expect.hasAssertions();
      await expect(service.findByIds([])).resolves.toStrictEqual([]);
    });

    it("lists the form junction rows of a word with both sides", async () => {
      expect.hasAssertions();

      const rows = await service.findFormRowsByWordId(seeded.est.id);

      expect(rows).toHaveLength(2);
      expect(rows.every(({ word }) => word.id === seeded.est.id)).toBe(true);
      expect(rows.every(({ form }) => form instanceof FiniteVerbForm)).toBe(
        true,
      );
    });

    it("lists the lexeme junction rows of a word with both sides", async () => {
      expect.hasAssertions();

      const rows = await service.findLexemeRowsByWordId(seeded.est.id);

      expect(rows.map(({ lexeme }) => lexeme.id).toSorted()).toStrictEqual(
        [seeded.edo.id, seeded.sum.id].toSorted(),
      );
      expect(rows.every(({ word }) => word.id === seeded.est.id)).toBe(true);
    });

    it("lists no junction rows for an unknown word id", async () => {
      expect.hasAssertions();

      await expect(
        service.findFormRowsByWordId(UNKNOWN_WORD_ID),
      ).resolves.toStrictEqual([]);
      await expect(
        service.findLexemeRowsByWordId(UNKNOWN_WORD_ID),
      ).resolves.toStrictEqual([]);
    });
  });

  describe("junction lookups by spelling", () => {
    it("lists the forms and lexeme links a spelling reaches", async () => {
      expect.hasAssertions();

      const forms = await service.findFormsByData("rosae");
      const links = await service.findLexemeLinksByData("rosae");

      expect(forms).toHaveLength(3);
      expect(links.map(({ lexeme }) => lexeme.id)).toStrictEqual([
        seeded.rosa.id,
      ]);
    });

    it("lists nothing for an unknown spelling", async () => {
      expect.hasAssertions();

      await expect(service.findFormsByData("rosis")).resolves.toStrictEqual([]);
      await expect(
        service.findLexemeLinksByData("rosis"),
      ).resolves.toStrictEqual([]);
    });
  });
});
