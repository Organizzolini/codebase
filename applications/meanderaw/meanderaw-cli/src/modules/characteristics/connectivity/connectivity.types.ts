// 🏷️ Types

/** One edge a Code holds, named by the two points it joins — `from` and `to` are the same point for a single-column Code's wrapped eastward edge. */
export interface CodeEdge {
  readonly from: string;
  readonly to: string;
}

/**
 * One repeat's ink counted as a graph: how many connected pieces it falls
 * into, how many independent loops it closes, and how many of its points
 * carry exactly one arm.
 *
 * The same three numbers `InkConnectivity` reports for a rendered document,
 * stated over a Code instead — see `ConnectivityService` for how the grid
 * is read as a repeating band and why an edge is claimed by either of its
 * ends.
 *
 * `edges` and `nodes` are deliberately absent where `InkConnectivity` has
 * them: they exist there so a caller can do the forest and tree arithmetic
 * itself, and {@link cycles} is that arithmetic already done.
 */
export interface Connectivity {
  readonly components: number;
  readonly cycles: number;
  readonly freeEnds: number;
}
