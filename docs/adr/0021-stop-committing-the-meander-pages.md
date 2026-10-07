# 0021: Stop Committing the Meander Pages

Supersedes the committed-pages decision in [ADR 0020](0020-store-meanders-in-postgres.md). The pipeline, the two halves of the corpus, Postgres storage, and the pages themselves stand.

Superseded in part by [ADR 0022](0022-filter-meanders-by-characteristics-alone.md), which replaces the page per family with a page per pattern characteristic.

## Context

[ADR 0020](0020-store-meanders-in-postgres.md) moved the rows into Postgres and kept `output/index.html` and one HTML page per family as the only artifact a draw run commits.

That held while the enumeration's edge budget was sixteen: fourteen shapes and 30,279 enumerated meanders. Raising the budget to twenty-two admits twenty-three shapes and 2,331,597 enumerated meanders, and at that size:

- The pages together are about 2.5 GB of HTML, which no repository should carry.
- A single family page outgrows a JavaScript string. The draw run failed with `RangeError: Invalid string length` while building one page as a single string, after reading every row into memory at once.

## Decision

The pages are still written on every draw run, but under a gitignored `output/`. Nothing a draw run writes is committed.

`DrawIndexService.build` produces each page as an async iterable of HTML pieces rather than one string, and `DrawCommand` hands each one to `writeFile`, which writes it a piece at a time. Every count on a page comes first, from one grouped query, so each heading is written before any row is read. A family's rows then arrive in page order, a batch of 5,000 at a time, through an index over `(family, rows, columns, code)`. No page, however many rows its family holds, is ever one string or one read.

What the committed pages let a reviewer see — a renderer, enumerator, or Characteristic change moving the corpus — is still guarded where it is cheap: the draw run suites pin a twelve-edge budget and assert the enumerated counts, the lattice and Code counts, and the family histogram exactly.

Raising the budget no longer moves the historical corpus boundary. It stays at the sixteen edges the corpus was extracted against, so every hardcoded meander survives the raise: the corpus is ingested first, and the draw run skips any Code a hardcoded row already holds. Only enumerated meanders are folded by symmetry.

## Consequences

- A clone of the repository carries no record of what a draw run produced. Running `nx run meanderaw-cli:start` reproduces the rows and the pages, in about thirteen and a half minutes at the default budget of twenty-four edges on an 18-core machine, about two minutes of it writing the 7.7 GB of pages.
- A change that moves rows only past the suites' pinned budget is caught by no gate. Re-running the draw run and comparing is a manual step.
- The largest pages run to gigabytes (`cross.html` is 4.8 GB at the default budget of twenty-four edges). They are complete records rather than something a browser opens comfortably, and paginating them is the natural next step if they are browsed often.
