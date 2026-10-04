# 0018: Store Every Characteristic in One Sparse JSON Map

## Context

[ADR 0017](0017-store-letter-counts-as-a-sparse-json-map.md) moved letter counts into a sparse `glyphs` JSON column on `meanders`, and left every other numeric Characteristic in a typed column of its own. [ADR 0015](0015-store-families-as-an-open-multi-label-set.md) had already put the boolean Characteristics that hold into a `characteristics` string array. So one meander row stored its Characteristics in three shapes: 38 integer and float columns, a letter map, and a list of true booleans with `isReducible` appended.

The split was there only for storage. Every evaluator carried a `letter` flag, and a boot check refused an evaluator flagged a letter exactly when its key had a column. `COLUMN_CHARACTERISTIC_KEYS`, `ColumnCharacteristicRecord`, and `GlyphCounts` named which shape a key went to. The drift check, the row builders, and their tests each handled all three shapes separately, and a new non-letter Characteristic needed a new entity column.

## Decision

Every Characteristic lives in one `simple-json` `characteristics` column on `meanders`. A numeric key holds its value only when it is not zero, and a boolean key, `isReducible` included, holds `true` only when it holds. The row keeps a column only for the facts about the row itself: `code`, `rows`, `columns`, `lattice`, `repeats`, `family`, `provenance`, and `drawingHash`.

The `letter` flag, its boot check, and the column and glyph types are removed, since nothing is stored by them any more. `NUMERIC_CHARACTERISTIC_KEYS` lists the structural counts directly beside `LETTER_CHARACTERISTIC_KEYS`.

All 31,242 committed rows were regenerated and compared against the previous database before it was replaced. Every row's map held exactly its old column, letter, and boolean values, and every row kept its id:

| Layout | Database size (MB) | Gzipped (MB) |
| --- | ---: | ---: |
| Columns, `glyphs`, and a boolean array | 10.2 | 2.55 |
| One sparse map | 24.6 | 2.56 |
| One dense map, zeros and `false` kept | 38.1 | 2.72 |

The sparse map is larger in the working tree than the columns were, since each value now carries its key's name. Git stores objects compressed, and compressed it is the same size, so repository growth per committed version is unchanged. Dense was rejected for the size ADR 0017 already rejected it for, and for giving letters a different reading rule from every other key.

## Consequences

- A new, renamed, or removed Characteristic of any kind needs no migration or entity change.
- One reading rule covers every key: a missing key means zero or `false`. TypeScript readers use `?? 0` or `=== true`. Raw SQL readers use `COALESCE(json_extract(characteristics, '$.key'), 0)` whenever they filter on zero or less-than.
- No Characteristic is a typed SQL column. Filtering on any of them goes through `json_extract` and cannot use an ordinary column index. None of them had an index before.
- `synchronize` cannot migrate an existing database from the old layout, because the old and new `characteristics` columns are both text. A database from before this change must be regenerated with `nx run meanderaw:start`, not opened in place.
