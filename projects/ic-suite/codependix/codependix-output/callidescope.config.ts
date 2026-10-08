import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What codependix-output is held to, measured rather than assumed.
 *
 * Fourteen frames: one graph-type pass, down through the per-project pass
 * that builds and renders it, into the delivery that splices it into an
 * anchor. This is the stack the command-line host used to own, one frame
 * shorter now that the command itself sits above the package rather than
 * inside it.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 7,
    maximumDepth: 14,
  },
};
