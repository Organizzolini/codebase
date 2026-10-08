// ♟️ Constants

import type { TomlResult } from "./toml.types";

/** Matches an array-of-tables header, `[[name]]`. */
export const TOML_ARRAY_TABLE_PATTERN = /^\[\[[^\]]+\]\]/;

/** Matches a table header, `[name]`. */
export const TOML_TABLE_PATTERN = /^\[[^\]]+\]/;

/** Matches either multi-line string delimiter. */
export const TOML_MULTILINE_DELIMITER_PATTERN = /"""|'''/g;

/** Empty metrics used to initialize analyzer state. */
export const EMPTY_TOML_RESULT: TomlResult = {
  arrays: 0,
  arrayTables: 0,
  comments: 0,
  files: 0,
  keys: 0,
  lines: 0,
  tables: 0,
};
