// 🏷️ Types

/**
 * One notebook cell, in the subset of the `.ipynb` schema this validator uses.
 *
 * `source` is a list of lines with their newlines retained, which is how
 * Jupyter stores it.
 */
export interface NotebookCell {
  readonly cell_type?: unknown;
  readonly source?: unknown;
}

/** The cell kinds this validator understands. */
export type NotebookCellKind = "code" | "markdown" | "raw";

/** A pair of template and instance cells of the same kind, in order. */
export interface PairedCells {
  readonly index: number;
  readonly instanceSource: string;
  readonly kind: NotebookCellKind;
  readonly templateSource: string;
}

/** A notebook reduced to the parts that are validated. */
export interface ParsedNotebook {
  readonly cells: NotebookCell[];
}
