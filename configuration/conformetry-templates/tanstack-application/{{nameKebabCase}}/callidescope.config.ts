import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * TODO: Measure this application's stacks and set its limits at what they
 * measure, then ratchet them down from there.
 */
export default {
  ...projectDefaults,
  /**
   * The generated route tree describes a code generator's output rather than
   * anything a person structured, so a depth finding there is not actionable.
   */
  exclude: ["src/lib/routeTree.gen.ts"],
  limits: {
    maximumBreadth: 8,
    maximumDepth: 6,
  },
};
