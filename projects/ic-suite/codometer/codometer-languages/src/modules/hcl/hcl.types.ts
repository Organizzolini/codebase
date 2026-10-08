// 🏷️ Types

/** Input to the Hcl analysis step. */
export interface HclInput {
  hclFiles: string[];
  workingDirectory: string;
}

/** Aggregated metrics collected from parsing Hcl sources. */
export interface HclResult {
  attributes: number;
  blocks: number;
  comments: number;
  files: number;
  interpolations: number;
  lines: number;
  outputs: number;
  resources: number;
  variables: number;
}
