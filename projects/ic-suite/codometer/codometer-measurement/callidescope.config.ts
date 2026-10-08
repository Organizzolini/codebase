import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What codometer-measurement is held to, measured rather than assumed.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * Fourteen is one measurement run reaching all the way through the language
 * analyzers it joins — `measure` to an input, to its files, to one language's
 * comments, to one comment's own budget — which used to be measured against
 * `codometer-cli`'s sixteen because the join lived there. Nine is that same
 * join's fan-out: `measure` personally names every analyzer it composes, which
 * is the arrangement working rather than drifting.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 9,
    maximumDepth: 14,
  },
};
