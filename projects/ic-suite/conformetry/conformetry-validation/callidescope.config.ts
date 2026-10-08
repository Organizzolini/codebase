import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What conformetry-validation is held to, measured rather than assumed.
 *
 * Thirteen frames to measure an instance against its template, and ten callees
 * in the comparison that reports the difference.
 *
 * Twelve of those thirteen are the same measurement as before. The thirteenth
 * is `ConfigurationService`: `@conformetry/configuration` now publishes one
 * facade, so validation injects it rather than `InstanceDiscoveryService` and
 * every stack through it gains exactly one delegating frame. The measured
 * depth moved 12 → 13 and nothing got deeper.
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
    maximumBreadth: 10,
    maximumDepth: 13,
  },
};
