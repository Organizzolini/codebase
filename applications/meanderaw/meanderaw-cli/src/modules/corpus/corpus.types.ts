// 🏷️ Types

/**
 * One historical drawing, read back onto the lattice once and kept as the
 * Code that names it — just enough for {@link CorpusService.ingest} to
 * decode, render, and characterize it again through the generic pipeline,
 * with no `svg` of its own to go stale against the renderer that produces
 * one.
 *
 * {@link filedUnder} is **provenance**: the `output/<family>/` directories
 * this Code's drawings sat in, in the order the retired file tree gave them
 * up. It is where the drawing was filed, never a claim about what the ink
 * does — a Code the tree filed under two names keeps both, and nothing here
 * decides between them.
 *
 * It is a **non-empty** tuple rather than a plain array, because every entry
 * here came out of some `output/<family>/` directory and
 * `CorpusService.ingest` walks the families rather than the entries. An
 * entry filed under nothing would match no family and vanish from the draw run
 * with no row and no error, so the type refuses to describe one. See `HISTORICAL_CORPUS` for the whole set and
 * `docs/adr/0013-hold-the-historical-corpus-as-a-test-set.md` for why the
 * labels are not to be trusted back into place.
 */
export interface CorpusEntry {
  readonly code: string;
  readonly columns: number;
  readonly filedUnder: readonly [CorpusFamily, ...CorpusFamily[]];
  readonly rows: number;
}

/**
 * The nine names the retired file tree filed a drawing under, in the order
 * that tree gave them up — which is the order
 * {@link CorpusService.ingest} still ingests in.
 *
 * `mosaic` is absent, and is the tenth directory that tree held. It names no
 * family: it was the enumerated unit space itself, which
 * `EnumerationService` reproduces in full, so none of its 8,551 drawings is
 * preserved here. The extraction still read every one of them back and
 * checked it against the Code its own filename spells out, which is what
 * makes that subtree the parser's own proof rather than a gap in it.
 */
export type CorpusFamily =
  | "boxes"
  | "branch"
  | "chain"
  | "clasps"
  | "cross"
  | "negative"
  | "parallel"
  | "snake"
  | "swirl"
  | "waterfalls"
  | "whirl";
