// ♟️ Constants

/* cspell:words absque atque cumque denique FULLTEXT itaque neque neve paene pleraque plerique plerumque quaeque qualiscumque quandocumque quantuscumque quicque quidque quilibet quinque quisque quivis quodque quoque sive ubique undique unusquisque uterque utrimque */

/**
 * Known Latin enclitic suffixes.
 */
export const ENCLITIC_SUFFIXES = ["que", "ve", "ne"] as const;

/**
 * Common Latin words ending in enclitic-like suffixes that should not be decomposed.
 */
export const ENCLITIC_FALSE_POSITIVES = new Set([
  "absque",
  "atque",
  "bene",
  "cumque",
  "denique",
  "itaque",
  "neque",
  "neve",
  "paene",
  "pleraque",
  "plerique",
  "plerumque",
  "quaeque",
  "qualiscumque",
  "quandocumque",
  "quantuscumque",
  "quicque",
  "quidque",
  "quilibet",
  "quinque",
  "quisque",
  "quivis",
  "quodque",
  "quoque",
  "sive",
  "ubique",
  "undique",
  "unusquisque",
  "uterque",
  "utrimque",
]);

/**
 * Base relevance score constants for search result tiers.
 */
export const SCORE_LEMMA_EXACT = 1;
export const SCORE_WORD_EXACT = 0.9;
export const SCORE_PREFIX = 0.7;
export const SCORE_TRANSLATION_FULLTEXT = 0.6;
export const SCORE_FUZZY = 0.4;
