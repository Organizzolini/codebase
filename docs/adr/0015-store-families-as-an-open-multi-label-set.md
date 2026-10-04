# 0015: Store Families as an Open Multi-Label Set

The boolean `characteristics` array is superseded by [ADR 0018](0018-store-every-characteristic-in-one-sparse-json-map.md), and the `drawingHash` drift guard by [ADR 0019](0019-drop-the-drift-check-and-the-drawing-hash.md).

## Context

The historical `meanderaw` corpus filed each meander under exactly one architectural family (e.g., `whirl`, `box`, `snake`), which the database encoded as a single `family` column with an enum constraint.

This single-family constraint was fundamentally flawed. Overlapping definitions caused thousands of enumerated meanders to genuinely qualify as both `boxes` and `chain`, but the schema forced the classification logic to hide this behind an arbitrary tie-break order. Furthermore, maintaining hardcoded rules that tightly bound a 6×5 grid to specific characteristics proved fragile and carried errors forward into new enumerated boundaries.

At the same time, we needed to guard against drifts in the SVG drawing logic without treating the raw SVG string as a queryable characteristic.

## Decision

We dropped the charter columns and the single-family enum constraint entirely.

Instead, we now store both `families` and named boolean `characteristics` as open string arrays on each `Meander` entity. A meander earns a set of families rather than exactly one, meaning the schema stops encoding assumptions that no longer hold and explicitly embraces multi-label classification.

To eliminate the fragility of hardcoded constraints, we removed all existing family rules entirely. A meander's families now come purely from the extracted corpus and any new definitions we establish.

Finally, we replaced the stored `svg` column with a SHA-256 `drawingHash`. The drawing is treated as a cache of a pure function over the Code. The hash acts as a guard that fails exactly when a drawing changes, preserving our drift-check capabilities while removing raw XML strings from the schema.

## Consequences

- The `subFamily` and negative-space junction columns were dropped because the system now handles all such subsets via the open `families` and `characteristics` arrays.
- `pitch` was retained as the reduced unit's width, ensuring dimensional measurements remain decoupled from family assignments.
- Our database schema is cleaner and far less rigid; adding or refactoring architectural rules no longer requires database migrations.
- Enumerated tiles can now correctly display overlapping family memberships, giving us a more honest view of how these architectural patterns behave across the search space.
