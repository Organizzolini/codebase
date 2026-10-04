// ♟️ Constants

import { HISTORICAL_CORPUS_1 } from "./historical-corpus-1.constants";
import { HISTORICAL_CORPUS_2 } from "./historical-corpus-2.constants";
import { HISTORICAL_CORPUS_3 } from "./historical-corpus-3.constants";
import { HISTORICAL_CORPUS_4 } from "./historical-corpus-4.constants";
import { HISTORICAL_CORPUS_5 } from "./historical-corpus-5.constants";
import { HISTORICAL_CORPUS_6 } from "./historical-corpus-6.constants";
import { HISTORICAL_CORPUS_7 } from "./historical-corpus-7.constants";
import { HISTORICAL_CORPUS_8 } from "./historical-corpus-8.constants";
import { HISTORICAL_CORPUS_9 } from "./historical-corpus-9.constants";
import { HISTORICAL_CORPUS_10 } from "./historical-corpus-10.constants";
import { HISTORICAL_CORPUS_11 } from "./historical-corpus-11.constants";

import type { CorpusEntry } from "./corpus.types";

/**
 * Every drawing this repository used to commit under `output/`, read back
 * onto the lattice once and collapsed to one entry per Code — the whole
 * historical corpus, and the labelled fixture set every family rule is
 * measured against.
 *
 * **`filedUnder` is provenance, never a fact about the ink.** It says
 * which `output/<family>/` directories a Code's drawings sat in, in the
 * order the tree gave them up, and nothing more. The tree is known to be
 * wrong in places — see
 * `docs/adr/0013-hold-the-historical-corpus-as-a-test-set.md` — so a
 * family rule that disagrees with one of these labels is a disagreement to
 * adjudicate by looking at the drawing, not a rule that has failed.
 *
 * **Which of these the draw run ingests is computed, not listed.** A meander
 * the enumeration already reaches is reproduced by `EnumerationService`
 * rather than preserved here, so `CorpusService.ingest` keeps only the
 * entries beyond that reach — see its own doc comment for the two bounds
 * that decide it.
 *
 * Reassembled from the chunk files the extraction split it across, at a
 * printed line count rather than an entry count: an entry costs one line or
 * six depending on how long its Code is, and no chunk may cross the
 * 512-line cap.
 */
export const HISTORICAL_CORPUS: readonly CorpusEntry[] = [
  ...HISTORICAL_CORPUS_1,
  ...HISTORICAL_CORPUS_2,
  ...HISTORICAL_CORPUS_3,
  ...HISTORICAL_CORPUS_4,
  ...HISTORICAL_CORPUS_5,
  ...HISTORICAL_CORPUS_6,
  ...HISTORICAL_CORPUS_7,
  ...HISTORICAL_CORPUS_8,
  ...HISTORICAL_CORPUS_9,
  ...HISTORICAL_CORPUS_10,
  ...HISTORICAL_CORPUS_11,
];
