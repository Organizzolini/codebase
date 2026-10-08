# 🍃 Gated leaf

**A leaf measuring four frames, gated at three — the case the whole per-project
configuration exists for.**

## Run it

```bash
nx run callidescope-examples:examples
```

This directory is its own project, so the run publishes a
`## 🔭 Callidescope` section for it, and that section is
[at the bottom of this guide](#-callidescope). The limits behind it are in
[`output/report.json`](../../output/report.json): `deepStacks` carries this
stack at `"limit": 3` and `wideCallables` carries `GatedLeafService.read` at
`"limit": 2`.

`GatedLeafService.read` heads four frames and calls three things directly. Those
are small numbers, and that is the point. A package low in the call graph
measures small numbers; every limit picked for the packages above it is picked
for their code, and every one of them leaves a leaf with no limit that binds:

| A limit the leaf could be held to | Written in | The leaf's four frames |
| --------------------------------- | ---------- | ---------------------- |
| 3 | [`callidescope.config.ts`](callidescope.config.ts), its own | a finding |
| 5 | [`../../callidescope.config.ts`](../../callidescope.config.ts), the package around it | silent |
| 6 | [`../../callidescope.workspace.config.ts`](../../callidescope.workspace.config.ts), the run's default | silent |
| 17 | [`configuration/callidescope.config.ts`](../../../../../../configuration/callidescope.config.ts), this repository's ratchet | silent |

That last row is the real workspace, and the number is pinned by the single
deepest stack anywhere in it. The motivating measurement behind all of this was
`codometer-changes`: ten frames of its own, held to seventeen, which was to say
held to nothing. It now declares those ten in a
[`callidescope.config.ts`](../../../../codometer/codometer-changes/callidescope.config.ts) of
its own, which is this example's argument having been acted on rather than an
argument it has stopped needing to make — every leaf added after it starts out
in the row above.

## Two things had to be true before a limit here meant anything

**It had to be a project.** Limits resolve per project, and a project is a
directory holding a `tsconfig.json`. This directory has one, which is what lets
the [`callidescope.config.ts`](callidescope.config.ts) beside it be read as a
project configuration at all.

**It had to declare its entry point.** Nothing outside this project calls
`read`, so without the address in
[`callidescope.config.ts`](callidescope.config.ts) it would root under the
`orphan-root` rule instead — measured the same, but labeled as dead code rather
than as a surface this project asked to be measured on. Declaring the address
is what makes the `declared` kind below say that in writing; see
[`declared-entry-points`](../declared-entry-points/README.md) for the field and
its refusals.

## A stack is judged by the limit of the project its root belongs to

A stack rooted in this project answers only for this project's own gate, never
for a limit any package that calls into it happens to carry — the same
"downward only" rule
[`project-depth-limit`](../project-depth-limit/README.md) reads from the other
direction. This project's own four frames are judged at three, and would be
silent under either of the two limits above it in the table above.

## Breadth can be gated at all only because some project declares a limit

`maximumBreadth` has no tool default and no workspace default — a single breadth
number was never something anybody could pick for a whole workspace — so
`--check breadth` is refused until some project in scope declares one. This
project is one of the several that now do:

```bash
node --import @swc-node/register/esm-register projects/ic-suite/callidescope/callidescope-cli/src/main.ts \
  callidescope --check breadth \
  --config projects/ic-suite/callidescope/callidescope-examples/callidescope.workspace.config.ts \
  --directories projects/ic-suite/callidescope/callidescope-examples,projects/ic-suite/callidescope/callidescope-examples/examples/gated-leaf
```

```text
🔭 Found callables calling too much directly {"callables":["GatedLeafService.read"],"count":1,"widest":3}
```

Scope the same run to a set of projects none of which declares a numeric
`maximumBreadth` — no fixture in this package can show that, because every real
package's `callidescope.config.ts` spreads `projectDefaults`, a value import of
`@callidescope/configuration`, whose own file declares `maximumBreadth: 8` and
so joins the closure of nearly everything else in this repository — and the run
refuses outright:

```text
🔭 Rejected the configuration {"reasons":["--check breadth requires at least one project
in scope to declare limits.maximumBreadth. Add `limits: { maximumBreadth: <number> }` to
that project's callidescope.config.ts before running --check breadth."]}
```

See [`callidescope-configuration`](../../../callidescope-configuration/README.md)
for the rule in full.

## And it excludes one file, which is the whole of what `exclude` does

A project's own configuration may name globs to leave untraced, and this one
names `*.generated.ts`. **The glob is anchored to this project's root**, never
to the workspace: it names `gated-leaf.generated.ts` beside it and there is no
spelling of it that could name anything outside this directory.

The proof is in what is written against what is traced. Three files sit in
this directory — [`gated-leaf.ts`](gated-leaf.ts),
[`callidescope.config.ts`](callidescope.config.ts), and
[`gated-leaf.generated.ts`](gated-leaf.generated.ts) — and the `Files` row in
the `## 🔭 Callidescope` section [at the bottom of this
guide](#-callidescope) reads 2: the generated one never joins the count,
because its callables were never collected. Nothing in this project's own
`callidescope.config.ts` names the workspace root or any path outside this
directory — `*.generated.ts` alone — so there is no spelling of the glob that
could have reached further than the file beside it.

Anchoring it here rather than at the workspace root is what makes that true by
construction instead of by a rule somebody has to enforce, and it is how every
other file at a project root is already read — a `tsconfig.json`'s own `include`
and `exclude` are project-relative too. The run's `exclude` keeps its
workspace-relative meaning, and it is layered underneath: a project can leave
more out, never put back what the run left out.

What it drops is the **collection**, not the file. `gated-leaf.generated.ts` is
still in the `ts.Program` and still type-checked; what changed is that its
callables were never collected, so a call reaching into it would be an
unfollowable call rather than one that vanished. That is the run-level
`exclude`'s behavior too, not a per-project quirk — and it is why no `exclude`
can un-project a directory. This project cannot exclude the `tsconfig.json` that
makes it a project: discovery is settled from the run's own filter, long before
a project file has been read at all.

## Why this project is named rather than reached

Every other project this run measures arrives through the dependency closure,
the way [`dependency-closure`](../dependency-closure/README.md) describes. This
one is named in the run's `--directories` instead, and the reason is a
collision between two tools rather than anything about callidescope: a closure
**destination** must hold a `package.json`, and a `package.json` at this root
would make Nx infer a project of its own from it — after which any relative
import between this directory and its parent package crosses an inferred
project boundary and fails `@nx/enforce-module-boundaries`.

Naming a directory is the other way it becomes a project a run measures, and it
costs this fixture nothing: a starting project is traced in full, and the
closure rules only ever refuse a destination.

## Next

[shared tail](../shared-tail/README.md).

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `projects/ic-suite/callidescope/callidescope-examples/examples/gated-leaf`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 4 |
| Files | 2 |
| Calls traced | 5 |
| Call stacks | 1 |
| Deepest stack | 4 |
| Stacks through recursion | 0 |
| Unfollowable calls | 0 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 3 |
| `maximumBreadth` | 2 |

### Call stacks (depth)

**1. `GatedLeafService.read`** — depth 4 · declared

```text
🚀 GatedLeafService.read(key: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/gated-leaf/gated-leaf.ts:40]
   ↳ The address this project declares as its entry point.
  └─> GatedLeafService.parse(key: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/gated-leaf/gated-leaf.ts:27]
     ↳ First of the three, and the way into the chain.
    └─> GatedLeafService.normalize(key: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/gated-leaf/gated-leaf.ts:22]
       ↳ Second of the three, one hop from the end.
      └─> GatedLeafService.finish(key: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/gated-leaf/gated-leaf.ts:17]
         ↳ Ends the chain, which is where the fourth frame is.
```

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `GatedLeafService.read` | 3 | `GatedLeafService.parse`, `GatedLeafService.normalize`, `GatedLeafService.finish` | `projects/ic-suite/callidescope/callidescope-examples/examples/gated-leaf/gated-leaf.ts:40` |
| `GatedLeafService.normalize` | 1 | `GatedLeafService.finish` | `projects/ic-suite/callidescope/callidescope-examples/examples/gated-leaf/gated-leaf.ts:22` |
| `GatedLeafService.parse` | 1 | `GatedLeafService.normalize` | `projects/ic-suite/callidescope/callidescope-examples/examples/gated-leaf/gated-leaf.ts:27` |
<!-- callidescope:end -->
