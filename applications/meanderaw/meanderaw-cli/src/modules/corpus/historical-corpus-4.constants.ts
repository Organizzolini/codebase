// ♟️ Constants

import type { CorpusEntry } from "./corpus.types";

/**
 * Part 4 of the historical corpus, extracted once by
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
export const HISTORICAL_CORPUS_4: readonly CorpusEntry[] = [
  {
    code: "2156a93356a956a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213356a956a956a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156a956a956a956a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156a956a956a93312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156a956a93356a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156a93356a956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213356a956a956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a93356a93356a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "659a33659a33659a12",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213356a93356a9659a",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "659a33659a56a93312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213356a9659a33659a",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "659a56a93356a93312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "21659a33659a33659a",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a93356a93356a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a93356a956a93321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a956a93356a93321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213356a93356a93321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213356a93356a956a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a93356a956a93312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213356a956a93356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a956a93356a93312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2156a93356a93356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213356a93356a93312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3356a9333356a93312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3356a93333659a3321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "659a333356a93356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213333659a33659a33",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3356a93356a9333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "659a33659a333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213356a93333659a33",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "659a333356a9333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213333659a333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3356a9333356a93321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a9333356a9333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a9333356a93356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "21333356a93356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3356a93356a9333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a93356a9333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213356a9333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a9333356a9333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "21333356a9333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "33333356a933333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3333659a333333659a",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "659a333333659a3333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3333659a3333333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3356a933333333659a",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "659a3333333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2133333333659a3333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "33333356a933333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "333356a93333333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "333356a933333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3356a933333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a933333356a93333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "2133333356a9333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "333356a93333333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "3356a93333333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "56a93333333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "213333333356a93333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 9,
  },
  {
    code: "44444444444444444444ccccccccca9ccccccccccccccccca339ccccccccccccccca33339ccccccccccccca3333339ccccccccccca333333339ccccccccca33333333339ccccccca3333333333339ccccca333333333333339cc8a333333333333333398",
    columns: 20,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "4444444444214444444444ccccccccca339ccccccccccccccccca33339ccccccccccccccca3333339ccccccccccccca333333339ccccccccccca33333333339ccccccccca3333333333339ccccccca333333333333339ccccca33333333333333339cc8a33333333333333333398",
    columns: 22,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "4444cccccccccccccccccccccccccccccccc8a98",
    columns: 4,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "444444cccccccccccccccccccccccccccccccccccccccccccca9cc8a3398",
    columns: 6,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44444444ccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccca339cc8a333398",
    columns: 8,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "4444444444cccccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccccca339ccccca33339cc8a33333398",
    columns: 10,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "444444444444ccccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccccccca339ccccccca33339ccccca3333339cc8a3333333398",
    columns: 12,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44444444444444cccccccccccccccccccccccccccccccccccccccccccccccca9ccccccccccca339ccccccccca33339ccccccca3333339ccccca333333339cc8a333333333398",
    columns: 14,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "4444444444444444ccccccccccccccccccccccccccccccccccccccca9ccccccccccccca339ccccccccccca33339ccccccccca3333339ccccccca333333339ccccca33333333339cc8a33333333333398",
    columns: 16,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "444444444444444444cccccccccccccccccccccccccca9ccccccccccccccca339ccccccccccccca33339ccccccccccca3333339ccccccccca333333339ccccccca33333333339ccccca3333333333339cc8a3333333333333398",
    columns: 18,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "4633333333333333335444444444444444444444cc6333333333333335ccccccccccca9cccccccccccc63333333333335ccccccccccca339cccccccccccc633333333335ccccccccccca33339cccccccccccc6333333335ccccccccccca3333339cccccccccccc63333335ccccccccccca333333339cccccccccccc633335ccccccccccca33333333339cccccccccccc6335ccccccccccca3333333333339cccccccccccc65ccccccccccca333333333333339cc888888888888888888888a333333333333333398",
    columns: 40,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "46333333333333333333544444444444214444444444cc633333333333333335ccccccccccca339cccccccccccc6333333333333335ccccccccccca33339cccccccccccc63333333333335ccccccccccca3333339cccccccccccc633333333335ccccccccccca333333339cccccccccccc6333333335ccccccccccca33333333339cccccccccccc63333335ccccccccccca3333333333339cccccccccccc633335ccccccccccca333333333333339cccccccccccc6335ccccccccccca33333333333333339cc88888888882188888888888a33333333333333333398",
    columns: 44,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "46544444cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc88888a98",
    columns: 8,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "463354444444cc65cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccca9cc8888888a3398",
    columns: 12,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "4633335444444444cc6335ccccccccccccc65cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccccccccccca339cc888888888a333398",
    columns: 16,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "46333333544444444444cc633335ccccccccccccccc6335ccccccccccccccccc65cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccccccccccccccca339ccccccccccccccca33339cc88888888888a33333398",
    columns: 20,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "463333333354444444444444cc63333335ccccccccccccccccc633335ccccccccccccccccccc6335ccccccccccccccccccccc65cccccccccccccccccccccccccccccccccca9ccccccccccccccccccccca339ccccccccccccccccccca33339ccccccccccccccccca3333339cc8888888888888a3333333398",
    columns: 24,
    filedUnder: ["parallel"],
    rows: 10,
  },
];
/* cspell:enable */
