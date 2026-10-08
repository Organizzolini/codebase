import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What codependix-configuration is held to, measured rather than assumed.
 *
 * Seven frames to read a configuration, resolve a destination, and resolve
 * the command line over both.
 *
 * Six of them were here before; the seventh is the facade. This package now
 * exposes exactly one service, so a host asking what mode a run is in enters
 * through `ConfigurationService.selectMode` and the flag resolver it forwards
 * to sits one frame lower than it used to. The deepest stack is the one that
 * prompts — mode selection, the prompt, its terminal guard, and the error it
 * raises — and nothing inside it grew.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * Five direct callees at the widest — ordinary fan-out rather than a closed
 * enumeration, so the next helper anybody extracts here is what moves the
 * number.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 5,
    maximumDepth: 7,
  },
};
