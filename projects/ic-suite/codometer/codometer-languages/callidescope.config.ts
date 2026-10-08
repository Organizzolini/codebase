import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What codometer-languages is held to, measured rather than assumed.
 *
 * Eleven frames to walk one language's source, and twelve callees in the
 * `analyze()` that dispatches to a language — one per analyzer this package
 * holds, which is the one callable here whose width is the design rather than
 * something to narrow.
 *
 * Twelve rather than the eleven a run pointed at this package alone reports.
 * The gate widens its trace along the Nx dependency graph, and the wider
 * program resolves one more analyzer behind that dispatch — so the gate's
 * number is the one written down here, because the gate is the thing that
 * enforces it.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack at the limit passes, so
 * this gate is green the day it arrives and the number is a starting point to
 * ratchet down from rather than a target to grow into.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 12,
    maximumDepth: 11,
  },
};
