// 🏷️ Types

import type { Connection } from "../../lexico-api.types";
import type { SearchMatchSource } from "./search.entities";
import type { Lexeme } from "@codebase/lexico-entities";

/**
 * Result of Latin enclitic decomposition.
 */
export interface EncliticDecompositionResult {
  enclitic: null | string;
  stem: string;
}

/**
 * One lexeme an English search matched, with its best translation's score.
 */
export interface EnglishSearchMatch {
  lexemeId: string;
  score: number;
}

/**
 * One lexeme a search matched, with how it matched, before it is mapped to
 * the `LexemeSearchResult` the API returns.
 */
export interface LexemeSearchMatch {
  enclitic: null | string;
  identifiers: string[];
  lexeme: Lexeme;
  score: number;
  source: SearchMatchSource;
}

/**
 * Payload encoded into search pagination cursors.
 */
export interface SearchCursorPayload {
  id: string;
  score: number;
}

/**
 * One completed dictionary search, as recorded in its log line.
 */
export interface SearchLogEntry {
  connection: Connection<LexemeSearchMatch>;
  language: "english" | "latin";
  query: string;
  startTime: number;
}

/**
 * Options controlling Relay search pagination.
 */
export interface SearchPaginationOptions {
  after?: null | string | undefined;
  before?: null | string | undefined;
  first?: null | number | undefined;
  last?: null | number | undefined;
}
