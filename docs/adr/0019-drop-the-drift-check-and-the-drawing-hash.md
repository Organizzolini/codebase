# 0019: Drop the Drift Check and the Drawing Hash

## Context

[ADR 0015](0015-store-families-as-an-open-multi-label-set.md) replaced each row's stored `svg` with a SHA-256 `drawingHash`, so the drift check could still notice a renderer change. The drift check was `draw`'s default mode, and `guard-code` ran it on every commit. It regenerated the whole sweep into a throwaway database and failed on any new, missing, or changed row against the committed `output/meanders.sqlite`.

Each meander row also carried a `provenance` enum, `"enumerated"` or `"hardcoded"`, recording which half of the sweep wrote it.

## Decision

The drift check is removed, for now, along with the `drawingHash` column that existed only to feed it. Nothing validates the renderer against the committed database. The one property the schema enforces is that a Code is unique.

With nothing left to check, `draw`'s `--check` and `--write` flags are removed too: a bare `draw` sweeps into the committed database, and `--code` writes one row. `guard-code` no longer runs `start`, and nothing else depends on it, so no aggregate target rewrites the database as a side effect.

`provenance` becomes a boolean `isHardcoded` column, since no third value is planned.

## Consequences

- The sweep no longer renders anything while it writes rows. The renderer runs only when `DrawIndexService` builds the index pages.
- A change to the renderer, the enumerator, or a Characteristic is no longer caught at commit time. A stale committed database stays stale until someone runs `nx run meanderaw:start`.
- Restoring a drift check means rebuilding the comparison. A renderer guard would also need a drawing hash or an equivalent column again.
