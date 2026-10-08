/* cspell:words puella */

import { describe, expect, it } from "vitest";

import {
  Lexeme,
  NominalForm,
  NounInflection,
  PrincipalPart,
  Pronunciation,
  Translation,
  WordLexeme,
} from "@codebase/lexico-entities";

import { NominalFormType } from "./forms/nominal-form.entities";
import { NounInflectionType } from "./inflections/noun-inflection.entities";
import { LexemeType } from "./lexeme.entities";
import { toLexemeType, toTranslationType } from "./lexemes.utilities";
import { PrincipalPartType } from "./principal-part.entities";
import { PronunciationType } from "./pronunciation.entities";
import { TranslationType } from "./translation.entities";

const CREATED_AT = new Date("2025-01-01T00:00:00Z");
const UPDATED_AT = new Date("2025-01-02T00:00:00Z");

/** The shared base columns every mapped row carries in these tests. */
const BASE_COLUMNS = {
  createdAt: CREATED_AT,
  createdBy: null,
  deletedAt: null,
  deletedBy: null,
  updatedAt: UPDATED_AT,
  updatedBy: null,
} as const;

/** Builds a lexeme with every relation loaded, as a lookup returns one. */
function createLexeme(): Lexeme {
  const lexeme = Object.assign(new Lexeme(), {
    ...BASE_COLUMNS,
    disambiguator: 0,
    id: "lexeme-1",
    lemma: "puella",
    partOfSpeech: "noun",
  });
  lexeme.forms = [
    Object.assign(new NominalForm(), {
      case: "nominative",
      id: "form-1",
      number: "singular",
    }),
  ];
  lexeme.inflection = Object.assign(new NounInflection(), {
    declension: "first",
    gender: "feminine",
    id: "inflection-1",
  });
  lexeme.principalParts = [
    Object.assign(new PrincipalPart(), {
      ...BASE_COLUMNS,
      id: "part-1",
      lexeme,
      name: "nominative",
      text: ["puella"],
    }),
  ];
  lexeme.pronunciations = [
    Object.assign(new Pronunciation(), {
      ...BASE_COLUMNS,
      id: "pronunciation-1",
      lexeme,
      phonemes: null,
      phonemic: "/ˈpu.el.la/",
      phonetic: null,
      variant: "classical",
    }),
  ];
  lexeme.translations = [
    Object.assign(new Translation("girl", lexeme), {
      ...BASE_COLUMNS,
      id: "translation-1",
      translationFullTextSearch: "'girl':1",
    }),
  ];
  lexeme.wordLexemes = [new WordLexeme()];
  return lexeme;
}

describe("lexemes utilities suite", () => {
  describe(toLexemeType, () => {
    it("maps a lexeme and every loaded relation to their GraphQL types", () => {
      expect.hasAssertions();

      const mapped = toLexemeType(createLexeme());

      expect(mapped).toBeInstanceOf(LexemeType);
      expect(mapped).toStrictEqual(
        Object.assign(new LexemeType(), {
          ...BASE_COLUMNS,
          disambiguator: 0,
          etymology: undefined,
          forms: [
            Object.assign(new NominalFormType(), {
              case: "nominative",
              id: "form-1",
              number: "singular",
            }),
          ],
          id: "lexeme-1",
          inflection: Object.assign(new NounInflectionType(), {
            declension: "first",
            gender: "feminine",
            id: "inflection-1",
          }),
          lemma: "puella",
          partOfSpeech: "noun",
          principalParts: [
            Object.assign(new PrincipalPartType(), {
              ...BASE_COLUMNS,
              id: "part-1",
              name: "nominative",
              text: ["puella"],
            }),
          ],
          pronunciations: [
            Object.assign(new PronunciationType(), {
              ...BASE_COLUMNS,
              id: "pronunciation-1",
              phonemes: null,
              phonemic: "/ˈpu.el.la/",
              phonetic: null,
              variant: "classical",
            }),
          ],
          translations: [
            Object.assign(new TranslationType(), {
              ...BASE_COLUMNS,
              data: "girl",
              id: "translation-1",
            }),
          ],
        }),
      );
    });

    it("leaves out the junction rows to the words that can represent it", () => {
      expect.hasAssertions();

      expect(toLexemeType(createLexeme())).not.toHaveProperty("wordLexemes");
    });

    it("keeps a relation the query did not join unset, and a null one null", () => {
      expect.hasAssertions();

      const lexeme = Object.assign(new Lexeme(), {
        id: "lexeme-2",
        inflection: null,
        pronunciations: null,
      });

      expect(toLexemeType(lexeme)).toMatchObject({
        forms: undefined,
        id: "lexeme-2",
        inflection: null,
        principalParts: undefined,
        pronunciations: null,
        translations: undefined,
      });
    });
  });

  describe(toTranslationType, () => {
    it("leaves out the lexeme join and the full-text search vector", () => {
      expect.hasAssertions();

      const translation = Object.assign(new Translation("rose", new Lexeme()), {
        id: "translation-2",
        translationFullTextSearch: "'rose':1",
      });
      const mapped = toTranslationType(translation);

      expect(mapped).toBeInstanceOf(TranslationType);
      expect(mapped).toMatchObject({ data: "rose", id: "translation-2" });
      expect(mapped).not.toHaveProperty("lexeme");
      expect(mapped).not.toHaveProperty("translationFullTextSearch");
    });
  });
});
