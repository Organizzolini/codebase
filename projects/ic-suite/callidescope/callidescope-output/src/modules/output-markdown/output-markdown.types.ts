// 🏷️ Types

import type { ResolvedCallidescopeMarkdownOutputConfiguration } from "@callidescope/configuration";
import type { CallGraphResult } from "@callidescope/core";

/** Arguments for splicing a block between its anchors. */
export interface SyncAnchoredBlockArguments {
  readonly check: boolean;
  readonly content: string;
  readonly destination: ResolvedCallidescopeMarkdownOutputConfiguration;
  readonly path: string | undefined;
}

/**
 * Arguments for syncing the configured markdown destination.
 *
 * The rendered markdown arrives already built: what a report says belongs to
 * the report module, and this one only decides where it lands.
 */
export interface SyncMarkdownArguments {
  readonly check: boolean;
  readonly content: string;
  readonly destination: ResolvedCallidescopeMarkdownOutputConfiguration;
  readonly result: CallGraphResult;
}

/** Arguments for wrapping content in the configured anchors. */
export interface WrapInAnchorsArguments {
  readonly content: string;
  readonly destination: ResolvedCallidescopeMarkdownOutputConfiguration;
}
