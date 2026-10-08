// ♟️ Constants

import path from "node:path";

import type { CodependixBoundaryLevel } from "../boundaries/boundaries.types";

/**
 * The `scope` of the whole-workspace Nx graph — what the graph covers, not
 * who a finding in it is charged to.
 *
 * The Nx level is built once for the repository rather than once per
 * project, so its graph has no one project to name. Each finding in it is
 * charged to the projects owning its nodes instead — see
 * `BoundariesService.chargeProjects`.
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

/**
 * The location one V8 stack frame names, in either of the two shapes V8
 * writes: `at name (location:line:column)` or a bare `at location:line:column`.
 *
 * Captures the location without its line and column, so a frame reads as a
 * path or a `file:` URL whichever way it was written.
 */
export const STACK_FRAME_LOCATION = /^\s*at (?:.*\()?(.+?):\d+:\d+\)?$/u;

/**
 * The path segment marking a frame as third-party code.
 *
 * A frame inside a package's own `node_modules` is not that project's code,
 * even though it sits under the project's root, so it never names an owner.
 */
export const NODE_MODULES_SEGMENT = `${path.sep}node_modules${path.sep}`;
