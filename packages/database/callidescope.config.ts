import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What database is held to, measured rather than assumed, and set at what
 * was measured so each number is a starting point to ratchet down from.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 4,
    maximumDepth: 4,
  },
};
