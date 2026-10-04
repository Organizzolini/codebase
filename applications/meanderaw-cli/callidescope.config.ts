import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What meanderaw is held to, measured rather than assumed.
 *
 * Sixteen frames down `DrawCommand.run`, not the fourteen a run pointed at
 * this project alone reports. The gate widens its trace along the Nx
 * dependency graph, and the wider program resolves two more frames behind
 * that command — so the gate's number is the one written down here, because
 * the gate is the thing that enforces it.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * Fourteen direct callees at the widest, `MeanderGenerationService.generate`,
 * which walks eight validators in sequence, then computes the grid geometry,
 * builds the paths, resolves the motif's right edge, formats three
 * coordinates, and renders the SVG. One sequential flow, so the next step
 * this pipeline gains is what moves the number.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 14,
    maximumDepth: 16,
  },
};
