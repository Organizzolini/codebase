// 🏷️ Types

/** Input to the Sql analysis step. */
export interface SqlInput {
  sqlFiles: string[];
  workingDirectory: string;
}

/** Aggregated metrics collected from parsing Sql sources. */
export interface SqlResult {
  comments: number;
  commonTableExpressions: number;
  creates: number;
  deletes: number;
  files: number;
  inserts: number;
  joins: number;
  lines: number;
  selects: number;
  statements: number;
  updates: number;
}
