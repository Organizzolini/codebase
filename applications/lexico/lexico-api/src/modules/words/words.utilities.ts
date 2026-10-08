import {
  mapRelation,
  mapRelations,
  toDeletableFields,
} from "../../lexico-api.utilities";
import { toFormType } from "../lexemes/forms/forms.utilities";
import { toLexemeType } from "../lexemes/lexemes.utilities";

import { WordFormType } from "./word-form.entities";
import { WordLexemeType } from "./word-lexeme.entities";
import { WordType } from "./word.entities";

import type { MappedFields } from "../../lexico-api.types";
import type {
  WordFormRelationField,
  WordLexemeRelationField,
  WordRelationField,
} from "./words.types";
import type { Word, WordForm, WordLexeme } from "@codebase/lexico-entities";

/** Maps a word-form link, and the form it loaded, to its GraphQL type. */
export function toWordFormType(wordForm: WordForm): WordFormType {
  return Object.assign(new WordFormType(), {
    ...toDeletableFields(wordForm),
    form: mapRelation(wordForm.form, toFormType),
  } satisfies MappedFields<WordFormType, WordFormRelationField>);
}

/** Maps a word-lexeme link, and the lexeme it loaded, to its GraphQL type. */
export function toWordLexemeType(wordLexeme: WordLexeme): WordLexemeType {
  return Object.assign(new WordLexemeType(), {
    ...toDeletableFields(wordLexeme),
    lexeme: mapRelation(wordLexeme.lexeme, toLexemeType),
  } satisfies MappedFields<WordLexemeType, WordLexemeRelationField>);
}

/** Maps a word, and each link it loaded, to its GraphQL type. */
export function toWordType(word: Word): WordType {
  return Object.assign(new WordType(), {
    ...toDeletableFields(word),
    data: word.data,
    wordForms: mapRelations(word.wordForms, toWordFormType),
    wordLexemes: mapRelations(word.wordLexemes, toWordLexemeType),
  } satisfies MappedFields<WordType, WordRelationField>);
}
