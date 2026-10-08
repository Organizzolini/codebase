# 🏗️ Constructed class

**`new ParserService(source)` → `ParserService.constructor`**

## Run it

```bash
nx run callidescope-examples:examples
```

No finding. What it proves is that a constructor with a body is a frame and one without is not, asserted in [the test suite](../../testing/examples.integration.test.ts).

Construction is a call, and a constructor with a body is a frame like any other.
A constructor with no body is not — there is nothing to descend into, so
recording it would add a frame that no stack trace would ever show.

```text
🚀 ConstructedClassService.count(source: string): number
  └─> ParserService.constructor(source: string)
```

## Next

[callback argument](../callback-argument/README.md).
