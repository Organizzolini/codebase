# 🧬 Structural interface

**`provider.ingest(document)` → `FilesystemProviderService.ingest`**

## Run it

```bash
nx run callidescope-examples:examples
```

No finding. What it proves is the edge to a class that never writes `implements`, asserted in [the test suite](../../testing/examples.integration.test.ts).

Two things make this hard for anything that indexes by name:

- `FilesystemProviderService` never writes `implements StructuralProvider`.
- `ingest` is a readonly **property holding an arrow**, not a method signature.

That is the shape this repository actually writes, and a nominal-only index
finds none of it. Callidescope expands the interface member to every class whose
instance type satisfies the declaring type — so structural matching is not an
optional refinement, it is the only thing that works here.

```text
🚀 StructuralInterfaceService.ingestDocument(…): number
  └─> FilesystemProviderService.ingest(document: string): number
```

Expansion is capped: see [`implementation-fan-out`](../implementation-fan-out).

## Next

[base class](../base-class/README.md).
