// ♟️ Constants

import { z } from "zod";

import type { JupyterResult } from "./jupyter.types";

/** Cell type of a notebook cell holding executable source. */
export const CODE_CELL_TYPE = "code";

/** Cell type of a notebook cell holding prose. */
export const MARKDOWN_CELL_TYPE = "markdown";

/**
 * The parts of a notebook cell this analyzer reads.
 *
 * Declared as a schema rather than an interface because these are nbformat's
 * names, not this codebase's: a snake_case key is legal in an object literal
 * and would be a lint error in a type declaration. Every field is optional
 * because a file is only known to be JSON until it has been read, and a
 * notebook missing a field should be measured for what it does have.
 */
export const notebookCellSchema = z.object({
  cell_type: z.string().optional(),
  execution_count: z.number().nullish(),
  outputs: z.array(z.unknown()).optional(),
  source: z.union([z.string(), z.array(z.string())]).optional(),
});

/** The parts of a notebook document this analyzer reads. */
export const notebookDocumentSchema = z.object({
  cells: z.array(notebookCellSchema).optional(),
});

/** Empty metrics used to initialize analyzer state. */
export const EMPTY_JUPYTER_RESULT: JupyterResult = {
  cells: 0,
  classes: 0,
  codeBlocks: 0,
  codeCells: 0,
  codeLines: 0,
  decorators: 0,
  executedCells: 0,
  files: 0,
  functions: 0,
  headings: 0,
  images: 0,
  imports: 0,
  links: 0,
  markdownCells: 0,
  markdownLines: 0,
  maxDepth: 0,
  outputs: 0,
  properties: 0,
  rawCells: 0,
  totalNodes: 0,
};
