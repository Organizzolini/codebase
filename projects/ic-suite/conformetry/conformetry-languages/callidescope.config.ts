import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What conformetry-languages is held to, measured rather than assumed.
 *
 * Thirteen frames and eleven direct callees, both measured by a run scoped to
 * this project and its dependency closure, and both set **at** what they
 * measured rather than above it: a stack or a callable at either limit
 * passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * Thirteen is not new depth; it is the same Jupyter descent into a notebook's
 * markdown cells the whole-workspace report has always shown, now visible to a
 * scoped run too. This file used to declare four and explain the gap: the
 * runner envelope that called `validateDocument` lived in the leaf every
 * Language depended on, so a scoped trace entered above these walks and
 * attributed them elsewhere. That envelope now sits in
 * `conformetry-validation`, an analysis package *above* this one, so each
 * Language's `validateDocument` is an orphan root here and the descent below
 * it is counted where it happens. Nothing about the code got deeper — the
 * measurement stopped being able to hide it, which is the better of the two
 * states to gate from.
 *
 * The same commit turns four workspace-level over-limit findings green, and
 * that is this one number read from the other end rather than four separate
 * wins. The root `README.md` used to list these walks as breaches belonging to
 * no project's own limit, because no project's own limit reached them.
 * Declaring thirteen here is what claims them, so the whole-workspace report
 * now has nothing left to say about this package.
 *
 * Eleven direct callees at the widest, among the comparison walks — fan-out
 * shaped by the syntax tree they descend rather than a budget anybody chose.
 * The next node kind a Language learns to compare is what moves this number
 * now.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 11,
    maximumDepth: 13,
  },
};
