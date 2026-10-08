// ♟️ Constants

import type { YamlResult } from "./yaml.types";

/** Empty metrics used to initialize analyzer state. */
export const EMPTY_YAML_RESULT: YamlResult = {
  aliases: 0,
  anchors: 0,
  comments: 0,
  documents: 0,
  files: 0,
  keys: 0,
  lines: 0,
  mappings: 0,
  maxDepth: 0,
  scalars: 0,
  sequences: 0,
};
