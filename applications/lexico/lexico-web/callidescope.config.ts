import { projectDefaults } from "../../../configuration/callidescope.config.js";

/**
 * What lexico is held to, measured rather than assumed.
 *
 * Nine frames from a route down to a rendered form. Nine is also the widest
 * callable: `dispatchFormTransform` routes to one transform per part of
 * speech — verb, noun, adjective, and the rest — so its width is that fixed
 * set of parts of speech rather than a budget to hold down.
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
  /**
   * The generated route tree. Its call stacks describe a code generator's
   * output rather than anything a person structured, so a depth finding here
   * is not actionable — moved from `configuration/.callidescopeignore`, the
   * only project this pattern ever matched.
   */
  exclude: ["src/lib/routeTree.gen.ts"],
  limits: {
    maximumBreadth: 9,
    maximumDepth: 9,
  },
};
