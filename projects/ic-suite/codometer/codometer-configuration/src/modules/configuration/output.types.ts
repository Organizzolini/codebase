// 🏷️ Types

import type { CodeStatisticsResult } from "@codometer/core";

/**
 * The anchor mechanics a `write` function would otherwise have to reimplement.
 *
 * Splicing a generated block between two HTML comments is the common case, so
 * it is one call away even for a writer that picks its own file.
 */
export interface MarkdownAnchorHelpers {
  endMarker: string;
  startMarker: string;
  /**
   * Splices the anchored block into a file, appending it when the markers are
   * absent, and creating the file when it does not exist.
   *
   * In check mode nothing is written and the return value reports whether the
   * file already holds the current block. Defaults to the rendered content and
   * the configured path; pass either to override.
   */
  syncAnchoredBlock: (overrides?: {
    content?: string | undefined;
    path?: string | undefined;
  }) => boolean;
  /** The content wrapped in the configured markers, ready to place anywhere. */
  wrapInAnchors: (content?: string) => string;
}

/**
 * Decides what the markdown report says, which file it lands in, and how.
 *
 * Return `false` to report the destination as stale — in check mode that is
 * what fails the command. Anything else counts as up to date.
 */
export type WriteMarkdownOutput = (
  args: WriteMarkdownOutputArguments,
) => boolean;

/** What a `write` function is handed. */
export interface WriteMarkdownOutputArguments {
  anchors: MarkdownAnchorHelpers;
  /** True when nothing may be written and the file is only being inspected. */
  check: boolean;
  /** The configured description, for a writer that wants to place it itself. */
  description: string | undefined;
  /** The configured path, resolved against the measured directory. */
  path: string | undefined;
  /**
   * The built-in badge rendering of these same statistics.
   *
   * Call it to build the default report's content, or to add to it, rather
   * than reimplementing it.
   */
  renderBadges: () => string;
  statistics: CodeStatisticsResult;
}
