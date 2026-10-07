// 🏷️ Types

import type {
  MeanderRecord,
  MeanderShape,
} from "../meanderaw-database/meanderaw-database.types";

/**
 * What `DrawCodeService.draw` needs to decode, render, and persist one
 * meander: `--rows`, `--columns`, and `--code` all present together, which
 * `DrawCommand` checks before narrowing {@link DrawCommandOptions}'s
 * optional fields into this.
 */
export interface CodeDrawingOptions {
  readonly code: string;
  readonly columns?: number | undefined;
  readonly repeats?: number | undefined;
  readonly rows?: number | undefined;
}

/**
 * Parsed `draw` options, in the shape nest-commander leaves them.
 *
 * Every field is optional, and that is the command's whole contract: `draw`
 * with no flag draws every meander the application can draw into the
 * meander database, and `draw --rows <n> --columns <n> --code <code>`
 * draws that one. `--rows`, `--columns`, and `--code` are checked together
 * rather than declared `required`, because passing none of them is how the
 * draw run is asked for — see `IncompleteCodeDrawingError`.
 *
 * The `--type`, `--modifier`, `--sub-family`, `--strands`, `--branches`,
 * `--direction`, `--flip`, `--offset`, `--repeat-count`, and
 * `--output-directory` flags this once carried are retired with the
 * procedural pipeline they named a drawing in. A meander is now
 * addressed by its lattice address alone, and the database it is written to
 * is the one `MEANDERAW_POSTGRES_DATABASE` names rather than somewhere a flag points.
 */
export interface DrawCommandOptions {
  code?: string;
  columns?: number;
  rows?: number;
}

/** A worker thread's answer to one {@link DrawWorkerTask}: its records, or why it could not draw them. */
export type DrawWorkerReply =
  | { readonly error: string }
  | { readonly records: readonly MeanderRecord[] };

/** A batch of one shape's orbit minima, sent to a worker thread to draw. */
export interface DrawWorkerTask {
  readonly masks: readonly number[];
  readonly shape: MeanderShape;
}
