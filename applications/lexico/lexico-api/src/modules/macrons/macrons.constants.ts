// ♟️ Constants

/**
 * Unicode combining diacritical marks, which carry a macron once a string is
 * decomposed to NFD. Matches what `lexico-cli` strips from every stored
 * lemma and word, so a query cleaned with it compares equal to stored data.
 */
export const COMBINING_DIACRITICS_PATTERN = /[̀-ͯ]/gu;
