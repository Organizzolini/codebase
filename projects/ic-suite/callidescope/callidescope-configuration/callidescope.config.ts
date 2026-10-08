import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What callidescope-configuration is held to, measured rather than assumed.
 *
 * Eight frames is nearly all of this package — it reads a file, plans a run
 * from flags, and resolves every traced project's limits — and eight is also
 * one resolver's fan-out over the fields it merges.
 *
 * Six was the number before this package published a single facade, and the
 * deepest stack is the same stack it always was: resolving every traced
 * project's own file, down to the repository-root walk the path resolver ends
 * in. `ConfigurationService` appears in it twice rather than once — first as
 * the entry point, and again in the middle, because the reader it hands its
 * collaborators is itself and the file read therefore re-enters the facade on
 * the way down. Two frames is what one public entry point costs on the stack
 * that crosses it twice; a stack crossing once, such as `prepareRun`, pays
 * one and reaches seven.
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
    maximumBreadth: 8,
    maximumDepth: 8,
  },
};
