// ♟️ Constants

/**
 * Weight a finding carries when it does not declare one.
 *
 * Right for any leaf requirement — a missing line, a missing comment — which
 * is most of them. Only a finding standing in for a whole subtree needs to say
 * otherwise.
 */
export const DEFAULT_ERROR_WEIGHT = 1;

/**
 * Score given to a document that imposes no requirements at all.
 *
 * An empty template asks for nothing, and nothing is exactly what the instance
 * supplied, so it conforms perfectly. Scoring it zero would be arithmetic
 * leaking into the answer: a run whose templates happen to be empty would fail
 * every threshold while having found no fault with anything.
 */
export const EMPTY_TEMPLATE_SCORE = 1;

/** The highest possible score: every template requirement is honoured. */
export const PERFECT_SCORE = 1;
