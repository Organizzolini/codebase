// ♟️ Constants

// 🚨 Errors

/**
 * Thrown when `--code` is given without both `--rows` and `--columns`.
 *
 * `--code` alone is what selects the single-drawing mode over the sweep, so
 * it cannot be `required` alongside the other two — the pair still has to be
 * checked once `--code` says which mode is meant.
 */
export class IncompleteCodeDrawingError extends Error {
  constructor() {
    super("drawing one meander by code needs both --rows and --columns");
    this.name = "IncompleteCodeDrawingError";
  }
}
