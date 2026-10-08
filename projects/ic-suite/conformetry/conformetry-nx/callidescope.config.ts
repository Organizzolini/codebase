import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What conformetry-nx is held to, measured rather than assumed.
 *
 * Fifteen frames from an `nx g` invocation through the generator namespace
 * this plugin exposes.
 *
 * Fourteen of those fifteen are the same invocation as before. The fifteenth
 * is `ConfigurationService`: `@conformetry/configuration` now publishes one
 * facade, so this plugin injects it rather than `InstanceDiscoveryService`,
 * `TemplateDiscoveryService` and `InstanceGroupService`, and every stack
 * through it gains exactly one delegating frame. The measured depth moved
 * 14 → 15 and nothing got deeper.
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
    maximumBreadth: 9,
    maximumDepth: 15,
  },
};
