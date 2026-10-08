# Name the ic-suite layers

The four ic-suite toolchains — callidescope, codependix, codometer, and
conformetry — do the same five jobs each, in five layers, and had named those
layers differently every time: the contracts leaf was `configuration` in three
of them and `core` in the fourth, rendering lived in a dedicated package in two
and inside the command-line host in the other two, and only `agents` and
`examples` were named consistently across all four. Reading the workspace
dependency graph and every package's module inventory turned that impression
into a documented set of findings; giving all four toolchains one shared
layer vocabulary is the fix, and this ADR is where it is recorded so a future
session does not have to argue the decision from scratch.

Every ic-suite package will depend only downward through five layers, plus an
optional `nx` plugin layer above `cli` where one exists (callidescope and
conformetry only). This pull request lands the vocabulary first, by design:
the `layer:*` tags land in the four toolchain pull requests that follow it,
and the generic boundary rules that gate them land in the pull request after
that. Until those merge, this is the target shape, not yet the shape on
disk:

```text
core <- configuration <- analysis <- output <- cli
                                                ^- nx (where it exists)
```

| Layer | Tag | Holds | Never holds |
| --- | --- | --- | --- |
| **core** | `layer:core` | Domain vocabulary only: result and finding types, error classes, shared enums and unions, analyzer and validator contracts | Services, modules, anything executable |
| **configuration** | `layer:configuration` | The config file's schema, loading, defaults, and override resolution, **plus CLI flag resolution**, producing one resolved configuration object | Domain result types |
| **analysis** | `layer:analysis` | What the tool actually does. Per-suite names and per-suite shape | Rendering, command wiring |
| **output** | `layer:output` | Every render target: JSON, markdown, mermaid, anchor blocks, destination routing, delivery | Analysis |
| **cli** | `layer:cli` | `*.command.ts` modules and nothing else | Any logic |

`agents` and `examples` carry no layer tag; neither is in the runtime chain.

**The `nx` plugin layer carries `layer:cli`, not a sixth tag.** `layer:cli`
names an entrypoint layer, not specifically a command-line one — it was
called `layer:host` through most of this vocabulary's design before being
renamed to `layer:cli`, and an Nx plugin (`@callidescope/nx`,
`@conformetry/nx`) is a second host for the same underlying toolchain, not a
new layer stacked above it. Tagging it `layer:cli` keeps the spine at five
layers and keeps the generic boundary rules that gate it at four, which is
this vocabulary's own falsification condition: if a genuine sixth layer were
needed, the convergence this ADR claims would not be real.

## The core-versus-configuration test

The sharp test that decides where a type belongs: if it describes **what the
tool produced**, it is `core`; if it describes **what the user wrote in
`<tool>.config.ts`**, it is `configuration`. Under that test
`CodeStatisticsResult` belongs in `core` and `WriteMarkdownOutput` stays in
`configuration` — despite reading like an output-layer type, it names a
destination the user declared in `<tool>.config.ts`, which is what the test
scores rather than the name. A `core` package that fails this test — one that exports a
live service, or a `configuration` package that exports a result type the tool
produced rather than a value the user configured — has drifted out of its
layer regardless of which package it physically sits in.

## The analysis layer does not converge on a name

Every other layer converges on one name across all four toolchains. The
analysis layer deliberately does not: forcing it to would produce a
sixty-file blob in codometer's case, where "analysis" would have to cover
language measurement, size measurement, and everything else the tool does in
one package. It stays named for what it analyzes — `graph`;
`file-imports` / `nestjs-modules` / `nx-projects` / `boundaries`;
`languages` / `measurement`; `languages` / `generation` / `validation` — and
is governed by a rule instead of a shared noun: **one package per
independently usable analyzer, named for what it analyzes.**

## Considered options

- **Make `core` the analysis layer**, so the leaf package would hold what the
  tool actually does rather than just its contracts. Rejected. `core` has to
  be import-safe from every other layer including `configuration` — every
  layer above it depends on it — and an analysis package cannot sit there
  without breaking that direction: `configuration` would need to depend on
  whatever the analysis package's own contracts describe, but the analyzers
  themselves depend on `configuration` for the resolved run settings they
  read. Keeping `core` as pure contracts is what fixed conformetry's inverted
  layering in the first place, where `conformetry-core` mixed contracts with
  five live services and forced `configuration` to import it just to reach
  the contracts. Naming `core` the analysis layer would reintroduce the exact
  defect this vocabulary exists to remove.
- **A shared `@ic-suite/*` package** carrying the common `ConfigurationService`
  and `ConfigurationModule` shape, or the layer tags, or any other piece of
  the convention. Rejected — see the no-shared-package constraint below.
- **Converge the analysis layer on one shared name** (`analysis` itself, or a
  suite-specific synonym) the way every other layer does. Rejected: codometer
  alone would need one package covering language measurement, size
  measurement, customization, and discovery, which is the sixty-file blob
  this ADR's analysis-layer rule exists to prevent. The rule that replaces
  convergence — one package per independently usable analyzer, named for what
  it analyzes — is recorded above.
- **The five-layer spine above, with `core` as pure contracts and the
  analysis layer named per suite rather than converged.** Chosen. It is what
  the layer table, the core-versus-configuration test, and the per-toolchain
  package plan in this ADR all describe.

## The no-shared-package constraint

The four toolchains share nothing today but `logger`, and this vocabulary must
not change that. **No cross-toolchain package is created.** The common
`configuration` interface is a convention, not an imported type: each
toolchain's `core` declares its own structurally identical
`ConfigurationService` shape, and no toolchain imports that shape from
anywhere else. A later session that "simplifies" the four toolchains onto an
`@ic-suite/*` dependency is undoing this decision, not completing it.

## The accepted `codependix-nx-projects` wart

`codependix-nx-projects` keeps its name even though it collides with the `nx`
plugin layer that callidescope and conformetry use for their Nx generator
plugins: `codependix-nx-projects` is an `analysis`-layer graph builder that
_reads_ the Nx project graph, not a plugin registered in `nx.json`, and
codependix has no plugin at all. Renaming it was explicitly considered and
rejected — the namespace collision is documented here as a known, deliberate
exception rather than something a future session should "fix" by renaming the
package or promoting it out of the analysis layer.

## Consequences

- **Once the tags are in place, a package's layer will be readable from its
  name and its `layer:*` tag alone**, so an agent moving between toolchains
  will not have to open a package's `index.ts` to learn its role. Until the
  four toolchain pull requests land, no package carries a `layer:*` tag yet —
  their absence is expected, not a sign that this vocabulary was dropped.
- **The analysis layer stays the one layer with a per-suite vocabulary.** A
  reader has to learn what each toolchain analyzes — there is no shortcut past
  that — but everything above and below it reads identically across all four.
- **`codependix-nx-projects` remains a standing point of confusion between
  "the analysis package that reads the Nx project graph" and "the `nx` plugin
  layer"** until or unless a future decision reopens it; this ADR is that
  reopening's starting point, not a prohibition on ever revisiting it.
- **A new ic-suite package's definition of done includes exactly one
  `layer:*` tag** (`*-agents` and `*-examples` excepted), and the generic
  `codependix.config.ts` boundary rules this ADR's follow-on pull request adds,
  once keyed on those tags, will catch an untagged or misplaced package
  without anyone writing a rule that names it.

## Note, 2026-10-08: codependix now has a plugin

This ADR said "codependix has no plugin at all" and listed callidescope and
conformetry as the only toolchains with an `nx` plugin layer. That stopped
being true when `@codependix/nx` landed
([#1429](https://github.com/Organizzolini/codebase/pull/1429)): it infers a
per-project `codependix-gate` target, and it sits in the `nx` plugin layer
above `cli`, tagged `layer:cli` as this ADR prescribes. The decisions above
stand as written. `codependix-nx-projects` still keeps its name, and it is
still the `analysis`-layer reader of the Nx project graph rather than the
plugin; `codependix-nx` is the plugin.
