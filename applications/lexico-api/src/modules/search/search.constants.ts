// ♟️ Constants

/* cspell:words ILIKE absque atque cumque denique FULLTEXT itaque neque neve paene pleraque plerique plerumque quaeque qualiscumque quandocumque quantuscumque quicque quidque quilibet quinque quisque quivis quodque quoque sive ubique undique unusquisque uterque utrimque */

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
export const SCORE_ENCLITIC = 0.8;
export const SCORE_PREFIX = 0.7;
export const SCORE_TRANSLATION_EXACT = 1;
export const SCORE_TRANSLATION_PREFIX = 0.8;
export const SCORE_TRANSLATION_FULLTEXT = 0.6;
export const SCORE_FUZZY = 0.4;

/**
 * Ranks one matched translation for an English search, given the `exactQuery`
 * and `prefixQuery` parameters: an exact translation outranks one the query
 * starts, which outranks any other substring or full-text match.
 */
export const ENGLISH_MATCH_SCORE_EXPRESSION = `CASE WHEN LOWER(translation.data) = :exactQuery THEN ${SCORE_TRANSLATION_EXACT} WHEN translation.data ILIKE :prefixQuery THEN ${SCORE_TRANSLATION_PREFIX} ELSE ${SCORE_TRANSLATION_FULLTEXT} END`;

/**
 * Most lexemes an English search ranks before paginating. A common word such
 * as "to" matches a large share of all translations, so the database ranks and
 * caps the matches instead of loading every one of them into memory.
 */
export const ENGLISH_SEARCH_RESULT_LIMIT = 200;
