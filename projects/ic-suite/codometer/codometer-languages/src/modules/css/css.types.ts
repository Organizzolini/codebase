// 🏷️ Types

/** Input to the Css analysis step. */
export interface CssInput {
  cssFiles: string[];
  workingDirectory: string;
}

/** Aggregated metrics collected from parsing Css sources. */
export interface CssResult {
  atRules: number;
  comments: number;
  customProperties: number;
  declarations: number;
  files: number;
  lines: number;
  mediaQueries: number;
  rules: number;
  selectors: number;
}
