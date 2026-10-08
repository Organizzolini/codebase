# 🎣 Callback argument

**`entries.map(entry => …)` → the arrow, as its own frame**

## Run it

```bash
nx run callidescope-examples:examples
```

No finding. What it proves is that the arrow is a frame and `map` is a leaf, asserted in [the test suite](../../testing/examples.integration.test.ts).

Two decisions show up in one line of code:

- **`map` is external, so it is a leaf.** Whether `Array.prototype.map` is
  deeply implemented says nothing about whether _your_ layering is too deep, and
  counting it would move every number in the report on an unrelated upgrade.
- **The arrow is your code, so it is a frame.** The call it makes is followed
  from there, which is why the callback's own depth lands on the callback rather
  than on whichever function happened to contain its text.

```text
🚀 CallbackArgumentService.shoutAll(entries: readonly string[]): string[]
  └─> CallbackArgumentService.map(…)(entry: string): string
    └─> CallbackArgumentService.shout(entry: string): string
```

## Next

[dependency closure](../dependency-closure/README.md).
