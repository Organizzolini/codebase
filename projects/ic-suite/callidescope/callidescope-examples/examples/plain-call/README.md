# 📞 Plain call

**`normalize(label)` → `normalizeLabel`**

## Run it

```bash
nx run callidescope-examples:examples
```

This fixture produces no finding. What it proves is the resolution above — the declaration behind an import alias — asserted in [the test suite](../../testing/examples.integration.test.ts).

The simplest row of the resolution table, and the one that still needs
explaining: the call site names `normalize`, but the frame callidescope records
is `normalizeLabel`. The checker resolves the symbol at the callee and unwraps
the import alias, so a report always names the declaration rather than whichever
local name a file gave it.

```text
🚀 PlainCallService.render(label: string): string
  └─> normalizeLabel(label: string): string
```

## Next

[injected dependency](../injected-dependency/README.md).
