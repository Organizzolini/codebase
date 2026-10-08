import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What callidescope-nx is held to, measured rather than assumed.
 *
 * Seventeen is the workspace's own number, and two of the three stacks pinning
 * it are this project's `depthExecutor` and `breadthExecutor`. So this override
 * changes nothing today and is written down anyway: the workspace number is
 * going to come down, and this is where the reason it cannot come down past
 * seventeen yet is recorded.
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
    maximumDepth: 17,
  },
};
