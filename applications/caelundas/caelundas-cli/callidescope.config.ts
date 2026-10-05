import { projectDefaults } from "../../../configuration/callidescope.config.js";

/**
 * What caelundas is held to, measured rather than assumed.
 *
 * Sixteen frames down `CaelundasCommand.run`, the astronomical-event
 * detection pipeline this application exists to run. Twelve is the widest
 * callable: `TwilightsDetectorService.buildTwilightTransitionEvents` checks
 * and builds one event per twilight boundary — astronomical, nautical, and
 * civil dawn and dusk — so its width is that fixed set of six boundaries
 * rather than a budget to hold down.
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
    maximumDepth: 16,
  },
};
