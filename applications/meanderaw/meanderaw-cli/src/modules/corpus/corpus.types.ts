// 🏷️ Types

/**
 * One historical drawing, read back onto the lattice once and kept as the
 * Code that names it — just enough for {@link CorpusService.ingest} to
 * decode, render, and characterize it again through the generic pipeline,
 * with no `svg` of its own to go stale against the renderer that produces
 * one. See `HISTORICAL_CORPUS` for the whole set and
 * `docs/adr/0013-hold-the-historical-corpus-as-a-test-set.md` for why it is
 * held as a test set.
 */
export interface CorpusEntry {
  readonly code: string;
  readonly columns: number;
  readonly rows: number;
}
