# 🗺️ The four graph levels, side by side

One example project, `atlas-service`, graphed at all four levels codependix builds — so a reader sees what each level does and does not say about the same code.

## Run it

```bash
nx run codependix-examples:examples
```

Everything below is rendered from the subject in this directory by the real
graph builders, so a claim that stops being true fails a check rather than
misleading anybody. The command above fails if what is committed here has
drifted; `:write` regenerates it.

## Nx Neighborhood

Which workspace projects `atlas-service` sits between. It says nothing about what is inside the project.

```mermaid
graph LR
  atlas_application["atlas-application"]
  atlas_core["atlas-core"]
  atlas_service["atlas-service"]
  atlas_application --> atlas_service
  atlas_service --> atlas_core
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class atlas_service subject
```

## Nx Workspace Graph

The same edges, drawn once for the whole repository rather than once per project, with no project highlighted.

```mermaid
graph LR
  atlas_application["atlas-application"]
  atlas_core["atlas-core"]
  atlas_service["atlas-service"]
  atlas_application --> atlas_service
  atlas_service --> atlas_core
```

## NestJS module graph

How the project's own NestJS container is wired. Only modules are nodes — `CatalogService` is a provider and never appears.

```mermaid
flowchart LR
  AtlasServiceModule
  CatalogModule
  InventoryModule
  AtlasServiceModule --> CatalogModule
  AtlasServiceModule --> InventoryModule
```

## TypeScript file imports

Which of the project's own TypeScript files import which. `settings.ts` is invisible to the module graph above and central here.

```mermaid
graph LR
  file_src_atlas_service_module_ts["src/atlas-service.module.ts"]
  file_src_catalog_module_ts["src/catalog.module.ts"]
  file_src_catalog_service_ts["src/catalog.service.ts"]
  file_src_inventory_module_ts["src/inventory.module.ts"]
  file_src_settings_ts["src/settings.ts"]
  file_src_atlas_service_module_ts --> file_src_catalog_module_ts
  file_src_atlas_service_module_ts --> file_src_inventory_module_ts
  file_src_catalog_module_ts --> file_src_catalog_service_ts
  file_src_catalog_service_ts --> file_src_settings_ts
```

## Python file imports

The same question asked of the project's Python package, answered by a statement scanner rather than by a compiler.

```mermaid
graph LR
  file___init___py["__init__.py"]
  file_catalog_py["catalog.py"]
  file_settings_py["settings.py"]
  file_catalog_py --> file_settings_py
```

## Next

[neighborhood-scope](../neighborhood-scope/README.md).
