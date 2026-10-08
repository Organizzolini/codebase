// ♟️ Constants

/**
 * The relations a word lookup joins: every form and lexeme the word links
 * to, each lexeme with the relations a lexeme lookup returns.
 */
export const WORD_RELATIONS = {
  wordForms: { form: true },
  wordLexemes: {
    lexeme: {
      forms: true,
      inflection: true,
      principalParts: true,
      pronunciations: true,
      translations: true,
    },
  },
} as const;
