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
 * A search match keyed by its lexeme's id, the shape a ranked page is loaded
 * as before it is handed out.
 */
export interface RankedLexemeMatch extends LexemeSearchMatch {
  id: string;
}

/**
 * The SQL ranking every lexeme a search matched — one `lexemeId` and `score`
 * row each — and the parameters it binds.
 */
export interface RankedLexemeQuery {
  parameters: Record<string, unknown>;
  sql: string;
}

/** A lexeme on a ranked page, with the score its best tier gave it. */
export interface ScoredLexeme {
  lexeme: Lexeme;
  score: number;
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
