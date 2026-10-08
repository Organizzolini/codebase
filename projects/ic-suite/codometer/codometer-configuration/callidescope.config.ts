import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What codometer-configuration is held to, measured rather than assumed.
 *
 * Nine frames to read a configuration and bind the limits it declares, and
 * seven callees in `resolveConfiguration`, which assembles the resolved object
 * a field at a time.
 *
 * Nine rather than the eight this held before the layer's public surface
 * became a facade. `ConfigurationService.resolveConfiguration` now forwards to
 * `ConfigurationResolverService.resolveConfiguration`, and that one delegating
 * frame is the whole of the difference — the cost of the package exposing one
 * service where it used to expose the resolver's internals directly.
 *
 * Seven breadth rather than the six a run pointed at this package alone
 * reports. The gate widens its trace along the Nx dependency graph, and the
 * wider program resolves one more callee of that resolver — so the gate's
 * number is the one written down here, because the gate is the thing that
 * enforces it.
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
    maximumDepth: 9,
  },
};
