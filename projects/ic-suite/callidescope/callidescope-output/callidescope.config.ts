import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What callidescope-output is held to, measured rather than assumed.
 *
 * Thirteen frames from a destination to the last word written into it, rooted
 * at `WriteDestinationsService.syncDestinations`. Ten was the shape before
 * this package took the write destinations over from the command-line host,
 * which gated them at fifteen: the stack did not get deeper, this package
 * acquired it whole.
 *
 * Seven direct callees at the widest, `MarkdownReportService.renderRun`,
 * roughly one callee per section of the report it assembles.
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
    maximumDepth: 13,
  },
};
