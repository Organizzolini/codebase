import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What validation is held to, measured rather than assumed.
 *
 * Eight frames down `PullRequestMetadataCommand.run`, the deepest of this
 * project's one-sided checks.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * Nine direct callees at the widest, `PullRequestReleaseSignificanceCommand.run`,
 * which walks its checks in sequence — resolve, parse, read rules, verify,
 * report. Ordinary fan-out, so the next such check is what moves this number
 * now.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 9,
    maximumDepth: 8,
  },
};
