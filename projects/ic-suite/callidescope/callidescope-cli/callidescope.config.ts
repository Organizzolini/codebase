import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What callidescope-cli is held to, measured rather than assumed.
 *
 * Fifteen frames is a command-line host's real shape: an argument list, a
 * configuration, a trace, and the report it renders. Eleven is the widest
 * callable in it.
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
    maximumBreadth: 11,
    maximumDepth: 15,
  },
};
