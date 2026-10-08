// 🏷️ Types

/** Options accepted by the validate command. */
export interface ValidateCommandOptions {
  config?: string;
  instances?: string[];
  languages?: string[];
  /**
   * Template names to narrow the run to, or `["all"]` for every one.
   *
   * Absent means the caller has not decided, which is what the picker asks
   * about; `["all"]` means they have, and nothing is asked.
   */
  templates?: string[];
  threshold?: number;
}
