/* cspell:words amo amor */

import { describe, expect, it } from "vitest";

import {
  Lexeme,
  NominalForm,
  Word,
  WordForm,
  WordLexeme,
} from "@codebase/lexico-entities";

import { NominalFormType } from "../lexemes/forms/nominal-form.entities";
import { LexemeType } from "../lexemes/lexeme.entities";

import { WordFormType } from "./word-form.entities";
import { WordLexemeType } from "./word-lexeme.entities";
import { WordType } from "./word.entities";
import {
  toWordFormType,
  toWordLexemeType,
  toWordType,
} from "./words.utilities";

/** Builds a word whose links loaded their form and lexeme, but not the word. */
function createWord(): Word {
  const word = Object.assign(new Word(), { data: "amor", id: "word-1" });
  word.wordForms = [
    Object.assign(new WordForm(), {
      form: Object.assign(new NominalForm(), {
        case: "nominative",
        id: "form-1",
        number: "singular",
      }),
      id: "word-form-1",
    }),
  ];
  word.wordLexemes = [
    Object.assign(new WordLexeme(), {
      id: "word-lexeme-1",
      lexeme: Object.assign(new Lexeme(), { id: "lexeme-1", lemma: "amor" }),
    }),
  ];
  return word;
}

describe("words utilities suite", () => {
  describe(toWordType, () => {
    it("maps a word and the links it loaded to their GraphQL types", () => {
      expect.hasAssertions();

      const mapped = toWordType(createWord());

      expect(mapped).toBeInstanceOf(WordType);
      expect(mapped).toMatchObject({ data: "amor", id: "word-1" });
      expect(mapped.wordForms[0]).toBeInstanceOf(WordFormType);
      expect(mapped.wordForms[0]?.form).toBeInstanceOf(NominalFormType);
      expect(mapped.wordLexemes[0]).toBeInstanceOf(WordLexemeType);
      expect(mapped.wordLexemes[0]?.lexeme).toBeInstanceOf(LexemeType);
      expect(mapped.wordLexemes[0]?.lexeme).toMatchObject({ lemma: "amor" });
    });

    it("leaves the word side of each link to its resolver", () => {
      expect.hasAssertions();

      const mapped = toWordType(createWord());

      expect(mapped.wordForms[0]).not.toHaveProperty("word");
      expect(mapped.wordLexemes[0]).not.toHaveProperty("word");
    });
  });

  describe(toWordFormType, () => {
    it("maps the form side of a word-form link, not the word side", () => {
      expect.hasAssertions();

      const wordForm = Object.assign(new WordForm(), {
        form: Object.assign(new NominalForm(), { id: "form-2" }),
        id: "word-form-2",
        word: Object.assign(new Word(), { data: "amo", id: "word-2" }),
      });
      const mapped = toWordFormType(wordForm);

      expect(mapped).toBeInstanceOf(WordFormType);
      expect(mapped.form).toBeInstanceOf(NominalFormType);
      expect(mapped).not.toHaveProperty("word");
    });
  });

  describe(toWordLexemeType, () => {
    it("maps the lexeme side of a word-lexeme link, not the word side", () => {
      expect.hasAssertions();

      const wordLexeme = Object.assign(new WordLexeme(), {
        id: "word-lexeme-2",
        lexeme: Object.assign(new Lexeme(), { id: "lexeme-2" }),
        word: Object.assign(new Word(), { data: "amo", id: "word-2" }),
      });
      const mapped = toWordLexemeType(wordLexeme);

      expect(mapped).toBeInstanceOf(WordLexemeType);
      expect(mapped.lexeme).toBeInstanceOf(LexemeType);
      expect(mapped).not.toHaveProperty("word");
    });
  });
});
