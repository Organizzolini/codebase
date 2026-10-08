// 🏷️ Types

/** State used while stripping JSONC comments from a document. */
export interface JsoncState {
  isInBlockComment: boolean;
  isInLineComment: boolean;
  isInString: boolean;
  sanitizedContent: string;
  shouldAdvanceIndex: boolean;
}

/** Input to the JSON analysis step. */
export interface JsonInput {
  jsonFiles: string[];
  workingDirectory: string;
}

/** Aggregated metrics collected from parsing JSON documents. */
export interface JsonResult {
  arrays: number;
  booleans: number;
  files: number;
  items: number;
  lines: number;
  maxDepth: number;
  nulls: number;
  numbers: number;
  objects: number;
  properties: number;
  strings: number;
  totalNodes: number;
}
