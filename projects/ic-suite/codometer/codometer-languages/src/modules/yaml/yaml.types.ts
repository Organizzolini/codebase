// 🏷️ Types

/** Input to the YAML analysis step. */
export interface YamlInput {
  workingDirectory: string;
  yamlFiles: string[];
}

/** Aggregated metrics collected from parsing YAML documents. */
export interface YamlResult {
  aliases: number;
  anchors: number;
  comments: number;
  documents: number;
  files: number;
  keys: number;
  lines: number;
  mappings: number;
  maxDepth: number;
  scalars: number;
  sequences: number;
}
