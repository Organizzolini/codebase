import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What conformetry-core is held to, measured rather than assumed.
 *
 * Zero frames and zero direct callees. A contracts leaf has no callable to
 * trace: every file here declares types, and a scoped run reports "None."
 * under both call stacks and breadth. The numbers below say one rather than
 * zero only because the schema requires a positive value, so one is the floor
 * this measurement can be written at, not a frame anybody found.
 *
 * Dropping the file instead is not available: every traced project must
 * declare its own, and removing it fails the workspace run outright with
 * `ProjectConfigurationMissingError`. Which is the better outcome anyway —
 * the gate is also this package's tripwire. The first service or NestJS
 * module added here breaches it almost immediately, and a breach that names
 * the layering as the defect is worth more than silence.
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
