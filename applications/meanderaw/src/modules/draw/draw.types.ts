// 🏷️ Types

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
 * with no flag sweeps every meander the application can draw into the
 * committed database, and `draw --rows <n> --columns <n> --code <code>`
 * draws that one. `--rows`, `--columns`, and `--code` are checked together
 * rather than declared `required`, because passing none of them is how the
 * sweep is asked for — see `IncompleteCodeDrawingError`.
 *
 * The `--type`, `--modifier`, `--sub-family`, `--strands`, `--branches`,
 * `--direction`, `--flip`, `--offset`, `--repeat-count`, and
 * `--output-directory` flags this once carried are retired with the
 * per-family procedural pipeline they named a drawing in. A meander is now
 * addressed by its lattice address alone, and the database it is written to
 * is `DEFAULT_DATABASE_PATH` rather than somewhere a flag points.
 */
export interface DrawCommandOptions {
  code?: string;
  columns?: number;
  rows?: number;
}
