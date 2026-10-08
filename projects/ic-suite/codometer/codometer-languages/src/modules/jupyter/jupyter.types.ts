// 🏷️ Types

/** Arguments accepted by the Jupyter analyzer. */
export interface AnalyzeJupyterArguments {
  notebookFiles: string[];
  pythonCommand: string;
  workingDirectory: string;
}

/** Aggregated metrics collected from Jupyter notebooks. */
export interface JupyterResult {
  cells: number;
  classes: number;
  codeBlocks: number;
  codeCells: number;
  codeLines: number;
  decorators: number;
  executedCells: number;
  files: number;
  functions: number;
  headings: number;
  images: number;
  imports: number;
  links: number;
  markdownCells: number;
  markdownLines: number;
  maxDepth: number;
  outputs: number;
  properties: number;
  rawCells: number;
  totalNodes: number;
}

/**
 * What the notebooks themselves report, before any language analyzer runs.
 *
 * The two source lists are what the notebook contributes to the Python and
 * markdown analyzers: cell bodies that exist in no file of their own.
 */
export interface NotebookParts {
  cells: number;
  codeCells: number;
  codeSources: string[];
  executedCells: number;
  files: number;
  markdownCells: number;
  markdownSources: string[];
  outputs: number;
  rawCells: number;
}
