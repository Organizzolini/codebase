// 🏷️ Types

/**
 * One error as the bridge emits it.
 *
 * Field names are snake_case because they cross a process boundary from
 * Python; every value is `unknown` because nothing about a subprocess's stdout
 * can be trusted until it is narrowed.
 */
export type PythonBridgeError = Readonly<Record<string, unknown>>;

/** The bridge's response envelope. */
export interface PythonBridgeResponse {
  readonly differences: PythonBridgeError[];
  /**
   * Template requirements the Python side weighed the instance against.
   *
   * Snake_case because it crosses the same process boundary as the differences,
   * and `unknown` for the same reason: nothing about a subprocess's stdout is
   * trustworthy until narrowed.
   */
  readonly total_weight?: unknown;
}

/** Arguments for one bridge invocation. */
export interface RunPythonBridgeArguments {
  readonly filename: string;
  readonly instance: string;
  /** Template source, already rendered on the TypeScript side. */
  readonly template: string;
}
