import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What codependix-nx is held to, measured rather than assumed.
 *
 * Six frames, from the gate executor through re-reading this plugin's own
 * `nx.json` registration down to the record it narrows. The deepest work a
 * gate does happens in the codependix command line it spawns, which is a
 * separate process and so is no part of this project's stacks.
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
    maximumBreadth: 5,
    maximumDepth: 6,
  },
};
