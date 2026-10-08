import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What codependix-core is held to, measured rather than assumed.
 *
 * One frame, and one is generous: this package is the spine's contracts leaf
 * and declares no callable at all. The numbers are the smallest a gate
 * accepts rather than a measurement of anything, and the day either one has
 * to move is the day a service arrived in a package that may not hold one.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 1,
    maximumDepth: 1,
  },
};
