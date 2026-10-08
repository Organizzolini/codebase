// 🏷️ Types

import type { PATH_FORMAT_NAMES } from "./path-query.constants";
import type { GraphRunContext } from "@codependix/boundaries";
import type { CodependixGraphType } from "@codependix/configuration";

/** Every active graph type's path query outcome, keyed by type. */
export type CombinedPathResults = Partial<
  Record<CodependixGraphType, PathQueryResult>
>;

/** What `--format` prints for a path query. */
export type PathFormat = (typeof PATH_FORMAT_NAMES)[number];

/** Arguments for executing a path query. */
export interface PathQueryArguments {
  context: GraphRunContext;
  from: string;
  to: string;
}

/** The outcome of querying a connecting path for one graph type. */
export interface PathQueryResult {
  from: string;
  path: null | string[];
  to: string;
}

/** Arguments for rendering path query results. */
export interface PathReportArguments {
  format: PathFormat;
  results: CombinedPathResults;
}
