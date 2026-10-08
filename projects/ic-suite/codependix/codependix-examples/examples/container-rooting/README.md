# 🌱 Rooting a container, including one that bootstraps nothing

How a container is rooted when a project bootstraps one, when it bootstraps nothing, and when it refuses to load at all.

## Run it

```bash
nx run codependix-examples:examples
```

Everything below is rendered from the subject in this directory by the real
graph builders, so a claim that stops being true fails a check rather than
misleading anybody. The command above fails if what is committed here has
drifted; `:write` regenerates it.

## A project that bootstraps a root module

`src/main.module.ts` exists, so its `MainModule` export is the root and the container is explored outward from it. `OrphanModule` is defined in the same directory and never imported, so it is absent.

```mermaid
flowchart LR
  CatalogModule
  InventoryModule
  MainModule
  CatalogModule --> InventoryModule
  MainModule --> CatalogModule
```

## A package that bootstraps nothing

No `src/main.module.ts`, so every `*.module.ts` under `src/` is loaded and rooted under a synthetic module. That synthetic root, and the global `ConfigModule` it supplies so a module reading configuration in a `useFactory` can be scanned at all, are both kept out of the graph.

```mermaid
flowchart LR
  CatalogModule
  InventoryModule
  SettingsModule
  CatalogModule --> SettingsModule
  InventoryModule --> SettingsModule
```

## One project failing stops no other

`failing-container` throws the moment its module file is imported. It is collected as a failure and the other two projects still complete — the guarantee `codependix map --write` makes: either it fully succeeds, or it names exactly which projects failed.

```text
explored rooted-application — 3 module(s)
explored library-package — 3 module(s)
failed   failing-container: Error: This project's container cannot be loaded.
```

## Next

[typescript-resolution](../typescript-resolution/README.md).
