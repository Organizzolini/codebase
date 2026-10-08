import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What codependix-boundaries is held to, measured rather than assumed.
 *
 * Twelve frames: a rule, the graph it is judged against, and the edges and
 * cycles that broke it.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * Seven direct callees at the widest, in `RunContextService.build` — the
 * run-context resolution this package absorbed from the command-line host,
 * which measured exactly seven there too. The number moved because the
 * callable did, not because anything inside it grew: ordinary fan-out rather
 * than a closed enumeration, so the next helper anybody extracts here is what
 * moves it again.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 7,
    maximumDepth: 12,
  },
};
