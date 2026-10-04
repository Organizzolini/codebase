# Root every meander in a committed sqlite table

Superseded in part by [ADR 0020](0020-store-meanders-in-postgres.md), which moves the rows from the committed `output/meanders.sqlite` into Postgres, and by [ADR 0021](0021-retire-the-meander-pages.md), which retires the HTML pages built from them. The pipeline and the two halves of the corpus below still stand.

The nine per-family procedural motif services, and the `output/<family>/*.svg`
tree they wrote, are retired. Every meander now decodes from a Code through
one generic pipeline — decode, render, compute Characteristics, classify —
and persists as a row in the committed `output/meanders.sqlite`, addressed by
`(code, rows, columns)` rather than by a file path. `output/index.html` is the
one file write that survives: rebuilt from the database's own rows at the end
of every sweep, in place of the tree of files it used to summarize.

The committed database holds **31,244** rows: **30,279 enumerated** —
`MeanderEnumerationService` walking the lattice's whole budgeted unit space
(a sixteen-edge budget admits fourteen shapes, swept and rendered in about
eight seconds) — plus **965 hardcoded**, the historical corpus's named-type
drawings that lie beyond that budget, extracted and deduplicated from 1,118
raw combinations down to 1,072 distinct ones, then narrowed again to 965 once
the shapes the generalized enumeration already produces were filtered out.

## Considered options

- **Retire the nine per-family procedural generators and the file tree they
  wrote, rather than run them beside the new database indefinitely.** Chosen.
  The migration's first four tickets built the new pipeline alongside the old
  one; a later ticket, scoped from the start to retire the old pipeline,
  removed it outright. `DrawCommand`'s own doc comment states the result
  plainly: "the per-family SVG tree is gone for good... a meander is a
  database row, and a row has no path-length limit for a Code to outgrow."
  Leaving both running was never the intended end state — only an
  intermediate one while the two halves of the migration each had their own
  ticket.
- **Index a meander's identity by `code` together with `rows` and `columns`,
  not `code` alone.** Chosen, and discovered as a real bug rather than
  planned up front: `LatticeIdentificationService.identify` names a tile by
  its points and deliberately not by its shape, so the four-character Code
  `0000` addresses both two inked dots across a three-row band and four down
  one column of a five-row band — different drawings, one Code. The original
  schema indexed `code` alone and worked only because no single ticket had
  yet swept more than one shape at a time; it failed the moment the
  generalized enumeration walked the whole budgeted range. The fix reuses
  exactly the triple [ADR 0007](0007-address-every-meander-by-its-lattice.md)
  already calls a lattice address.
- **Sweep the enumerated half before the hardcoded half, so a hardcoded entry
  claiming an address the enumeration already produced fails the unique
  index loudly rather than silently overwriting it.** Chosen. This ordering
  also surfaced a real collision during implementation: 107 of the
  1,072 deduplicated hardcoded entries turned out to be Codes the
  generalized enumeration already produces on its own — the same `mosaic`
  and `negative` shapes that were already exhaustively enumerated before
  this migration began. Filtering the hardcoded set down to what actually
  lies outside the enumeration's coverage (1,072 → 965) was the fix; sweeping
  enumerated-first is what turns any future recurrence of that overlap into
  a loud, immediate failure instead of a silent duplicate.
- **Trust a hardcoded row's `family` and `subFamily` from the historical
  corpus rather than re-deriving them through the new Characteristic-based
  classifier.** Chosen. `HardcodedMeandersService`'s own doc comment gives
  the reason: "reclassifying years of curated corpus is explicitly out of
  scope for this migration." Rejected: classify every row uniformly,
  enumerated and hardcoded alike — would mean auditing 965 historical
  family/sub-family assignments against definitions built after they were
  curated, which the spec this migration implements ruled out of scope.
- **Verify reproducibility with a `--check` mode that regenerates the whole
  sweep into a throwaway database and diffs every row against the committed
  one, rather than continuing the file tree's structural-invariant
  assertions.** Chosen, and the one option a mid-migration finding overturned
  rather than a plan arrived at up front. The previous architecture's
  `address-table` gate asserted corpus-wide structural facts over the file
  tree — 9,877 drawings, 149 cross-family shared classes, 283 within-family
  class groups, 67 declared address collisions (see
  [ADR 0007](0007-address-every-meander-by-its-lattice.md)) — none of which
  has a database-native equivalent here. Partway through this migration its
  own nx target became an unreproducible commit-time blocker: it passed
  every other invocation (a direct `nx run`, a full `lint-staged` run) but
  failed twelve out of twelve literal `git commit`s, and material diagnosis —
  Node version and PATH, argv length, git index-lock contention, a
  husky-wrapper trace — found no definitive root cause. It was retired
  outright rather than fixed, on the judgment that the corpus it asserted
  over no longer existed in the shape it was written to check. `--check`
  mode replaces it with a narrower guarantee: that the committed database
  agrees with what the current pipeline would produce from scratch, not that
  the corpus holds the cross-family invariants ADR 0007 measured.

## Consequences

- **The structural invariants ADR 0007 measured over the file tree — shared
  classes across families, within-family class groups, declared address
  collisions — are gated by nothing now.** `--check` mode proves
  reproducibility, not those cross-family facts. This is left as open work
  rather than resolved: restating any of them as a query over the committed
  database, if still wanted, is a follow-up this migration did not scope.
- **A meander's identity is the `(code, rows, columns)` triple, not `code`
  alone**, so any future consumer that keys off Code by itself — a filename,
  a lookup, a cache — will collide across shapes exactly the way the
  generalized enumeration first did.
- **965 of the corpus's 31,244 rows carry family/subFamily metadata trusted
  from the pre-migration corpus rather than verified against the new
  classifier.** A hardcoded entry whose historical label disagrees with what
  `MeanderClassificationService` would derive from its own Characteristics is
  caught by nothing.
- **The committed database is one binary file** rather than a tree of SVGs
  that can each be diffed on its own, so a pull request that changes it shows
  a binary diff rather than a reviewable one. `--check` mode's regenerate-
  and-diff is the tool for verifying a change to it; the diff itself is not.
- **All three ways of producing a row — a `--code` single drawing, a swept
  enumeration, and a hardcoded ingestion — commit through the same generic
  decode/render/Characteristics pipeline**, so a bug in
  `MeanderDecodingService`, `MeanderRenderingService`, or
  `MeanderCharacteristicsService` now reaches every family at once, rather
  than staying isolated to whichever per-family generator used to own it —
  the flip side of retiring nine independent implementations for one shared
  one.
