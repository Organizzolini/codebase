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
 * What every V8 stack frame line starts with once its indentation is
 * trimmed: `at name (location:line:column)` or a bare `at location:line:column`.
 */
export const STACK_FRAME_PREFIX = "at ";

/**
 * A frame's line or column number.
 *
 * Anchored at both ends with one quantifier, so it runs in linear time on
 * whatever a stack carries — the frame itself is parsed with string
 * operations rather than one regular expression, which would backtrack
 * in polynomial time on a crafted frame.
 */
export const FRAME_POSITION = /^\d+$/u;

/**
 * The path segment marking a frame as third-party code.
 *
 * A frame inside a package's own `node_modules` is not that project's code,
 * even though it sits under the project's root, so it never names an owner.
 */
export const NODE_MODULES_SEGMENT = `${path.sep}node_modules${path.sep}`;

/**
 * The indent that keeps a Markdown bullet's continuation line inside it —
 * the width of the `- ` marker.
 */
export const CONTINUATION_INDENT = "  ";

/**
 * The heading of the one Markdown group holding every failure charged to
 * every judged project, in place of a copy under each of them.
 */
export const WORKSPACE_GROUP_HEADING = "All judged projects";
