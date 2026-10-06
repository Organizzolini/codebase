// 🏷️ Types

/** The lines a document is missing, and what its placeholder values captured. */
export interface LineComparison {
  readonly captures: Record<string, string>;
  readonly missingLines: MissingLine[];
}

/** A template line that could not be found in the instance. */
export interface MissingLine {
  readonly line: string;
  /** 1-based line number in the rendered template. */
  readonly templateLine: number;
}
