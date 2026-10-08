# 📦 The JSON exports

The JSON shape of every graph type, committed beside this guide so a reader sees it without running anything — and why two workspace-wide rules are switched off for exactly these files.

## Run it

```bash
nx run codependix-examples:examples
```

Everything below is rendered from the subject in this directory by the real
graph builders, so a claim that stops being true fails a check rather than
misleading anybody. The command above fails if what is committed here has
drifted; `:write` regenerates it.

## Every graph type's JSON shape, committed

Each one is rendered by `DeliveryService.renderJson`, so it is byte-identical to what a real `codependix map --write` would produce — two-space indentation and a trailing newline.

| Graph | Committed as |
| ----- | ------------ |
| Nx Neighborhood | [`codependix-neighborhood-graph.json`](codependix-neighborhood-graph.json) |
| Nx Workspace Graph | [`codependix-workspace-graph.json`](codependix-workspace-graph.json) |
| NestJS module graph | [`codependix-module-graph.json`](codependix-module-graph.json) |
| TypeScript file imports | [`codependix-imports-graph.json`](codependix-imports-graph.json) |
| Python file imports | [`codependix-python-imports-graph.json`](codependix-python-imports-graph.json) |

## Why two workspace rules are switched off for these files

The five files beside this guide are named to match that glob, so both carve-outs cover them too rather than being described from a distance — which is how the second one was found in the first place.

Two workspace-level rules are switched off for `**/codependix-*graph.json`, for the same reason. `configuration/eslint.config.ts` turns `jsonc/sort-array-values` **off**: these arrays come out of the Nx project graph, a NestJS container, or a `ts.Program`, in whichever order each source discovers its projects, modules, or files — not alphabetical order. And `configuration/.oxfmtignore` and `.prettierignore` exclude the files outright: codependix renders them with `JSON.stringify(…, 2)`, which puts one array element per line, while oxfmt collapses a short array onto one. Either rule left on would rewrite what codependix had just written, and the very next `--check` would fail against the tool itself. It is the same reformatting-versus-drift conflict `.oxfmtignore` already resolves for `.conformetry/**`.

## Next

[workspace-drift](../workspace-drift/README.md).
