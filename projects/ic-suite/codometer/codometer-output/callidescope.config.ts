import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What codometer-output is held to, measured rather than assumed.
 *
 * Sixteen is the widest callable anywhere in this repository:
 * `MarkdownService.buildBadgeGroups`, which assembles a badge for every measure
 * a report holds. It is written down here so that narrowing it shows up as a
 * change to this line rather than as nothing at all.
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
    maximumBreadth: 16,
    maximumDepth: 11,
  },
};
