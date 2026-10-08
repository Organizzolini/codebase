import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What synchronization is held to, measured rather than assumed.
 *
 * Ten frames down `SynchronizationCommand.run`, the top-level command every
 * synchronizer runs beneath.
 *
 * Eleven direct callees at the widest, where `SynchronizationCommand.synchronize`
 * dispatches to one `synchronize` method per registered synchronizer — a fixed
 * roster of eight commands, plus `getCommands`, `reportResults`, and Array `every`.
 * Every traced project gates breadth now, the orchestrator included, so the next
 * step or synchronizer it gains is what moves this number.
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
    maximumBreadth: 11,
    maximumDepth: 10,
  },
};
