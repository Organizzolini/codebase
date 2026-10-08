import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What codometer-core is held to, measured rather than assumed.
 *
 * One, because this package is the contracts leaf: types, a vocabulary of
 * string unions, and four error classes whose constructors call `super` and
 * stop. Nothing here calls anything else, so a stack deeper than one frame
 * would mean a live service had appeared in a package that must not hold one.
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
