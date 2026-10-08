// 🏷️ Types

/**
 * Everything wrong with one pull request description.
 *
 * Both lists rather than the first failure found. A description that misses a
 * heading and keeps a prompt is two edits, and reporting one of them at a time
 * is two round trips through a required check.
 */
export interface BodyVerdict {
  readonly emptySections: readonly string[];
  readonly missingHeadings: readonly string[];
  readonly unfilledComments: readonly string[];
}
