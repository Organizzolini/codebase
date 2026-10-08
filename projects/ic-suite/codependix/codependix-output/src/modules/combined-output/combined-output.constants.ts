// ♟️ Constants

import {
  FILE_IMPORTS_MARKDOWN_SUBHEADING,
  NESTJS_MODULES_MARKDOWN_SUBHEADING,
  NX_PROJECTS_MARKDOWN_SUBHEADING,
} from "../graph-run/graph-run.constants";

import type { CodependixGraphType } from "@codependix/configuration";

/** What `--format json` prints: every active graph type's data, keyed by type. */
export const FORMAT_JSON = "json";

/**
 * What `--format markdown` prints: every active graph type's rendered
 * diagram. Also what `--format` prints when the flag is left off entirely —
 * unlike codometer, whose fallback reads a resolved configuration field,
 * codependix's configuration declares no `format` field of its own, so the
 * default is this same fixed constant instead of a second one aliasing it.
 */
export const FORMAT_MARKDOWN = "markdown";

/**
 * Everything `--format` accepts, in the order an error message lists them.
 *
 * A tuple rather than a bare union: `MapCommand.parseFormat` validates
 * against this array directly, so a format added here is accepted everywhere
 * the moment it is rendered — mirroring `codometer-cli`'s own `FORMAT_NAMES`.
 */
export const FORMAT_NAMES = [FORMAT_JSON, FORMAT_MARKDOWN] as const;

/**
 * The anchor name and `### <subheading>` a combined Markdown destination
 * splices each active graph type's section under, keyed by graph type.
 *
 * The anchor name is the graph type itself: a combined destination has no
 * per-project or per-workspace configuration of its own to read one from, so
 * this is the one predictable name every combined run produces.
 */
export const GRAPH_TYPE_MARKDOWN_SUBHEADINGS: Record<
  CodependixGraphType,
  string
> = {
  fileImports: FILE_IMPORTS_MARKDOWN_SUBHEADING,
  nestjsModules: NESTJS_MODULES_MARKDOWN_SUBHEADING,
  nxProjects: NX_PROJECTS_MARKDOWN_SUBHEADING,
};
