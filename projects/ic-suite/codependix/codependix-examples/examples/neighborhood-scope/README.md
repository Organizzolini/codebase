# 🏘️ One hop, and every rule the renderer applies

A Neighborhood is one hop in each direction, and that is the point. Beside it, the Workspace Graph of the same workspace, and one example per rule the renderer applies.

## Run it

```bash
nx run codependix-examples:examples
```

Everything below is rendered from the subject in this directory by the real
graph builders, so a claim that stops being true fails a check rather than
misleading anybody. The command above fails if what is committed here has
drifted; `:write` regenerates it.

## The middle project's Neighborhood

`atlas-service` holds only its immediate dependency and its immediate dependent. The highlighted node is the `classDef subject` style that marks which project the diagram is centered on.

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

## The Workspace Graph of the same workspace

The whole chain, exported once for the repository rather than once per project, and with no project highlighted.

```mermaid
graph LR
  atlas_application["atlas-application"]
  atlas_core["atlas-core"]
  atlas_service["atlas-service"]
  atlas_application --> atlas_service
  atlas_service --> atlas_core
```

## A dependency Nx inferred from configuration

Drawn with a dashed arrow, and `NEIGHBORHOOD_IMPLICIT_LEGEND` is appended under the diagram to say so.

```mermaid
graph LR
  atlas_application["atlas-application"]
  atlas_service["atlas-service"]
  atlas_application -.-> atlas_service
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class atlas_application subject
```

_Dashed edges are dependencies Nx inferred from configuration rather than from code._

## A pair declared both statically and implicitly

The static edge wins, because it is the stronger statement — the arrow is solid and no legend appears.

```mermaid
graph LR
  atlas_application["atlas-application"]
  atlas_service["atlas-service"]
  atlas_application --> atlas_service
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class atlas_application subject
```

## A project depending on itself

The self-edge is dropped. Only the edge to `atlas-core` survives.

```mermaid
graph LR
  atlas_core["atlas-core"]
  atlas_service["atlas-service"]
  atlas_service --> atlas_core
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class atlas_service subject
```

## A dependency on an external package

`npm:zod` is not a known workspace project, so the edge is dropped rather than drawn as an external node.

```mermaid
graph LR
  atlas_core["atlas-core"]
  atlas_service["atlas-service"]
  atlas_service --> atlas_core
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class atlas_service subject
```

## A project with no neighbors at all

`NEIGHBORHOOD_UNCONNECTED` is rendered in place of a diagram.

_This project has no immediate Nx dependencies or dependents._

## The workspace root project

`atlas-workspace` is rooted at `.` and is absent from the projects list entirely: it contains every project rather than depending on them, so its Neighborhood would say nothing.

```text
atlas-application
atlas-core
atlas-service
```

## Next

[ambient-modules](../ambient-modules/README.md).
