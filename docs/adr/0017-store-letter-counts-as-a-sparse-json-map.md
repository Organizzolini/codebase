# 0017: Store Letter Counts as a Sparse JSON Map

Superseded by [ADR 0018](0018-store-every-characteristic-in-one-sparse-json-map.md), which folds every other Characteristic into the same map.

## Context

`meanderaw` counts every letter glyph it recognizes in every meander, and each letter is counted in all sixteen orientations. The letter set grows script by script, so the count of letter keys runs from about 700 today to about 2,700 once Arabic's positional forms land. One SQLite table holds at most 2,000 columns, so letter counts could not stay a column each on `meanders`.

The default was a 1:1 `meander_glyphs` table keyed by meander, split into one table per script to stay under the column cap. The alternative was a single JSON column on `meanders`. We agreed to implement whichever measured faster to write and query over the full sweep.

## Decision

Letter counts live in one `simple-json` `glyphs` column on `meanders`, holding only nonzero counts. This departs from the 1:1 table default because the benchmark favored the JSON column.

The first benchmark used TypeORM, all 31,242 real rows, and synthetic letter keys that borrowed real per-key sparsity. Values are medians of 5 runs at 1,600 keys and 3 runs at 2,700 keys:

| Design | Keys | Write full sweep (ms) | Single-key filter (ms) | Fetch one full record (ms) | Read all, expanded (ms) | Database size (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| JSON sparse | 1,600 | 10,651 | 3.6 | 0.7 | 5,257 | 11.9 |
| JSON dense | 1,600 | 16,842 | 1,144.6 | 1.0 | 9,292 | 961.0 |
| 1:1 tables per script | 1,600 | 85,620 | 138.2 | 4.9 | 14,278 | 64.7 |
| JSON sparse | 2,700 | 17,585 | 4.6 | 0.9 | 10,719 | 14.7 |
| JSON dense | 2,700 | 25,866 | 5,804.6 | 2.6 | 14,508 | 1,664.8 |
| 1:1 tables per script | 2,700 | 182,828 | 163.0 | 10.0 | 26,614 | 107.5 |

A review reran the two leading designs with raw `better-sqlite3` prepared statements and no TypeORM, at 1,600 keys over 3 runs:

| Design | Write full sweep (ms) | Single-key filter (ms) | Database size (MB) |
| --- | ---: | ---: | ---: |
| JSON sparse | about 640 | 6.2 | 19.6 |
| 1:1 tables per script | about 1,970 | 5.5 | 73 |

The tuned rerun shows that most of the first benchmark's write and filter gap came from TypeORM overhead on 700-column inserts. The gap is not intrinsic. Under either harness, the JSON column writes at least three times faster and is at most about a quarter the size. With the overhead removed, the single-key filter is a tie. The database is committed to git, so its size matters as much as its speed. Dense JSON, which stores the zeros too, was rejected because it grows toward 1 to 2 GB.

## Consequences

- A new or renamed letter needs no migration, entity or drift-check change. The key set comes from the evaluators marked as letters. A boot check fails unless an evaluator is marked as a letter exactly when its numeric key has no column of its own, so no count is stored twice or nowhere.
- A missing key means zero. TypeScript readers use `?? 0`. Raw SQL readers must use `COALESCE(json_extract(glyphs, '$.key'), 0)` whenever they filter on zero or less-than, because a missing key extracts as NULL.
- Letter counts are no longer typed SQL columns. A query that filters on a letter goes through `json_extract` rather than a plain column, and cannot use an ordinary column index.
- Non-letter characteristics stay as their own columns on `meanders`.
