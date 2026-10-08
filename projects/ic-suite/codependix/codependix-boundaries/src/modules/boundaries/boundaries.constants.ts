// ♟️ Constants

/** How a cycle's nodes are joined when one is reported. */
export const CYCLE_SEPARATOR = " → ";

/**
 * The sentence an `acyclic` rule reports when it names none of its own.
 *
 * Names the whole path rather than only the edge that closed it: a cycle is a
 * statement about a shape, and the two nodes of its closing edge are the
 * least useful two to be handed.
 */
export const describeCycle = (args: {
  cycle: readonly string[];
  rule: string;
}): string => `${args.rule}: ${args.cycle.join(CYCLE_SEPARATOR)} is a cycle.`;

/**
 * The sentence a violated `allow` rule reports when it names none of its own.
 *
 * Worded as a permitted surface rather than as a forbidden edge, because that
 * is what distinguishes it from `forbid`: the reader's next question is what
 * the rule does allow, and the rule's name is the only place this can point
 * them at without restating the configuration.
 */
export const describeDisallowedEdge = (args: {
  rule: string;
  source: string;
  target: string;
}): string =>
  `${args.rule}: ${args.source} may not depend on ${args.target}, which the rule's allowed targets do not cover.`;

/** The sentence a violated `forbid` rule reports when it names none of its own. */
export const describeForbiddenEdge = (args: {
  rule: string;
  source: string;
  target: string;
}): string => `${args.rule}: ${args.source} must not depend on ${args.target}.`;
