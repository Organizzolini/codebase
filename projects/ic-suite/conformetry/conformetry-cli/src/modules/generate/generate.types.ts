// 🏷️ Types

/**
 * Options accepted by the generate command.
 *
 * Keys are the camel-cased long flag names, which is how commander reports
 * parsed options — `--directory` arrives as `directory`.
 */
export interface GenerateCommandOptions {
  config?: string;
  directory?: string;
  /**
   * Optional at the parse layer only. A bare `generate` has to reach the
   * command body so the missing case and the unknown case can be decided
   * together; the template itself is still required, and is either supplied
   * here or chosen at the picker.
   */
  template?: string;
}
