// 🏷️ Types

import type { ResolvedCodependixGraphOutput } from "@codependix/configuration";
import type {
  CodependixRunMode,
  MarkdownSectionArguments,
} from "@codependix/core";

/** Arguments shared by every method that delivers one file destination. */
export interface DeliverFileArguments {
  absoluteRoot: string;
  content: string;
  mode: CodependixRunMode;
  relativePath: string;
}

/**
 * Arguments for delivering one project's (or the workspace's) resolved
 * export configuration.
 *
 * `jsonContent`/`markdownContent` are rendered by the caller — every graph
 * type renders its own JSON shape and its own diagram — and are only read
 * when the resolved output actually touches that destination, so a caller
 * whose target is `"markdown"` never has to render JSON it will not deliver.
 */
export interface DeliverGraphOutputArguments {
  jsonContent: string | undefined;
  markdownContent: string | undefined;
  /**
   * The heading text used to auto-create a missing anchor's section on write.
   *
   * `undefined` for a standalone (non-anchored) Markdown destination, which
   * has no section to create. Required whenever the destination is anchored
   * and might need auto-creation — see `DeliveryService.deliverAnchoredMarkdown`.
   */
  markdownSection: MarkdownSectionArguments | undefined;
  mode: CodependixRunMode;
  project: DeliveryProject;
  resolvedOutput: ResolvedCodependixGraphOutput;
}

/** The project (or workspace) a graph export is delivered relative to. */
export interface DeliveryProject {
  absoluteRoot: string;
  name: string;
}
