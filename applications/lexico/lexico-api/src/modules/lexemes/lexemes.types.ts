// 🏷️ Types

/**
 * The `Lexeme` column the API does not expose: the junction rows to the
 * words that can represent it, which the API reaches from the word instead.
 */
export type LexemeDatabaseOnlyField = "wordLexemes";

/** The `Lexeme` relations the API exposes, each as its own GraphQL type. */
export type LexemeRelationField =
  | "forms"
  | "inflection"
  | "principalParts"
  | "pronunciations"
  | "translations";

/** The `PrincipalPart` column the API does not expose: the join to its lexeme. */
export type PrincipalPartDatabaseOnlyField = "lexeme";

/** The `Pronunciation` column the API does not expose: the join to its lexeme. */
export type PronunciationDatabaseOnlyField = "lexeme";

/**
 * The `Translation` columns the API does not expose: the join to its lexeme,
 * and the generated full-text search vector English search ranks by.
 */
export type TranslationDatabaseOnlyField =
  | "lexeme"
  | "translationFullTextSearch";
