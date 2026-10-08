# 🔄 Mutual recursion

**A cycle of three, collapsed before depth is measured.**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read `cyclicComponentCount` in the `projects/ic-suite/callidescope/callidescope-examples` entry of [`output/report.json`](../../output/report.json)'s `projects`. It is 1 — the cycle of three, counted once.

`descend → branch → leaf → descend`. The three are condensed into one component,
so they contribute three frames once, and every frame is marked `(cycle)`:

```text
🚀 MutualRecursionService.traverse(remaining: number): number
  └─> MutualRecursionService.branch(…): number (cycle)
    └─> MutualRecursionService.leaf(…): number (cycle)
      └─> MutualRecursionService.descend(…): number (cycle)
```

The rejected alternative is detecting a repeat visit part-way through the walk.
It makes the answer depend on which path arrived first, so the same method
reports a different depth from a different entry point, and between runs. A
linter whose numbers move on their own cannot gate a pull request — a red build
nobody caused is a red build everyone learns to ignore.

## Why `traverse` exists

Every member of a cycle has a caller _inside_ the cycle, so none of the three is
ever promoted as an orphan root. A cluster nothing outside it calls is therefore
reachable from no root at all: it contributes to `cyclicComponentCount` in the
run summary and appears in **no** stack.

`traverse` sits above the cycle and gives it a root. Real recursive code is
always called from somewhere, and this is that somewhere.

## Next

[entry points](../entry-points/README.md).
