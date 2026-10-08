// 🏷️ Types

/** The `WordForm` relation the API exposes: the form side of the link. */
export type WordFormRelationField = "form";

/**
 * The `WordForm` relation a resolver exposes instead of the object: the word
 * side of the link, which `WordFormResolver` loads.
 */
export type WordFormResolvedField = "word";

/** The `WordLexeme` relation the API exposes: the lexeme side of the link. */
export type WordLexemeRelationField = "lexeme";

/**
 * The `WordLexeme` relation a resolver exposes instead of the object: the
 * word side of the link, which `WordLexemeResolver` loads.
 */
export type WordLexemeResolvedField = "word";

/** The `Word` relations the API exposes, each as its own GraphQL type. */
export type WordRelationField = "wordForms" | "wordLexemes";
