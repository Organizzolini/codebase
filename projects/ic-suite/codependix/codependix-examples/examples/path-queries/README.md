# 🛤️ Finding paths between nodes

How `codependix path <from> <to>` finds connecting paths between nodes across graph levels and formats the result as Markdown, JSON, or Mermaid.

## Run it

```bash
nx run codependix-examples:examples
```

Everything below is rendered from the subject in this directory by the real
graph builders, so a claim that stops being true fails a check rather than
misleading anybody. The command above fails if what is committed here has
drifted; `:write` regenerates it.

## Nx projects: connecting path found

How codependix path traces the shortest route between two Nx projects in the dependency graph.

### Nx Neighborhood

`atlas-application` → `atlas-service` → `atlas-core`

## Nx projects: no connecting path

When no path connects the two nodes, codependix exits cleanly with code 0 and reports plainly that no path connects them.

### Nx Neighborhood

_No path connects "atlas-core" to "atlas-application"._

## Structured JSON format

With `--format json`, the shortest path is rendered as machine-readable JSON for tooling and CI checks.

```json
{
  "nxProjects": {
    "from": "atlas-application",
    "path": [
      "atlas-application",
      "atlas-service",
      "atlas-core"
    ],
    "to": "atlas-core"
  }
}
```

## Mermaid diagram format

With `--format mermaid`, the path is rendered as a directed flowchart diagram for documentation.

```mermaid
graph LR
  atlas_application["atlas-application"]
  atlas_service["atlas-service"]
  atlas_core["atlas-core"]
  atlas_application --> atlas_service
  atlas_service --> atlas_core
```

## Next

[json-exports](../json-exports/README.md).
