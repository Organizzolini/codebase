// 🏷️ Types

import type { CommandOptionValue } from "../lexico-ingestion/lexico-ingestion.types";

/**
 * Optional start and end lemmas used to bound dictionary ingestion. Each is
 * the lemma given, `true` for a bare flag, or absent for no bound.
 */
export interface DictionaryCommandOptions {
  endLemma?: CommandOptionValue;
  startLemma?: CommandOptionValue;
}
