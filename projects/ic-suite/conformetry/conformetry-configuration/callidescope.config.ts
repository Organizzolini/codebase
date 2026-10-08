import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What conformetry-configuration is held to, measured rather than assumed.
 *
 * Fourteen frames, which is more than any other configuration reader here: this
 * one resolves templates, instances, and the tags that select them.
 *
 * Thirteen of those fourteen are the same walk as before. The fourteenth is
 * `ConfigurationService` itself: this package now publishes one facade rather
 * than fourteen services, so every stack through it gains exactly one
 * delegating frame between the caller and the collaborator that does the work.
 * The measured depth moved 13 → 14 and nothing got deeper — a frame was added
 * in front of the same descent.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * Five direct callees at the widest — ordinary fan-out rather than a closed
 * enumeration, so the next helper anybody extracts here is what moves the
 * number.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 5,
    maximumDepth: 14,
  },
};
