import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What callidescope-graph is held to, measured rather than assumed.
 *
 * Eleven frames to build a call graph and measure it. Nine is
 * `CallablesService.describe`, which reads every part of a declaration to name
 * one callable, and is the widest thing here.
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
    maximumDepth: 11,
  },
};
