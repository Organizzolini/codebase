# 🧱 Base class

**`super.run()` → `BaseTaskService.run`**

## Run it

```bash
nx run callidescope-examples:examples
```

No finding. What it proves is that the base declaration is the frame, not the override that called up into it — asserted in [the test suite](../../testing/examples.integration.test.ts).

An override calling up into what it overrode. The frame recorded is the base
declaration the checker resolves to, not the override making the call — so a
stack shows where the work actually happens.

```text
🚀 BaseClassService.run(): string
  └─> BaseTaskService.run(): string
```

## Next

[constructed class](../constructed-class/README.md).
