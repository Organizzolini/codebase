// 🏷️ Types

/**
 * Options accepted by the `changes` command.
 *
 * Typed loosely because commander skips an option's parser when the flag
 * arrives without a value, handing the command `true` instead of text.
 */
export interface ChangesCommandOptions {
  baseline?: unknown;
  baselineUrl?: unknown;
  directory?: unknown;
  markdown?: unknown;
  output?: unknown;
}
