import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What callidescope-core is held to, measured rather than assumed.
 *
 * This package declares types and nothing executable, so it contributes no call
 * stack of its own. The workspace defaults stand unmodified, so that the gate is
 * already here the day a callable arrives rather than being introduced after
 * one has.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
};
