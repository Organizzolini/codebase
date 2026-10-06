import type { CommandOptionValue } from "../lexico-ingestion/lexico-ingestion.types";
import type { Author } from "@codebase/lexico-entities";

// 🏷️ Types

/**
 * Optional CLI filters applied before invoking library source providers. Each
 * is the value given, `true` for a bare flag, or absent when omitted.
 */
export interface LibraryCommandOptions {
  author?: CommandOptionValue;
  provider?: CommandOptionValue;
  text?: CommandOptionValue;
}

/**
 * Provider contract for ingesting one source corpus into author/text entities.
 */
export interface LibrarySourceProvider {
  ingest: (options?: { author?: string; text?: string }) => Promise<Author[]>;
  name: string;
}
