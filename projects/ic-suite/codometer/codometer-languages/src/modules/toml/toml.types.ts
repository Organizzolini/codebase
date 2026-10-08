// 🏷️ Types

/** Input to the Toml analysis step. */
export interface TomlInput {
  tomlFiles: string[];
  workingDirectory: string;
}

/** Aggregated metrics collected from parsing Toml sources. */
export interface TomlResult {
  arrays: number;
  arrayTables: number;
  comments: number;
  files: number;
  keys: number;
  lines: number;
  tables: number;
}
