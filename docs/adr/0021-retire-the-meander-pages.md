# 0021: Retire the Meander Pages

Supersedes the pages half of [ADR 0012](0012-root-every-meander-in-a-committed-sqlite-table.md) and the committed-pages decision in [ADR 0020](0020-store-meanders-in-postgres.md). The pipeline, the two halves of the corpus, and Postgres storage stand.

## Context

[ADR 0020](0020-store-meanders-in-postgres.md) moved the rows into Postgres and kept `output/index.html` and one HTML page per family as the only artifact a sweep commits.

That held while the enumeration's edge budget was sixteen: fourteen shapes and 30,279 enumerated meanders. Raising the budget to twenty-two admits twenty-three shapes and 2,331,597 enumerated meanders. At that size a single family page outgrows a JavaScript string — the sweep failed with `RangeError: Invalid string length` building it — and would be far past what a browser opens comfortably, and the pages together would be gigabytes of committed HTML.

## Decision

The HTML pages are retired rather than paginated. `DrawIndexService` is removed, the sweep writes nothing to `output/`, and `output/` is gitignored. The Postgres database is the sweep's only output.

What the committed pages let a reviewer see — a renderer, enumerator, or Characteristic change moving the corpus — is still guarded where it is cheap: the sweep suites pin a twelve-edge budget and assert the enumerated counts, the lattice and Code counts, and the family histogram exactly.

Raising the budget no longer moves the historical corpus boundary. It stays at the sixteen edges the corpus was extracted against, so every hardcoded meander survives the raise: the corpus is ingested first, and the sweep skips any Code a hardcoded row already holds. Only enumerated meanders are folded by symmetry.

## Consequences

- A clone of the repository carries no record of what a sweep produced; the database is reproduced by running `nx run meanderaw:start`, which at the default budget takes about three minutes on an 18-core machine.
- A change that moves rows only past the suites' pinned budget is caught by no gate. Re-running the sweep and comparing is a manual step.
- Pages can come back as a paginated, on-demand build from the database if a record to browse is wanted again.
