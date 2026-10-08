// 🏷️ Types

/** Input to the Shell analysis step. */
export interface ShellInput {
  shellFiles: string[];
  workingDirectory: string;
}

/** Aggregated metrics collected from parsing Shell sources. */
export interface ShellResult {
  commentLines: number;
  comments: number;
  conditionals: number;
  exports: number;
  files: number;
  functions: number;
  lines: number;
  loops: number;
  pipelines: number;
  shebangs: number;
  variables: number;
}
