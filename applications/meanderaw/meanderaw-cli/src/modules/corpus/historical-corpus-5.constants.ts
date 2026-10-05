// ♟️ Constants

import type { CorpusEntry } from "./corpus.types";

/**
 * Part 5 of the historical corpus, extracted once by
 * a one-shot script from the `output/` drawing tree this repository used to
 * commit, and deleted in the same pull request that added this file — see
 * `HISTORICAL_CORPUS` for what the whole set is and how `filedUnder` is to
 * be read, and
 * `docs/adr/0013-hold-the-historical-corpus-as-a-test-set.md` for why the
 * extraction ran once. The split is by printed line count rather than by
 * entry count, because an entry costs one line or six depending on how long
 * its Code is, and no chunk may cross the 512-line cap.
 */
// 🎯 Hexadecimal lattice Codes rather than words, so the dictionaries are
// turned off across them — a run of hexadecimal digits occasionally spells one.
/* cspell:disable */
export const HISTORICAL_CORPUS_5: readonly CorpusEntry[] = [
  {
    code: "4633333333335444444444444444cc6333333335ccccccccccccccccccc63333335ccccccccccccccccccccc633335ccccccccccccccccccccccc6335ccccccccccca9cccccccccccc65ccccccccccca339ccccccccccccccccccccccca33339ccccccccccccccccccccca3333339ccccccccccccccccccca333333339cc888888888888888a333333333398",
    columns: 28,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "46333333333333544444444444444444cc633333333335ccccccccccccccccccccc6333333335ccccccccccccccccccccccc63333335ccccccccccca9cccccccccccc633335ccccccccccca339cccccccccccc6335ccccccccccca33339cccccccccccc65ccccccccccca3333339ccccccccccccccccccccccca333333339ccccccccccccccccccccca33333333339cc88888888888888888a33333333333398",
    columns: 32,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "463333333333333354444444444444444444cc63333333333335ccccccccccccccccccccccc633333333335ccccccccccca9cccccccccccc6333333335ccccccccccca339cccccccccccc63333335ccccccccccca33339cccccccccccc633335ccccccccccca3333339cccccccccccc6335ccccccccccca333333339cccccccccccc65ccccccccccca33333333339ccccccccccccccccccccccca3333333333339cc8888888888888888888a3333333333333398",
    columns: 36,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "33333356a93333333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "33333356a93333333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "3333659a3333333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "3356a933333333659a33",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "659a3333333356a93333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2133333333659a333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "333356a93333333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "3356a93333333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "56a93333333356a93333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "213333333356a9333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "33333333333333333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "3333333333333333659a",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "333333333333659a3333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "33333333659a33333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "3333659a333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "659a3333333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "33333333333333333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "333333333333333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "21333333333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "3333333333333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "33333333333356a93333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "333333333356a9333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "3333333356a933333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "33333356a93333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "333356a9333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "3356a933333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "56a93333333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44cccccca956cccccc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44cccccca965cccccc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44cca956cccca956cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44cca965cccc9a56cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44cca956cccca965cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44a956cca956cca95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44a965cc9a56cca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44a956cca956cca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2156a956cca956a95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "21659a56cca9659a5688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2165cc9a56a965cc9a12",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44a9659a56cca9659a12",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2165cc9a56a9659a5688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44a9659a56a965cc9a12",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2156a956cca956a96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2156cca956a956cca921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44a956a956cca956a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2156cca956a956a96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44a956a956a956cca921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2156cca956a956cca912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44a956a956cca956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2156cca956a956a95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44a956a956a956cca912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2156a956a956a956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "21659a56a9659a56a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2156a956a956a956a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "56a956a93356a956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "659a56a93356a9659a12",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "21659a33659a56a9659a",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "213356a9659a56a93312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "659a56a9659a33659a12",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "21659a56a93356a9659a",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "21659a33659a56a93312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "213356a9659a33659a12",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "56a956a93356a956a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "213356a956a956a93321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "56a956a956a93356a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2156a93356a956a93321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "213356a956a93356a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2156a93356a956a956a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "213356a956a956a93312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "56a956a956a93356a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2156a956a93356a956a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "2156a93356a956a93312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "213356a956a93356a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "56a93356a93356a93312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
];
/* cspell:enable */
