import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What components-web is held to, measured rather than assumed.
 *
 * Three frames and seven callees, which is what a React component library
 * measures: nothing calls deeply, and a composed component calls widely.
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
    maximumBreadth: 7,
    maximumDepth: 3,
  },
};
