// 🏷️ Types

import type {
  CommandOptionChoice,
  CommandOptionValue,
} from "../lexico-ingestion/lexico-ingestion.types";
import type { Author, Text } from "@codebase/lexico-entities";
import type { PhrasingContent } from "mdast";

/**
 * Inputs required to ingest one markdown text into the literature entity graph.
 */
export interface IngestTextArguments {
  author: Author;
  parentText: Text | undefined;
  textPath: string;
  textSlugName: string;
  title: string;
}

/**
 * Discovered markdown file metadata collected from `data/library`.
 */
export interface LibraryEntry {
  authorSlug: string;
  fullPath: string;
  pathParts: string[];
  provider: string;
  textSlug: string;
  title: string;
}

/**
 * Optional CLI filters that scope literature ingestion. Each is the value
 * given, `true` for a bare flag, or absent when omitted.
 */
export interface LiteratureCommandOptions {
  author?: CommandOptionValue;
  provider?: CommandOptionValue;
  text?: CommandOptionValue;
}

/**
 * Inputs for resolving one literature filter from its flag or a prompt.
 */
export interface LiteratureFilterArguments {
  choices: CommandOptionChoice[];
  label: string;
  message: string;
  value: CommandOptionValue;
}

/**
 * Parsed line label and associated inline markdown nodes.
 */
export interface ParsedLabelResult {
  label: string;
  lineNodes: PhrasingContent[];
}
