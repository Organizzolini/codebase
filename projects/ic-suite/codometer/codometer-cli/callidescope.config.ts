import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What codometer-cli is held to, measured rather than assumed.
 *
 * Ratcheted down from sixteen and eleven, which is what the host measured
 * while it still held the measurement, limits, delivery and report modules.
 * Those left for `@codometer/measurement` and `@codometer/output`, and the
 * host kept only the command that composes them — so fifteen and nine are what
 * a scoped run now reports, and leaving the old numbers would have gated
 * nothing.
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
    maximumBreadth: 9,
    maximumDepth: 15,
  },
};
