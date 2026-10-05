// ♟️ Constants

import type { CorpusEntry } from "./corpus.types";

/**
 * Part 3 of the historical corpus, extracted once by
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
export const HISTORICAL_CORPUS_3: readonly CorpusEntry[] = [
  {
    code: "4444444444444444ccccccccccccccccccccccca9ccccccccccccca339ccccccccccca33339ccccccccca3333339ccccccca333333339ccccca33333333339cc8a33333333333398",
    columns: 16,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "444444444444444444cccccccca9ccccccccccccccca339ccccccccccccca33339ccccccccccca3333339ccccccccca333333339ccccccca33333333339ccccca3333333333339cc8a3333333333333398",
    columns: 18,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "4633333333333333335444444444421444444444cc6333333333333335cccccccccca339ccccccccccc63333333333335cccccccccca33339ccccccccccc633333333335cccccccccca3333339ccccccccccc6333333335cccccccccca333333339ccccccccccc63333335cccccccccca33333333339ccccccccccc633335cccccccccca3333333333339ccccccccccc6335cccccccccca333333333333339cc888888888218888888888a333333333333333398",
    columns: 40,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "46544444cccccccccccccccccccccccccccccccccccccccccccccccccccccccc88888a98",
    columns: 8,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "463354444444cc65cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccca9cc8888888a3398",
    columns: 12,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "4633335444444444cc6335ccccccccccccc65cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccccccccccca339cc888888888a333398",
    columns: 16,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "46333333544444444444cc633335ccccccccccccccc6335ccccccccccccccccc65cccccccccccccccccccccccccccccccccccccccccccccccca9ccccccccccccccccca339ccccccccccccccca33339cc88888888888a33333398",
    columns: 20,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "463333333354444444444444cc63333335ccccccccccccccccc633335ccccccccccccccccccc6335ccccccccccccccccccccc65cccccccccca9ccccccccccccccccccccca339ccccccccccccccccccca33339ccccccccccccccccca3333339cc8888888888888a3333333398",
    columns: 24,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "4633333333335444444444444444cc6333333335ccccccccccccccccccc63333335ccccccccccccccccccccc633335cccccccccca9ccccccccccc6335cccccccccca339ccccccccccc65cccccccccca33339ccccccccccccccccccccca3333339ccccccccccccccccccca333333339cc888888888888888a333333333398",
    columns: 28,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "46333333333333544444444444444444cc633333333335ccccccccccccccccccccc6333333335cccccccccca9ccccccccccc63333335cccccccccca339ccccccccccc633335cccccccccca33339ccccccccccc6335cccccccccca3333339ccccccccccc65cccccccccca333333339ccccccccccccccccccccca33333333339cc88888888888888888a33333333333398",
    columns: 32,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "463333333333333354444444444444444444cc63333333333335cccccccccca9ccccccccccc633333333335cccccccccca339ccccccccccc6333333335cccccccccca33339ccccccccccc63333335cccccccccca3333339ccccccccccc633335cccccccccca333333339ccccccccccc6335cccccccccca33333333339ccccccccccc65cccccccccca3333333333339cc8888888888888888888a3333333333333398",
    columns: 36,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "333333333333333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "333333333333333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "333333333333659a33",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "33333333659a333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3333659a3333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "659a33333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3333333333333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "33333333333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "333333333356a93333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3333333356a9333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "33333356a933333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "333356a93333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3356a9333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a933333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213333333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44cccca956cccccc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44cccca965cccccc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44cccccca965cccc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44cccccca956cccc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a956cccca956cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a965cccc9a56cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44cca965cccc9a5688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44cca965cc9a56cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a956cccca965cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44cca956cccca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44cca956cca965cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44cca956cccca95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44cca956cca956cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156cca956cca95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2165cc9a56cca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a965cc9a56cca921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a965cc9a56a96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a9659a56cca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156cca956cca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a956cca956cca921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a956cca956a96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a956a956cca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a956cca956cca912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a956cca956a95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a956a956cca95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156a956a956a95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "21659a56a9659a5688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "21659a56a965cc9a12",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "21659a56cca9659a12",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2165cc9a56a9659a12",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a9659a56a9659a12",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156a956a956a96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156a956a956cca921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156a956cca956a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156cca956a956a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a956a956a956a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156a956a956cca912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156a956cca956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156cca956a956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44a956a956a956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a956a956a956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "659a56a9659a56a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "21659a56a9659a56a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "21659a56a9659a3321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "21659a56a93356a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "21659a33659a56a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213356a9659a56a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a956a956a956a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156a956a956a93321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156a956a93356a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
];
/* cspell:enable */
