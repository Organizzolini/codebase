// 🏷️ Types

import type { CallidescopeOutputFormat } from "@callidescope/configuration";
import type { CallableId, SourceLocation } from "@callidescope/core";
import type {
  CallableDirectCalls,
  CallAddressTreeResult,
} from "@callidescope/graph";

/** One callable's direct callers and callees, without the run-level format. */
export interface BreadthReport {
  readonly address: string;
  readonly directCalls: CallableDirectCalls;
  readonly displayName: string;
  readonly id: CallableId;
  readonly location: SourceLocation;
}

/** One callable's traced paths, without the run-level format. */
export interface DepthReport {
  readonly address: string;
  readonly downward: CallAddressTreeResult;
  readonly upward: CallAddressTreeResult;
}

/** Arguments for rendering one callable's direct callers and callees. */
export interface RenderBreadthArguments extends BreadthReport {
  readonly format: CallidescopeOutputFormat;
}

/** Arguments for rendering several callables' direct calls as one document. */
export interface RenderBreadthReportsArguments {
  readonly format: CallidescopeOutputFormat;
  readonly reports: readonly BreadthReport[];
}

/** Arguments for rendering the paths traced above and below one callable. */
export interface RenderDepthArguments extends DepthReport {
  readonly format: CallidescopeOutputFormat;
}

/** Arguments for rendering several callables' traced paths as one document. */
export interface RenderDepthReportsArguments {
  readonly format: CallidescopeOutputFormat;
  readonly reports: readonly DepthReport[];
}
