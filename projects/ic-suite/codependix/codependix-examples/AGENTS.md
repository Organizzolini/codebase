# 🕸️ Codependix Examples — Agent Guide

Subjects built to be graphed, and the guides rendered from them: one worked
example per thing codependix builds, each rendered by the real graph builders
from the subject beside it. Read [README.md](README.md) for the guided tour;
this file is the lookup table for when codependix has already said something.

## Run one

```bash
nx run codependix-examples:examples          # fail if any committed guide has drifted
nx run codependix-examples:examples:write    # re-render every guide
nx run codependix-examples:vitest            # the tests that keep every claim true
```

There is no per-example command. Every guide is rendered from its subject by the
same run, which is why each one's `## Run it` names the command above — a
subject carries no `project.json` and cannot be exported on its own.

## Codependix said X — open this example

Every row is a real rendered file, not prose. If codependix refused something,
the reproduction that produces that exact message is in
[`refusals`](examples/refusals).

| What you were told | Open |
| ------------------ | ---- |
| `Found stale codependix exports`, with a list of projects | [`check-and-write`](examples/check-and-write), then [`workspace-drift`](examples/workspace-drift) — an export moves with the workspace, so a branch that changed any project graph fails `--check` for projects it never touched. This repository gates no pull request on it |
| `AnchorNotFoundError: Anchor "…" not found in …/README.md` | [`auto-created-sections`](examples/auto-created-sections) — the file itself does not exist. A missing _anchor_ is auto-created on `--write`; a missing _file_ is not |
| A project reported stale that has never had codependix output | [`auto-created-sections`](examples/auto-created-sections) — expected. `--check` reports it as needing a write rather than raising |
| `A "both" export target needs a json destination.` | [`refusals`](examples/refusals) |
| `A "markdown" export target needs a markdown destination.` | [`refusals`](examples/refusals) |
| `A markdown destination needs an anchor, a path, or both` | [`refusals`](examples/refusals), and [`markdown-modes`](examples/markdown-modes) for the four shapes a destination can take |
| `ConfigurationFileNotFoundError` | [`refusals`](examples/refusals) — an explicitly named `--config` must exist; an unnamed one may be absent |
| `UnknownConfigurationFileTypeError` | [`refusals`](examples/refusals) — the seven readable extensions are listed there |
| `TypescriptProjectConfigurationError` | [`typescript-resolution`](examples/typescript-resolution) — the compiler's own diagnostics, and why a parse failure is fatal rather than skipped |
| `💥 Failed running codependix`, naming one project | [`container-rooting`](examples/container-rooting) — one project's failure is isolated; every other project still completed |
| `Found codependix boundary violations` | [`boundary-rules`](examples/boundary-rules) — a real edge or cycle in real code. Re-running `--write` never fixes one: either the edge goes, or the rule does |
| `--check needs a value` | [`check-and-write`](examples/check-and-write) — `--check` names which finding it gates. Name the set; do not drop the flag |
| `--check does not accept "…"` | [`check-and-write`](examples/check-and-write) — `limits` is codometer's word and `depth` is callidescope's; only `reports` is shared |
| `--write cannot be combined with --check reports` | [`check-and-write`](examples/check-and-write) — `--write --check boundaries` is legal, because a boundary has no destination to be stale |
| A rule you wrote reports nothing | [`boundary-rules`](examples/boundary-rules) — a selector's fields narrow each other, and one naming a field its level does not carry matches nothing rather than everything |
| A graph came out emptier than the code looks | [`ambient-modules`](examples/ambient-modules) for a rounded module with no edges; [`typescript-resolution`](examples/typescript-resolution) and [`python-scanner`](examples/python-scanner) for the statements deliberately not walked |
| A project produced no graph at all | [`configuration-resolution`](examples/configuration-resolution) — check `include`/`exclude` and whether a per-project override replaced the default |
| A NestJS module you expected is missing | [`container-rooting`](examples/container-rooting) — a rooted project is explored from `MainModule` outward, so a module nothing imports is absent |
| Path query: shortest connecting path between two nodes | [`path-queries`](examples/path-queries) — how `codependix path <from> <to>` finds connecting paths across graph levels |

## Before changing a graph builder

`nx run codependix-examples:examples` is the regression gate for every
documented behavior, and it is stricter than the tests: it compares the
committed Markdown byte for byte. Two rules follow from that.

- **A deliberate behavior change means regenerating**, with
  `nx run codependix-examples:examples:write`, and reading the diff. If a
  diagram moved, the guides moved with it.
- **An accidental behavior change shows up here first.** Every case in
  [`typescript-resolution`](examples/typescript-resolution) and
  [`python-scanner`](examples/python-scanner) that exists to _not_ be walked — a
  re-export, a dynamic `import()`, a `require`, an import indented inside a
  function — is a claim a resolver or scanner change could silently reverse. A
  failing `examples` check on one of those is a bug report, not a stale
  snapshot.

Never hand-edit an `examples/*/README.md` or an `examples/*/*.json`.

## Layout

```text
examples/<example>/README.md      # Rendered from the subject beside it
examples/<example>/<subject>/     # The code being graphed — nested, and scoped out of the linters
testing/render-examples.ts        # Entry point: --check or --write
testing/render/                   # One module per example, plain exported functions
testing/*.integration.test.ts     # The tests that keep every documented claim true
```

There is no `src/`. This package ships examples, not an application — no CLI, no
NestJS container of its own, no public API. The renderer sits in `testing/`
beside the tests that assert what it produced, which is where
`codometer-examples` keeps the harness that drives its own tool.
`testing/render/builders.ts` constructs the codependix services the examples
render through, and everything else in `testing/render/` is a plain function.

`callidescope-examples` does have a `src/`, and it holds **subject** code rather
than machinery: two fixtures that must sit at `src/main.ts` and `src/index.ts`
because callidescope's entry-point rules key on those literal paths. Nothing
here needs that, so nothing here has one.

**The nesting depth is load-bearing.** One level under `examples/` is the
rendered guide and its JSON exports, which every linter still checks; two levels
down is the subject, which `eslint` and `fallow` are scoped out of by the
`examples/*/*/**` pattern. Putting a subject file directly in an example
directory would drag it into the lint run.

## Adding an example

1. **Create `examples/<name>/`** and put the subject in a subdirectory of it,
   if the example needs one on disk. Nothing nested there is linted, so shape it
   however the behavior requires.
2. **Render it** from the matching module in `testing/render/`. Each exports a
   `build*Documents()` returning `ExampleDocument`s whose `id` is the directory
   name.
3. **Add the `id` to `EXAMPLE_ORDER`** in `testing/render/reading-order.ts` —
   the one place the reading order is written down, and what the rendered
   `## Next` links chain through. A document missing from it fails the run
   rather than being silently dropped. Add an entry to `EXAMPLE_EMOJI` beside
   it; the rendered title carries it.
4. **Assert the behavior** in `testing/`, not just the rendering — the point of
   an example is the claim it makes, and a test is what stops that claim from
   quietly reversing.
5. **Regenerate and commit**, then add a row to the README's table.

## Do not fix a deliberately broken example

Several subjects are malformed on purpose, and each one is the reproduction of a
refusal or a failure a reader will hit:

- `container-rooting/failing-container` refuses to load, which is how the guide
  shows that one project failing stops no other.
- `typescript-resolution/broken` carries a `tsconfig.json` the compiler cannot
  parse.
- `refusals/unsupported-type` names a graph type codependix does not have.
- `configuration-resolution/unknown-fields` carries a field codependix has no
  opinion about, to show it is stripped rather than rejected.

Repairing any of them deletes the only place that behavior is demonstrated. If a
guide's claim about one stops being true, the tool changed — that is the
regression the `examples` check exists to catch.

## Constraints worth knowing

- **The subjects carry no `project.json`**, so none of them joins this
  workspace's Nx project graph, `nx affected`, or `sherif`. Adding one would put
  a deliberately-broken `tsconfig.json` into the real build.
- **The Python subjects are never tagged `language:python`**, so `ruff`,
  `pyright`, `ty`, and `vulture` never run over input that exists precisely to
  look malformed.
- **Every anchor this package prints is named `example-*`.** An example printing
  `codependix-nx-projects` inside a Markdown file would be an anchor
  `codebase:codependix:write` could claim and overwrite.
- **A committed guide must not carry an absolute path.** The
  `typescript-resolution` and `refusals` renderers redact theirs; anything new
  that quotes a filesystem error needs the same treatment, or the `examples`
  check fails on every machine but the one that rendered it.
- **`examples/tsconfig.json` exists for the NestJS subjects.** Vite resolves a
  file's compiler options through the nearest tsconfig whose `include` claims
  it, so without that file the `@Module()` decorators reach Node untransformed
  and every container boot dies with a bare `SyntaxError`.

## Key files

| File | What it is |
| ---- | ---------- |
| [README.md](README.md) | The human guide, and the reasoning behind the layout |
| [testing/render/reading-order.ts](testing/render/reading-order.ts) | Every example, in reading order, and its emoji |
| [testing/render/catalog.ts](testing/render/catalog.ts) | Collects every built document and puts it in that order |
| [testing/render/builders.ts](testing/render/builders.ts) | The codependix services the examples render through |
| [testing/render/document.ts](testing/render/document.ts) | Markdown rendering, `## Run it`/`## Next`, and check/write delivery |
| [project.json](project.json) | The `examples` target, and why both its configurations are safe on a branch |
