# 💉 Injected dependency

**`this.inventoryService.reserve(…)` → `InventoryService.reserve`**

## Run it

```bash
nx run callidescope-examples:examples
```

No finding either. What it proves is the edge from a property to the declaration its type names, asserted in [the test suite](../../testing/examples.integration.test.ts).

The case the whole tool exists for. `orders.ts` never names
`InventoryService.reserve` — it names a property. The constructor parameter
property carries the service's type, so the checker follows it to the
declaration.

This is the edge a file-at-a-time reader cannot see, and in a
dependency-injected codebase it is where most of the control flow lives.

```text
🚀 OrdersService.place(available: number): number
  └─> InventoryService.reserve(available: number): number
```

`injected-dependency.module.ts` makes the dependency real rather than cosmetic.
Resolution needs none of it: the provider list is never read, only the
constructor parameter's type.

## Next

[structural interface](../structural-interface/README.md).
