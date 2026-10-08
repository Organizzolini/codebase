// 🏷️ Types

/**
 * What one `pnpm install --frozen-lockfile --lockfile-only` produced.
 *
 * Both streams merged into one document here, unlike the `gh` reads elsewhere
 * in this application: nothing parses this output, it is only reprinted for a
 * person, and which stream pnpm explains a refusal on varies.
 */
export interface FrozenInstallResult {
  /**
   * Whether the `pnpm` binary could be executed at all.
   *
   * Told apart from a refusal because the two mean opposite things: a missing
   * binary is a check that did not run, and a refusal is a check that failed.
   */
  readonly available: boolean;
  readonly output: string;
  readonly succeeded: boolean;
}
