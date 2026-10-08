// ♟️ Constants

import type { CodependixBoundaryLevel } from "../boundaries/boundaries.types";

/**
 * The scope a violation found in the whole-workspace Nx graph is reported
 * under.
 *
 * The Nx level is judged once for the repository rather than once per
 * project, so it has no project name to report against.
 */
export const WORKSPACE_SCOPE = "workspace";

/**
 * The order the four graph levels are judged in.
 *
 * Cheapest first, and it is not a small difference: the Nx level reads a graph
 * the run already holds, while the NestJS level boots every container in
 * preview mode and the TypeScript level builds a `ts.Program` per project. A
 * workspace declaring only Nx rules never pays for either, because a level
 * with no rules is not built at all.
 *
 * Written as a list rather than left implicit in the order of four `if`
 * blocks, so the order a report comes out in is stated once, in the place a
 * reader looks for it. `typescript` and `python` are `boundaries.fileImports`'s
 * two nested languages, judged as separate levels here even though
 * `codependix-file-imports` builds and exports them as one merged graph type.
 */
export const BOUNDARY_LEVEL_ORDER = [
  "nxProjects",
  "nestjsModules",
  "typescript",
  "python",
] as const satisfies readonly CodependixBoundaryLevel[];
