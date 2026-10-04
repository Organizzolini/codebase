// ♟️ Constants

import type { CorpusFamily } from "./corpus.types";

/**
 * Every name the retired file tree filed a drawing under, in that tree's own
 * order — which is the order `CorpusService.ingest` ingests in, so the
 * local database's row order is a fact about the tree rather than about
 * whatever order a generated constant happens to be written in.
 *
 * `mosaic` is absent: it named no family, only the enumerated unit space
 * itself, which `EnumerationService` reproduces in full. See `CorpusFamily`.
 */
export const CORPUS_FAMILIES: readonly CorpusFamily[] = [
  "boxes",
  "branch",
  "chain",
  "clasps",
  "cross",
  "negative",
  "parallel",
  "snake",
  "swirl",
  "waterfalls",
  "whirl",
];

// 🚨 Errors

/**
 * Thrown when ingesting a corpus entry fails because its Code already
 * belongs to a row committed to the database — an enumerated row, or another
 * corpus entry ingested earlier in the same sweep — rather than being
 * silently overwritten.
 */
export class DuplicateCorpusCodeError extends Error {
  constructor(code: string, family: string, cause: unknown) {
    super(
      `hardcoded ${family} entry "${code}" collided with a Code already committed to the database`,
      { cause },
    );
    this.name = "DuplicateCorpusCodeError";
  }
}
