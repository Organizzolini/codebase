# 🕸️ Codependix Examples

**Seventeen small subjects built to be graphed, so every graph codependix draws
has somewhere to point.**

Codependix draws dependency graphs at four levels — the Nx Neighborhood, the
whole-workspace Workspace Graph, a NestJS container's module graph, and a
project's own TypeScript and Python file-level import graphs. Almost none of
that has ever been written down: everything a reader needs to know about
`include`/`exclude` matching a project's root as well as its name, about a
per-project override _replacing_ rather than merging with `defaults`, about the
`@Global()` heuristic that redraws a NestJS graph, or about why `--write`
auto-creates a section it once refused to, lived only in a JSDoc comment on the
type that implements it.

This package is where all of it is stated. Nothing here is meant to be good
code: every subject exists to make one rule, one refusal, or one graph visible,
and several are deliberately broken. Each example's `README.md` is **rendered by
the real graph builders** from the subject beside it, so a reader sees the shape
without running anything — and a claim that stops being true fails a check
rather than misleading somebody.

```bash
nx run codependix-examples:examples          # check the committed guides
nx run codependix-examples:examples:write    # regenerate them
nx run codependix-examples:vitest            # assert every claim below
```

Agents arriving from a codependix export should start at [AGENTS.md](AGENTS.md),
which maps "codependix said X" to the example that explains X.

## The examples

Each directory under [`examples/`](examples) is one example, carries its own
`README.md`, and is readable on its own. The subject it graphs sits in that same
directory.

Every guide is **rendered**, so each one opens with the same `## Run it` command
and closes with a `## Next` link — the reading order below is the same list the
renderer chains them with, declared once in
[`testing/render/reading-order.ts`](testing/render/reading-order.ts).

### The four levels

| Example | What it settles |
| ------- | --------------- |
| [`graph-levels`](examples/graph-levels) | One project graphed at all four levels, so a reader sees what each does and does not say about the same code |
| [`neighborhood-scope`](examples/neighborhood-scope) | A Neighborhood is one hop each way — plus implicit edges, self-edges, external packages, the root project, the subject highlight |
| [`ambient-modules`](examples/ambient-modules) | Why a `@Global()` module is drawn without edges, and the two places the rule stops firing |
| [`preview-mode`](examples/preview-mode) | A `forRootAsync` options factory graphed without ever running |
| [`container-rooting`](examples/container-rooting) | A real root module, a synthetic one, and one that refuses to load |
| [`typescript-resolution`](examples/typescript-resolution) | NodeNext specifiers, path aliases, `extends` chains — and the four statements that draw nothing |
| [`python-scanner`](examples/python-scanner) | Every case the hand-rolled scanner handles, and every case it deliberately refuses |

### Configuring and exporting

| Example | What it settles |
| ------- | --------------- |
| [`configuration-resolution`](examples/configuration-resolution) | `defaults` versus an override, the glob lists, file precedence, the upward search |
| [`export-targets`](examples/export-targets) | Why `both` is a named target rather than something inferred |
| [`markdown-modes`](examples/markdown-modes) | An anchored splice, and a standalone file |
| [`auto-created-sections`](examples/auto-created-sections) | Exactly where a missing `## 🕸️ Codependix` section lands, in every branch |
| [`check-and-write`](examples/check-and-write) | What each `--check` name gates, what drift is reported as, and the four command lines refused outright |
| [`boundary-rules`](examples/boundary-rules) | The three rule kinds, judged by the real evaluator — including the implicit edge no lint rule can see |
| [`refusals`](examples/refusals) | Every refusal, with the reproduction that produces it |
| [`path-queries`](examples/path-queries) | How `codependix path` traces shortest connecting paths across graph levels in Markdown, JSON, and Mermaid |
| [`json-exports`](examples/json-exports) | Every graph's JSON shape, and the two workspace rules switched off for these files |
| [`workspace-drift`](examples/workspace-drift) | Why this repository gates no pull request on `codependix map --check` |

## Configuring your first export

Nothing is exported until a `codependix.config.ts` says where. A workspace that
never wrote one resolves every graph to `target: "none"` and produces nothing —
it is never told to write one.

```ts
import { type CodependixConfiguration } from "@codependix/configuration";

const codependixConfiguration: CodependixConfiguration = {
  defaults: {
    nx: { markdown: { anchor: "codependix-nx" }, target: "markdown" },
  },
};

export default codependixConfiguration;
```

Three things about that shape catch people out, and
[`configuration-resolution`](examples/configuration-resolution) shows each one
resolving:

- **A per-project override replaces the default outright.** Naming
  `projects["atlas-core"].nx` does not merge into `defaults.nx` — a project that
  turns its Markdown export off by omitting `markdown` should not have the
  default's destination resurface underneath it.
- **`include` and `exclude` match a project's name _and_ its root.** `packages/*`
  and `codependix-*` are both valid ways to name overlapping sets.
- **The field is `defaults`, not `default`.** The loader unwraps a module's
  default export by name, and a field of that name would collide with the
  unwrapping.

## Adopting codependix where no anchors exist

Markdown used to be the opt-in exception, because a missing anchor block was an
error — placing one was something a person did once, by hand, rather than
codependix guessing where in a document it belonged. That could not scale to
every project in a workspace nobody had hand-placed anchors in.

`--write` now auto-creates the `## 🕸️ Codependix` section, and takes that risk
in exactly two well-defined places: the end of the file, or the end of a section
that already exists. [`auto-created-sections`](examples/auto-created-sections)
renders every branch, including a heading a person wrote by hand being reused
rather than duplicated. Only a project with no `README.md` at all still fails
outright, and a `--check` against a project that has never had codependix output
simply reports it as stale.

So adopting it is one command:

```bash
nx run codebase:codependix:write
```

## Why the guides are rendered rather than written

`nx run codependix-examples:examples` is the regression gate for every
documented behavior, and it is stricter than the tests: it compares the
committed Markdown byte for byte. That matters most for the cases in
[`typescript-resolution`](examples/typescript-resolution) and
[`python-scanner`](examples/python-scanner) that exist to _not_ be walked — a
re-export, a dynamic `import()`, a `require`, an import indented inside a
function. Each is a claim a resolver or scanner change could silently reverse,
and a guide quoting a diagram the tool no longer renders is worse than no guide.

This is the one place this package differs from its siblings, which run their
own tool over their own subjects through an Nx target. Codependix does not:
`NeighborhoodService.readProjectGraph` resolves the Nx workspace from the
**process working directory** unless a configuration names a `projectGraph`
file to read instead — `--directory` supplies only the root that export paths
are resolved against. So the graph builders are called directly, with a project
graph they are handed, and `testing/render-examples.ts` is what calls them —
beside the tests that assert what it produced, the same place
`codometer-examples` keeps the harness that drives its own tool.

A `projectGraph` file would let some of these examples run the real command
line instead. That is a separate decision and deliberately not taken here:
rendering the guides from the real graph builders is what makes a claim that
stops being true fail a check, and is recorded in `AGENTS.md` as a virtue
rather than as drift.

That is also what keeps the subjects out of everything else. They carry no
`project.json`, so none of them joins this workspace's Nx project graph, the
root README's Workspace Graph, `nx affected`, or `sherif`. The Python subjects
are never tagged `language:python`, so `ruff`, `pyright`, `ty`, and `vulture`
never run over input that exists precisely to look malformed.

## Layout

```text
examples/<example>/README.md         # The rendered guide, and any JSON export it commits
examples/<example>/<subject>         # The code being graphed — nested, and scoped out of the linters
testing/render-examples.ts           # The `examples` target: regenerates or checks every guide above
testing/render/                      # One module per example, plus the reading order and emoji
testing/examples.integration.test.ts # Asserts every claim those guides make
testing/graphs.integration.test.ts   # Asserts the graphs the guides are rendered from
```

The nesting is the rule the tooling reads: one level under `examples/` is the
rendered guide and its JSON exports, which every linter still checks, and two
levels down is the subject, which is scoped out. That is why the committed
`codependix-*graph.json` files keep inheriting the two carve-outs
[`json-exports`](examples/json-exports) describes, while a deliberately broken
`tsconfig.json` two levels down is nobody's lint failure.

This package declares no `codometer` size limit, because it builds nothing:
there is no `build` target and therefore no compiled bundle to measure.

## Test

```bash
nx run codependix-examples:vitest
```

## License

MIT — see [LICENSE](../../LICENSE).

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  codependix_boundaries["codependix-boundaries"]
  codependix_cli["codependix-cli"]
  codependix_configuration["codependix-configuration"]
  codependix_core["codependix-core"]
  codependix_examples["codependix-examples"]
  codependix_file_imports["codependix-file-imports"]
  codependix_nestjs_modules["codependix-nestjs-modules"]
  codependix_nx_projects["codependix-nx-projects"]
  codependix_output["codependix-output"]
  logging["logging"]
  codependix_examples --> codependix_boundaries
  codependix_examples -.-> codependix_cli
  codependix_examples --> codependix_configuration
  codependix_examples --> codependix_core
  codependix_examples --> codependix_file_imports
  codependix_examples --> codependix_nestjs_modules
  codependix_examples --> codependix_nx_projects
  codependix_examples --> codependix_output
  codependix_examples --> logging
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class codependix_examples subject
```

_Dashed edges are dependencies Nx inferred from configuration rather than from code._
<!-- codependix:end name="codependix-nx-projects" -->

### File Imports

<!-- codependix:start name="codependix-file-imports" -->
```mermaid
graph LR
  file_codependix_config_ts["codependix.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_testing_examples_integration_test_ts["testing/examples.integration.test.ts"]
  file_testing_graphs_integration_test_ts["testing/graphs.integration.test.ts"]
  file_testing_render_examples_ts["testing/render-examples.ts"]
  file_testing_render_anchor_placement_ts["testing/render/anchor-placement.ts"]
  file_testing_render_boundary_rules_ts["testing/render/boundary-rules.ts"]
  file_testing_render_builders_ts["testing/render/builders.ts"]
  file_testing_render_catalog_ts["testing/render/catalog.ts"]
  file_testing_render_configuration_ts["testing/render/configuration.ts"]
  file_testing_render_document_ts["testing/render/document.ts"]
  file_testing_render_export_delivery_ts["testing/render/export-delivery.ts"]
  file_testing_render_graph_levels_ts["testing/render/graph-levels.ts"]
  file_testing_render_nestjs_graphs_ts["testing/render/nestjs-graphs.ts"]
  file_testing_render_nx_graphs_ts["testing/render/nx-graphs.ts"]
  file_testing_render_path_queries_ts["testing/render/path-queries.ts"]
  file_testing_render_paths_ts["testing/render/paths.ts"]
  file_testing_render_python_imports_ts["testing/render/python-imports.ts"]
  file_testing_render_reading_order_ts["testing/render/reading-order.ts"]
  file_testing_render_run_ts["testing/render/run.ts"]
  file_testing_render_types_ts["testing/render/types.ts"]
  file_testing_render_typescript_imports_ts["testing/render/typescript-imports.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_testing_examples_integration_test_ts --> file_testing_render_anchor_placement_ts
  file_testing_examples_integration_test_ts --> file_testing_render_builders_ts
  file_testing_examples_integration_test_ts --> file_testing_render_catalog_ts
  file_testing_examples_integration_test_ts --> file_testing_render_configuration_ts
  file_testing_examples_integration_test_ts --> file_testing_render_document_ts
  file_testing_examples_integration_test_ts --> file_testing_render_export_delivery_ts
  file_testing_examples_integration_test_ts --> file_testing_render_path_queries_ts
  file_testing_examples_integration_test_ts --> file_testing_render_paths_ts
  file_testing_examples_integration_test_ts --> file_testing_render_reading_order_ts
  file_testing_examples_integration_test_ts --> file_testing_render_run_ts
  file_testing_graphs_integration_test_ts --> file_testing_render_nestjs_graphs_ts
  file_testing_graphs_integration_test_ts --> file_testing_render_nx_graphs_ts
  file_testing_graphs_integration_test_ts --> file_testing_render_paths_ts
  file_testing_graphs_integration_test_ts --> file_testing_render_python_imports_ts
  file_testing_graphs_integration_test_ts --> file_testing_render_typescript_imports_ts
  file_testing_render_examples_ts --> file_testing_render_run_ts
  file_testing_render_anchor_placement_ts --> file_testing_render_builders_ts
  file_testing_render_anchor_placement_ts --> file_testing_render_document_ts
  file_testing_render_anchor_placement_ts --> file_testing_render_export_delivery_ts
  file_testing_render_anchor_placement_ts --> file_testing_render_paths_ts
  file_testing_render_anchor_placement_ts --> file_testing_render_types_ts
  file_testing_render_boundary_rules_ts --> file_testing_render_builders_ts
  file_testing_render_boundary_rules_ts --> file_testing_render_document_ts
  file_testing_render_boundary_rules_ts --> file_testing_render_types_ts
  file_testing_render_catalog_ts --> file_testing_render_anchor_placement_ts
  file_testing_render_catalog_ts --> file_testing_render_boundary_rules_ts
  file_testing_render_catalog_ts --> file_testing_render_configuration_ts
  file_testing_render_catalog_ts --> file_testing_render_export_delivery_ts
  file_testing_render_catalog_ts --> file_testing_render_graph_levels_ts
  file_testing_render_catalog_ts --> file_testing_render_nestjs_graphs_ts
  file_testing_render_catalog_ts --> file_testing_render_nx_graphs_ts
  file_testing_render_catalog_ts --> file_testing_render_path_queries_ts
  file_testing_render_catalog_ts --> file_testing_render_python_imports_ts
  file_testing_render_catalog_ts --> file_testing_render_reading_order_ts
  file_testing_render_catalog_ts --> file_testing_render_types_ts
  file_testing_render_catalog_ts --> file_testing_render_typescript_imports_ts
  file_testing_render_configuration_ts --> file_testing_render_builders_ts
  file_testing_render_configuration_ts --> file_testing_render_document_ts
  file_testing_render_configuration_ts --> file_testing_render_paths_ts
  file_testing_render_configuration_ts --> file_testing_render_types_ts
  file_testing_render_document_ts --> file_testing_render_reading_order_ts
  file_testing_render_document_ts --> file_testing_render_types_ts
  file_testing_render_export_delivery_ts --> file_testing_render_builders_ts
  file_testing_render_export_delivery_ts --> file_testing_render_document_ts
  file_testing_render_export_delivery_ts --> file_testing_render_graph_levels_ts
  file_testing_render_export_delivery_ts --> file_testing_render_paths_ts
  file_testing_render_export_delivery_ts --> file_testing_render_types_ts
  file_testing_render_graph_levels_ts --> file_testing_render_builders_ts
  file_testing_render_graph_levels_ts --> file_testing_render_nestjs_graphs_ts
  file_testing_render_graph_levels_ts --> file_testing_render_nx_graphs_ts
  file_testing_render_graph_levels_ts --> file_testing_render_paths_ts
  file_testing_render_graph_levels_ts --> file_testing_render_python_imports_ts
  file_testing_render_graph_levels_ts --> file_testing_render_types_ts
  file_testing_render_graph_levels_ts --> file_testing_render_typescript_imports_ts
  file_testing_render_nestjs_graphs_ts --> file_testing_render_builders_ts
  file_testing_render_nestjs_graphs_ts --> file_testing_render_document_ts
  file_testing_render_nestjs_graphs_ts --> file_testing_render_paths_ts
  file_testing_render_nestjs_graphs_ts --> file_testing_render_types_ts
  file_testing_render_nx_graphs_ts --> file_testing_render_builders_ts
  file_testing_render_nx_graphs_ts --> file_testing_render_document_ts
  file_testing_render_nx_graphs_ts --> file_testing_render_types_ts
  file_testing_render_path_queries_ts --> file_testing_render_builders_ts
  file_testing_render_path_queries_ts --> file_testing_render_document_ts
  file_testing_render_path_queries_ts --> file_testing_render_nx_graphs_ts
  file_testing_render_path_queries_ts --> file_testing_render_types_ts
  file_testing_render_python_imports_ts --> file_testing_render_builders_ts
  file_testing_render_python_imports_ts --> file_testing_render_document_ts
  file_testing_render_python_imports_ts --> file_testing_render_paths_ts
  file_testing_render_python_imports_ts --> file_testing_render_types_ts
  file_testing_render_run_ts --> file_testing_render_builders_ts
  file_testing_render_run_ts --> file_testing_render_catalog_ts
  file_testing_render_run_ts --> file_testing_render_document_ts
  file_testing_render_run_ts --> file_testing_render_paths_ts
  file_testing_render_run_ts --> file_testing_render_types_ts
  file_testing_render_typescript_imports_ts --> file_testing_render_builders_ts
  file_testing_render_typescript_imports_ts --> file_testing_render_document_ts
  file_testing_render_typescript_imports_ts --> file_testing_render_paths_ts
  file_testing_render_typescript_imports_ts --> file_testing_render_types_ts
```
<!-- codependix:end name="codependix-file-imports" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs-modules" -->
_This project defines no NestJS modules to graph._
<!-- codependix:end name="codependix-nestjs-modules" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-4218-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-208.88_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-63-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-82-3178c6?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-67-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-13-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-27-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-224-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-1-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-2-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-17-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-25-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-225-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-3-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-179-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-49-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-182-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-161-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-138-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-300-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-511-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-0-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-15-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-53-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-1-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-4-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-9-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-12-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-4-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-4-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-1-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-1-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-16-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-272-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-58-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-30-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-157-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-119-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-19-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-54-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-227-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-6-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-1-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-4-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-1-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-3-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-0-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-3-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-4-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-0-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-4-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-0-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-0-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-0-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-0-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-0-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-0-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-0-64748b?style=flat-square)

### Shell

![Shell Files](https://img.shields.io/badge/Shell_Files-0-89e051?style=flat-square)
![Shell Lines](https://img.shields.io/badge/Shell_Lines-0-4eaa25?style=flat-square)
![Shell Functions](https://img.shields.io/badge/Shell_Functions-0-16a34a?style=flat-square)
![Shell Variables](https://img.shields.io/badge/Shell_Variables-0-0284c7?style=flat-square)
![Shell Exports](https://img.shields.io/badge/Shell_Exports-0-ea580c?style=flat-square)
![Shell Conditionals](https://img.shields.io/badge/Shell_Conditionals-0-7c3aed?style=flat-square)
![Shell Loops](https://img.shields.io/badge/Shell_Loops-0-8b5cf6?style=flat-square)
![Shell Pipelines](https://img.shields.io/badge/Shell_Pipelines-0-059669?style=flat-square)
![Shebangs](https://img.shields.io/badge/Shebangs-0-6b7280?style=flat-square)
![Shell Comments](https://img.shields.io/badge/Shell_Comments-0-64748b?style=flat-square)
![Shell Comment Lines](https://img.shields.io/badge/Shell_Comment_Lines-0-475569?style=flat-square)

### SQL

![SQL Files](https://img.shields.io/badge/SQL_Files-0-e38c00?style=flat-square)
![SQL Lines](https://img.shields.io/badge/SQL_Lines-0-f29111?style=flat-square)
![SQL Statements](https://img.shields.io/badge/SQL_Statements-0-7c3aed?style=flat-square)
![SQL Selects](https://img.shields.io/badge/SQL_Selects-0-16a34a?style=flat-square)
![SQL Inserts](https://img.shields.io/badge/SQL_Inserts-0-22c55e?style=flat-square)
![SQL Updates](https://img.shields.io/badge/SQL_Updates-0-0ea5e9?style=flat-square)
![SQL Deletes](https://img.shields.io/badge/SQL_Deletes-0-dc2626?style=flat-square)
![SQL Creates](https://img.shields.io/badge/SQL_Creates-0-0284c7?style=flat-square)
![SQL Joins](https://img.shields.io/badge/SQL_Joins-0-8b5cf6?style=flat-square)
![SQL CTEs](https://img.shields.io/badge/SQL_CTEs-0-059669?style=flat-square)
![SQL Comments](https://img.shields.io/badge/SQL_Comments-0-64748b?style=flat-square)

### HCL

![HCL Files](https://img.shields.io/badge/HCL_Files-0-844fba?style=flat-square)
![HCL Lines](https://img.shields.io/badge/HCL_Lines-0-a78bfa?style=flat-square)
![HCL Blocks](https://img.shields.io/badge/HCL_Blocks-0-7c3aed?style=flat-square)
![HCL Resources](https://img.shields.io/badge/HCL_Resources-0-0284c7?style=flat-square)
![HCL Variables](https://img.shields.io/badge/HCL_Variables-0-16a34a?style=flat-square)
![HCL Outputs](https://img.shields.io/badge/HCL_Outputs-0-059669?style=flat-square)
![HCL Attributes](https://img.shields.io/badge/HCL_Attributes-0-0ea5e9?style=flat-square)
![HCL Interpolations](https://img.shields.io/badge/HCL_Interpolations-0-db2777?style=flat-square)
![HCL Comments](https://img.shields.io/badge/HCL_Comments-0-64748b?style=flat-square)

### CSS

![CSS Files](https://img.shields.io/badge/CSS_Files-0-264de4?style=flat-square)
![CSS Lines](https://img.shields.io/badge/CSS_Lines-0-2965f1?style=flat-square)
![CSS Rules](https://img.shields.io/badge/CSS_Rules-0-7c3aed?style=flat-square)
![CSS Selectors](https://img.shields.io/badge/CSS_Selectors-0-8b5cf6?style=flat-square)
![CSS Declarations](https://img.shields.io/badge/CSS_Declarations-0-0284c7?style=flat-square)
![CSS At Rules](https://img.shields.io/badge/CSS_At_Rules-0-f97316?style=flat-square)
![CSS Media Queries](https://img.shields.io/badge/CSS_Media_Queries-0-ea580c?style=flat-square)
![CSS Custom Properties](https://img.shields.io/badge/CSS_Custom_Properties-0-16a34a?style=flat-square)
![CSS Comments](https://img.shields.io/badge/CSS_Comments-0-64748b?style=flat-square)

### Conventions

![Module Files](https://img.shields.io/badge/Module_Files-25-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-1-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-0-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-0-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-0-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-2-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-0-0284c7?style=flat-square)
![CSS Comment Budget](https://img.shields.io/badge/CSS_Comment_Budget-0-16a34a?style=flat-square)
![HCL Comment Budget](https://img.shields.io/badge/HCL_Comment_Budget-0-ea580c?style=flat-square)
![Python Comment Budget](https://img.shields.io/badge/Python_Comment_Budget-0-db2777?style=flat-square)
![SQL Comment Budget](https://img.shields.io/badge/SQL_Comment_Budget-0-0ea5e9?style=flat-square)
![TOML Comment Budget](https://img.shields.io/badge/TOML_Comment_Budget-0-059669?style=flat-square)
![TypeScript Comment Budget](https://img.shields.io/badge/TypeScript_Comment_Budget-0-ca8a04?style=flat-square)
![YAML Comment Budget](https://img.shields.io/badge/YAML_Comment_Budget-0-7c3aed?style=flat-square)
![Shell Comment Budget](https://img.shields.io/badge/Shell_Comment_Budget-0-0284c7?style=flat-square)

### Jupyter

![Notebooks](https://img.shields.io/badge/Notebooks-0-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-0-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-0-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-0-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-0-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-0-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-0-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-0-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-0-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-0-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-0-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-0-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-0-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-0-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-0-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-0-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-0-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-17-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-1392-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-17-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-116-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-0-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-160-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-4-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-16-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-7-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-54-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-56-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-82-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-391-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- codometer:end -->
