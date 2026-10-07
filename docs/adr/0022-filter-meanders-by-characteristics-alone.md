# 0022: Filter Meanders by Characteristics Alone

Supersedes [ADR 0015](0015-store-families-as-an-open-multi-label-set.md) and the family-per-page layout of [ADR 0021](0021-stop-committing-the-meander-pages.md). Postgres storage, the two halves of the corpus, and writing the pages under a gitignored `output/` stand.

## Context

A meander carried one `family`: a classifier's verdict for an enumerated row, and the directory the retired file tree had filed it under for a hardcoded one. Each family was decided by a predicate, most of them matching templates against the Code's digits, gated by a minimum row count and tried in a fixed precedence order.

Measuring the corpus showed the families were not one kind of thing:

- The twisting families — waterfalls, swirl, whirl, clasps, boxes, chain, snake — are told apart almost entirely by how far the ink winds one way before turning back (`maxMonotonicTurnLength`) set against the band's depth. Once restated that way, each holds for every hardcoded meander filed under it.
- The rest — parallel, arcade, comb, cross, and the rest — are told apart by junctions, loose ends, and loops instead, and some filed labels disagree with what the drawing measures as. Several filed "cross" meanders hold no crossing at all.
- The precedence order and the row gates hid overlaps rather than resolving them, and the filed labels could not be checked without the very predicates they were meant to check.

## Decision

There are no families. A meander is found by filtering on its Characteristics.

- Each former family predicate is a **pattern characteristic**: a compound boolean under `compound/pattern/` built only from other Characteristics, stored in the row's sparse `characteristics` map like any other. `PATTERN_CHARACTERISTIC_KEYS` lists them. A meander can hold several or none.
- The `family` column, its index, the classifier, and its precedence order are deleted. `stipple`, which only collected dotted leftovers, is deleted with them.
- The historical corpus keeps each entry's Code and shape and nothing else. `filedUnder` is gone, and a hardcoded row is measured exactly as an enumerated one is.
- The draw run writes one page per pattern characteristic, `output/patterns/<key>.html`, listing every meander it holds for, one grid per shape. `DatabaseService.patternRows` reads a pattern's rows a batch at a time through the index over `(rows, columns, code)`.

## Consequences

- A new pattern is an evaluator and a key, with no schema change and no ordering to fit it into.
- A meander can appear on several pattern pages, and most enumerated meanders appear on none. That is the design: there is no `unclassified` bucket to page through.
- The filed labels can no longer be consulted. Where a pattern and the old filing disagree, the drawing is the arbiter, as [ADR 0013](0013-hold-the-historical-corpus-as-a-test-set.md) already held.
- A rare pattern's page query walks the whole `(rows, columns, code)` index once to find its few rows. That is seconds per page at the default budget. A GIN index over `characteristics` is the next step if it becomes slow.
