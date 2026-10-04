// 🏷️ Types

import type { environmentSchema } from "../../constants";
import type { z } from "zod";

/** Where one edge sits in an `EdgesDraft`: the grid that holds it, and its row and column within that grid. */
export interface EdgeAddress {
  readonly column: number;
  readonly grid: readonly boolean[][];
  readonly row: number;
}

/**
 * One meander the sweep found: the Code that is its whole identity, and the
 * shape that Code is read at.
 *
 * The tile it was spelled from is deliberately not carried alongside. A
 * Code, its rows, and its columns are together sufficient to reproduce
 * everything else about a meander — spec #813's own sixteenth user story —
 * so handing a caller the tile as well would hand it a second source of
 * truth for facts the Code already fixes.
 */
export interface EnumeratedMeander {
  readonly code: string;
  readonly columns: number;
  readonly rows: number;
}

/**
 * Inferred type of the validated environment variables, read to bound a
 * sweep by edge budget, rows, and columns.
 */
export type Environment = z.infer<typeof environmentSchema>;
