/* cspell:words rosae rosarum rosis */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  type LexicoGraphqlApplication,
  startLexicoGraphqlApplication,
} from "../../../testing/graphql-application";
import { seedWordLookups } from "../../../testing/word-lookups";

import { WordsModule } from "./words.module";

/** Starting Postgres, migrating it, and booting Apollo outlasts a test. */
const APPLICATION_TIMEOUT_MILLISECONDS = 120_000;

/** Every field a client reads off a word, through both junctions. */
const WORD_FIELDS = `
  data
  id
  wordForms {
    form {
      __typename
      ... on NominalForm { case number }
      ... on FiniteVerbForm { mood number person tense voice }
    }
  }
  wordLexemes {
    lexeme {
      forms { __typename }
      inflection {
        __typename
        ... on NounInflection { declension gender }
      }
      lemma
      partOfSpeech
      translations { data }
    }
  }
`;

const WORD_QUERY = `query Word($data: String!) { word(data: $data) { ${WORD_FIELDS} } }`;

const WORDS_QUERY = `query Words($data: [String!]!) { words(data: $data) { data } }`;

/**
 * Serves `WordsModule` over HTTP from a migrated database and asks it the
 * questions the web client asks, so the schema, argument handling, and
 * relation resolution are all exercised together.
 */
describe("words resolver end-to-end suite", () => {
  let application: LexicoGraphqlApplication;

  beforeAll(async () => {
    application = await startLexicoGraphqlApplication([WordsModule]);
    await seedWordLookups(application.repository);
  }, APPLICATION_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await application.stop();
  }, APPLICATION_TIMEOUT_MILLISECONDS);

  describe("word query", () => {
    it("resolves a word's forms and lexeme through the schema", async () => {
      expect.hasAssertions();

      const response = await application.query(WORD_QUERY, { data: "rosae" });

      expect(response.errors).toBeUndefined();
      expect(response.data).toMatchObject({
        word: {
          data: "rosae",
          wordLexemes: [
            {
              lexeme: {
                inflection: {
                  __typename: "NounInflection",
                  declension: "first",
                  gender: "feminine",
                },
                lemma: "rosa",
                partOfSpeech: "noun",
                translations: [{ data: "rose" }],
              },
            },
          ],
        },
      });
      expect(response.data?.["word"]).toHaveProperty("id", expect.any(String));
    });

    it("resolves each form interface to its concrete type", async () => {
      expect.hasAssertions();

      const response = await application.query(WORD_QUERY, { data: "rosae" });

      expect(response.data).toMatchObject({
        word: {
          wordForms: expect.arrayContaining([
            {
              form: {
                __typename: "NominalForm",
                case: "genitive",
                number: "singular",
              },
            },
            {
              form: {
                __typename: "NominalForm",
                case: "dative",
                number: "singular",
              },
            },
            {
              form: {
                __typename: "NominalForm",
                case: "nominative",
                number: "plural",
              },
            },
          ]),
        },
      });
      expect(response.data).toHaveProperty("word.wordForms.length", 3);
    });

    it("resolves a lexeme's forms to their concrete type", async () => {
      expect.hasAssertions();

      const response = await application.query(WORD_QUERY, { data: "rosae" });

      expect(response.data).toMatchObject({
        word: {
          wordLexemes: [
            {
              lexeme: {
                forms: [
                  { __typename: "NominalForm" },
                  { __typename: "NominalForm" },
                  { __typename: "NominalForm" },
                  { __typename: "NominalForm" },
                ],
              },
            },
          ],
        },
      });
    });

    it("resolves every lexeme an ambiguous word can represent", async () => {
      expect.hasAssertions();

      const response = await application.query(WORD_QUERY, { data: "est" });

      expect(response.errors).toBeUndefined();
      expect(response.data).toHaveProperty("word.wordForms.length", 2);
      expect(response.data).toMatchObject({
        word: {
          wordForms: expect.arrayContaining([
            { form: expect.objectContaining({ __typename: "FiniteVerbForm" }) },
          ]),
          wordLexemes: expect.arrayContaining([
            expect.objectContaining({
              lexeme: expect.objectContaining({
                inflection: null,
                lemma: "sum",
              }),
            }),
            expect.objectContaining({
              lexeme: expect.objectContaining({ lemma: "edo" }),
            }),
          ]),
        },
      });
    });

    it("answers null, without errors, for an unknown word", async () => {
      expect.hasAssertions();

      const response = await application.query(WORD_QUERY, { data: "rosis" });

      expect(response).toStrictEqual({ data: { word: null } });
    });

    it("answers null for a soft-deleted word", async () => {
      expect.hasAssertions();

      const response = await application.query(WORD_QUERY, {
        data: "rosarum",
      });

      expect(response).toStrictEqual({ data: { word: null } });
    });

    it("rejects a query without the data argument", async () => {
      expect.hasAssertions();

      const response = await application.query("{ word { data } }");

      expect(response.data).toBeUndefined();
      expect(response.errors?.[0]?.message).toMatch(/argument "data"/u);
    });
  });

  describe("words query", () => {
    it("answers in request order, once per word, omitting misses", async () => {
      expect.hasAssertions();

      const response = await application.query(WORDS_QUERY, {
        data: ["est", "rosis", "rosae", "rosarum", "est"],
      });

      expect(response).toStrictEqual({
        data: { words: [{ data: "est" }, { data: "rosae" }] },
      });
    });

    it("resolves relations for every word in the batch", async () => {
      expect.hasAssertions();

      const response = await application.query(
        `query Words($data: [String!]!) { words(data: $data) { ${WORD_FIELDS} } }`,
        { data: ["rosae", "est"] },
      );

      expect(response.errors).toBeUndefined();
      expect(response.data).toHaveProperty("words.0.data", "rosae");
      expect(response.data).toHaveProperty("words.0.wordForms.length", 3);
      expect(response.data).toHaveProperty("words.0.wordLexemes.length", 1);
      expect(response.data).toHaveProperty("words.1.data", "est");
      expect(response.data).toHaveProperty("words.1.wordForms.length", 2);
      expect(response.data).toHaveProperty("words.1.wordLexemes.length", 2);
    });

    it("answers an empty list for an empty batch", async () => {
      expect.hasAssertions();

      const response = await application.query(WORDS_QUERY, { data: [] });

      expect(response).toStrictEqual({ data: { words: [] } });
    });

    it("rejects a null entry in the batch", async () => {
      expect.hasAssertions();

      const response = await application.query(WORDS_QUERY, {
        data: ["est", null],
      });

      expect(response.data).toBeUndefined();
      expect(response.errors).toHaveLength(1);
    });
  });
});
