// ♟️ Constants

/**
 * The edge budget the historical corpus was extracted against, and the
 * boundary `CorpusService` ingests it by: every entry past sixteen edges is
 * preserved as a hardcoded row.
 *
 * Fixed rather than read from the draw run's own budget. When the budget rose
 * past sixteen, a boundary that followed it dropped the entries it newly
 * reached — the exact duplicates of an enumerated meander, and the mirrors
 * and flips the enumeration folds. Hardcoded meanders are never deduplicated against the draw run;
 * the draw run skips a Code a hardcoded row already holds instead.
 */
export const HISTORICAL_CORPUS_EDGE_BUDGET = 16;

// 🚨 Errors

/**
 * Thrown when ingesting a corpus entry fails because its Code already
 * belongs to a row committed to the database — an enumerated row, or another
 * corpus entry ingested earlier in the same draw run — rather than being
 * silently overwritten.
 */
export class DuplicateCorpusCodeError extends Error {
  constructor(code: string, cause: unknown) {
    super(
      `hardcoded entry "${code}" collided with a Code already committed to the database`,
      { cause },
    );
    this.name = "DuplicateCorpusCodeError";
  }
}
