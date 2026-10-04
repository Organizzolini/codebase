// ♟️ Constants

import type { CorpusEntry } from "./corpus.types";

/**
 * Part 6 of the historical corpus, extracted once by
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
export const HISTORICAL_CORPUS_6: readonly CorpusEntry[] = [
  {
    code: "659a33659a33659a3321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "56a93356a93356a93321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "213356a93356a93356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "3356a9333356a9333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "3356a93333659a333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "659a333356a93333659a",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "213333659a333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "3356a9333356a9333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "56a9333356a9333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "21333356a9333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 10,
  },
  {
    code: "44444444444444444444ccccccccccccccccccccccccccccca9ccccccccccccccccca339ccccccccccccccca33339ccccccccccccca3333339ccccccccccca333333339ccccccccca33333333339ccccccca3333333333339ccccca333333333333339cc8a333333333333333398",
    columns: 20,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "4444444444444444444444cccccccccca9ccccccccccccccccccca339ccccccccccccccccca33339ccccccccccccccca3333339ccccccccccccca333333339ccccccccccca33333333339ccccccccca3333333333339ccccccca333333333333339ccccca33333333333333339cc8a33333333333333333398",
    columns: 22,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "444444444442144444444444cccccccccca339ccccccccccccccccccca33339ccccccccccccccccca3333339ccccccccccccccca333333339ccccccccccccca33333333339ccccccccccca3333333333339ccccccccca333333333333339ccccccca33333333333333339ccccca3333333333333333339cc8a3333333333333333333398",
    columns: 24,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "4444cccccccccccccccccccccccccccccccccccc8a98",
    columns: 4,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "444444cccccccccccccccccccccccccccccccccccccccccccccccccca9cc8a3398",
    columns: 6,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "44444444ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccca339cc8a333398",
    columns: 8,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "4444444444cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccccca339ccccca33339cc8a33333398",
    columns: 10,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "444444444444ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccccccca339ccccccca33339ccccca3333339cc8a3333333398",
    columns: 12,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "44444444444444cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccccccccca339ccccccccca33339ccccccca3333339ccccca333333339cc8a333333333398",
    columns: 14,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "4444444444444444ccccccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccccccccccca339ccccccccccca33339ccccccccca3333339ccccccca333333339ccccca33333333339cc8a33333333333398",
    columns: 16,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "444444444444444444cccccccccccccccccccccccccccccccccccccccccccca9ccccccccccccccca339ccccccccccccca33339ccccccccccca3333339ccccccccca333333339ccccccca33333333339ccccca3333333333339cc8a3333333333333398",
    columns: 18,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "4633333333333333335444444444444444444444cc6333333333333335ccccccccccccccccccccccccc63333333333335cccccccccccca9ccccccccccccc633333333335cccccccccccca339ccccccccccccc6333333335cccccccccccca33339ccccccccccccc63333335cccccccccccca3333339ccccccccccccc633335cccccccccccca333333339ccccccccccccc6335cccccccccccca33333333339ccccccccccccc65cccccccccccca3333333333339ccccccccccccccccccccccccca333333333333339cc888888888888888888888a333333333333333398",
    columns: 40,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "46333333333333333333544444444444444444444444cc633333333333333335cccccccccccca9ccccccccccccc6333333333333335cccccccccccca339ccccccccccccc63333333333335cccccccccccca33339ccccccccccccc633333333335cccccccccccca3333339ccccccccccccc6333333335cccccccccccca333333339ccccccccccccc63333335cccccccccccca33333333339ccccccccccccc633335cccccccccccca3333333333339ccccccccccccc6335cccccccccccca333333333333339ccccccccccccc65cccccccccccca33333333333333339cc88888888888888888888888a33333333333333333398",
    columns: 44,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "463333333333333333333354444444444442144444444444cc63333333333333333335cccccccccccca339ccccccccccccc633333333333333335cccccccccccca33339ccccccccccccc6333333333333335cccccccccccca3333339ccccccccccccc63333333333335cccccccccccca333333339ccccccccccccc633333333335cccccccccccca33333333339ccccccccccccc6333333335cccccccccccca3333333333339ccccccccccccc63333335cccccccccccca333333333333339ccccccccccccc633335cccccccccccca33333333333333339ccccccccccccc6335cccccccccccca3333333333333333339cc8888888888821888888888888a3333333333333333333398",
    columns: 48,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "46544444cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc88888a98",
    columns: 8,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "463354444444cc65cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccca9cc8888888a3398",
    columns: 12,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "4633335444444444cc6335ccccccccccccc65cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccccccccccca339cc888888888a333398",
    columns: 16,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "46333333544444444444cc633335ccccccccccccccc6335ccccccccccccccccc65cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccccccccccccccca339ccccccccccccccca33339cc88888888888a33333398",
    columns: 20,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "463333333354444444444444cc63333335ccccccccccccccccc633335ccccccccccccccccccc6335ccccccccccccccccccccc65cccccccccccccccccccccccccccccccccccccccccccccccccccccccccca9ccccccccccccccccccccca339ccccccccccccccccccca33339ccccccccccccccccca3333339cc8888888888888a3333333398",
    columns: 24,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "4633333333335444444444444444cc6333333335ccccccccccccccccccc63333335ccccccccccccccccccccc633335ccccccccccccccccccccccc6335ccccccccccccccccccccccccc65cccccccccccca9ccccccccccccccccccccccccca339ccccccccccccccccccccccca33339ccccccccccccccccccccca3333339ccccccccccccccccccca333333339cc888888888888888a333333333398",
    columns: 28,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "46333333333333544444444444444444cc633333333335ccccccccccccccccccccc6333333335ccccccccccccccccccccccc63333335ccccccccccccccccccccccccc633335cccccccccccca9ccccccccccccc6335cccccccccccca339ccccccccccccc65cccccccccccca33339ccccccccccccccccccccccccca3333339ccccccccccccccccccccccca333333339ccccccccccccccccccccca33333333339cc88888888888888888a33333333333398",
    columns: 32,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "463333333333333354444444444444444444cc63333333333335ccccccccccccccccccccccc633333333335ccccccccccccccccccccccccc6333333335cccccccccccca9ccccccccccccc63333335cccccccccccca339ccccccccccccc633335cccccccccccca33339ccccccccccccc6335cccccccccccca3333339ccccccccccccc65cccccccccccca333333339ccccccccccccccccccccccccca33333333339ccccccccccccccccccccccca3333333333339cc8888888888888888888a3333333333333398",
    columns: 36,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "333356a9333356a9333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3333659a333356a9333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3356a93333659a333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "659a333356a93333659a33",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "213333659a333356a93333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3356a93333659a33333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "659a333356a933333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "213333659a333333659a33",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3356a933333356a9333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "659a333333659a333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "2133333356a93333659a33",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "333356a9333356a9333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3356a9333356a933333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3356a9333356a9333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "56a9333356a9333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "21333356a9333356a93333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3356a9333356a933333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "56a9333356a933333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "21333356a933333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3356a933333356a9333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "56a933333356a9333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "2133333356a9333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3333333356a93333333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "33333333659a3333333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "33333356a933333333659a",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3333659a3333333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3356a933333333659a3333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "659a3333333356a9333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "2133333333659a33333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3333659a3333333333659a",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "659a3333333333659a3333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3333333356a93333333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "33333356a9333333333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "33333356a93333333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "21333333333356a9333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "333356a93333333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3356a93333333356a93333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "56a93333333356a9333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "213333333356a933333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "33333356a9333333333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "333356a9333333333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3356a9333333333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "56a9333333333356a93333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
  {
    code: "3333333333333333333312",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 11,
  },
];
/* cspell:enable */
