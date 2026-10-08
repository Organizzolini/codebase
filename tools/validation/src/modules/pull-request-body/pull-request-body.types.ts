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
  readonly malformedSections: readonly string[];
  readonly missingHeadings: readonly string[];
  readonly oversizedSections: readonly string[];
  readonly unfilledComments: readonly string[];
}

/** What one required section may hold, and how many words it may run to. */
export interface SectionRule {
  readonly heading: string;
  readonly maximumWords?: number;
  readonly shape: SectionShape;
}

/** The one kind of markdown block a section may be made of. */
export type SectionShape =
  | "bullet-list"
  | "leading-dash-list"
  | "ordered-list"
  | "paragraph";
