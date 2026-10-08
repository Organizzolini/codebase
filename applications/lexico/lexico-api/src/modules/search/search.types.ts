// 🏷️ Types

import type { Connection } from "../../lexico-api.types";
import type { LexemeSearchResult } from "./search.entities";

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
  connection: Connection<LexemeSearchResult>;
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
