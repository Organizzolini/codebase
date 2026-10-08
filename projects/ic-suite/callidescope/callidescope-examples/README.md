# 🔭 Callidescope Examples

**A small codebase built to be traced, so every finding callidescope reports has
somewhere to point.**

Callidescope's claim is that it follows calls no file-at-a-time tool can see:
`this.someService.load()` through an injected dependency, a structurally
satisfied interface with no `implements`, a callback handed to `map`. The
evidence for that used to be the tool's output on this repository, where the
interesting edges sit among some four thousand callables. This package is the
other kind of evidence — here is the code, here is exactly what callidescope makes of it, and
here is why.

Nothing here is meant to be good code. Every callable exists to make one rule,
one finding, or one annotation visible, and several of them are deliberately
bad. The reports under [`output/`](output) and the
[section at the bottom of this file](#-callidescope) are committed, so a reader
sees the shape without running anything.

```bash
nx run callidescope-examples:examples          # check the committed reports
nx run callidescope-examples:examples:write    # regenerate them
nx run callidescope-examples:vitest            # assert every finding below
```

Agents arriving from a callidescope finding should start at [AGENTS.md](AGENTS.md),
which maps "callidescope reported X" to the example that explains X.

## How to read a stack

```text
🚀 DeepStackService.quote(amount: number): number [.../deep-stack.service.ts:50]
   ↳ Quotes one order, priced through every stage below.
  └─> DeepStackService.validate(amount: number): number [.../deep-stack.service.ts:43]
     ↳ Rejects a negative amount before anything else reads it.
```

| Part | What it is |
| ---- | ---------- |
| 🚀 | The entry point — the root depth is measured from |
| `└─>` | One hop down, indented once per frame |
| `(…): number` | The signature, from the type checker. Collapsed past 80 characters |
| `↳` | The JSDoc summary, collapsed to one line |
| `⚠ deprecated` | The frame carries a `@deprecated` tag |
| `[path:line]` | Where to open. This is the point of the whole line |
| `depth ≥ 8` | A **floor**, not a measurement — something on this path could not be followed |
| `· orphan-root` | Which rule made the first frame a root |

## The examples

Each directory under [`examples/`](examples) is one example, carries its own
`README.md`, and is readable on its own.

**The package is traced as one unit, together with its dependency closure.**
Almost every example directory carries no `tsconfig.json` of its own, so it
cannot be traced alone — which is why every example's `## Run it` names the same
command and then says where in the committed output to look. The one exception
is deliberate: [gated-leaf](examples/gated-leaf/README.md) _is_ a project of its
own, because what it demonstrates is per-project configuration and a limit
resolves per project. The run reaches beyond this package in the other
direction, too: a project's own `tsconfig.json` never lists the packages it
imports, so a scoped run also traces every project its imports transitively
reach — otherwise a call leaving the package would land in code no traced
project owned. Five projects are traced here, and
[dependency-closure](examples/dependency-closure/README.md) is where that is
worked through. Read them in the order below for a walkthrough:
[plain-call](examples/plain-call/README.md) →
[injected-dependency](examples/injected-dependency/README.md) →
[structural-interface](examples/structural-interface/README.md) →
[base-class](examples/base-class/README.md) →
[constructed-class](examples/constructed-class/README.md) →
[callback-argument](examples/callback-argument/README.md) →
[dependency-closure](examples/dependency-closure/README.md) →
[computed-member](examples/computed-member/README.md) →
[implementation-fan-out](examples/implementation-fan-out/README.md) →
[mutual-recursion](examples/mutual-recursion/README.md) →
[entry-points](examples/entry-points/README.md) →
[declared-entry-points](examples/declared-entry-points/README.md) →
[deep-stack](examples/deep-stack/README.md) →
[forwarding-stack](examples/forwarding-stack/README.md) →
[project-depth-limit](examples/project-depth-limit/README.md) →
[gated-leaf](examples/gated-leaf/README.md) →
[shared-tail](examples/shared-tail/README.md) →
[frame-annotations](examples/frame-annotations/README.md).

### The resolution table, made executable

One fixture per row of the "How it follows a call" table in
[the callidescope README](../callidescope-cli/README.md).

| Fixture | Written as | Resolved to |
| ------- | ---------- | ----------- |
| [`plain-call`](examples/plain-call) | `normalize(label)` | `normalizeLabel` — the declaration, unwrapped through the import alias |
| [`injected-dependency`](examples/injected-dependency) | `this.inventoryService.reserve(…)` | `InventoryService.reserve`, through the constructor parameter's type |
| [`structural-interface`](examples/structural-interface) | `provider.ingest(document)` | `FilesystemProviderService.ingest` — no `implements`, an arrow-typed property |
| [`base-class`](examples/base-class) | `super.run()` | `BaseTaskService.run`, the base declaration |
| [`constructed-class`](examples/constructed-class) | `new ParserService(source)` | `ParserService.constructor`, which has a body |
| [`callback-argument`](examples/callback-argument) | `entries.map(entry => …)` | The arrow, as its own frame. `map` itself is external |
| [`computed-member`](examples/computed-member) | `REPORT_HANDLERS[format]()` | Nothing. Recorded as unfollowable rather than guessed |

The last row is why this package's deepest stack prints as `depth ≥ 8` rather
than `depth 8`. Eight frames of ordinary forwarding end at a member name that is
a value rather than a name in the syntax, so the real depth is whatever the
selected handler adds — unknowable from the source. A floor is the honest
answer: reporting `8` would claim a ceiling that does not exist, and reporting
nothing would hide a stack that is already too deep at the point it goes dark.

Every row above resolves inside one package. A workspace adds one more case — a
call that leaves the package it was written in — which is the next section.

### The dependency closure

[`dependency-closure`](examples/dependency-closure) makes the same injected hop
as `injected-dependency` and lands in a different package —
`ConfigurationService.resolveConfiguration`, declared in
`@callidescope/configuration`. It resolves because a run scoped to one directory
traces the projects that directory's imports transitively reach, rather than the
directory alone.

Pointed at this package, the run builds a program for five projects — two it
was named at, and three its imports reached:

| Project | Reached because |
| ------- | --------------- |
| `projects/ic-suite/callidescope/callidescope-examples` | Named — the directory the run was pointed at |
| `.../examples/gated-leaf` | Named — a nested project, for the reason [gated-leaf](examples/gated-leaf/README.md) gives |
| `projects/ic-suite/callidescope/callidescope-configuration` | Imported by the fixture, and by [`callidescope.workspace.config.ts`](callidescope.workspace.config.ts) |
| `projects/ic-suite/codometer/codometer-configuration` | Reached through the shared configuration [`codometer.config.ts`](codometer.config.ts) spreads |
| `projects/logging` | Reached through the shared `configuration/eslint.config.ts` |

That is what the closure buys, and it is measurable: the fixture's stack is
depth 4 as traced, and depth 2 when the same fixtures are traced again with
`projects/ic-suite/callidescope/callidescope-configuration` excluded. Two rules keep the reached set
from growing past those three — a project root holding no `package.json` is not
a destination, and neither is the workspace root — and the example's guide works
through both, including the shared
[`configuration/`](../../../../configuration) directory this package's program really
reads and the closure deliberately refuses.

### The cap on structural matching

[`implementation-fan-out`](examples/implementation-fan-out) declares nine
classes satisfying one interface, against an implementation-candidate cap of
eight. The whole expansion is dropped and
recorded as unfollowable — not narrowed to a favorite, which would invent a
call stack no execution ever takes. A member named `emit`, `run`, or `sync`
matches dozens of unrelated classes in a real workspace, and that is the noise
the cap exists to stop.

This package's own fixtures account for exactly two unfollowable calls: the
computed member name, and this dropped expansion. The run's total is higher,
because the closure's real dependency code contributes its own — the per-project
report for `projects/ic-suite/callidescope/callidescope-examples` in
[`output/report.json`](output/report.json) is where the two are counted apart
from the rest.

### Recursion

[`mutual-recursion`](examples/mutual-recursion) is a cycle of three. The
three collapse into one component before depth is measured, so they contribute
three frames once.

The rejected alternative is detecting a repeat visit part-way through the walk.
It makes the answer depend on which path arrived first, so the same method
reports a different depth from a different entry point, and between runs. A
linter whose numbers move on their own cannot gate a pull request — a red build
nobody caused is a red build everyone learns to ignore.

`traverse` sits above the cycle rather than in it, and it has to. Every member
of a cycle has a caller _inside_ the cycle, so none of the three is ever
promoted as an orphan root — a cluster nothing outside it calls is reachable
from no root at all, and would contribute a cyclic component to the run summary
while appearing in no stack. Real recursive code is always called from
somewhere, and `traverse` is that somewhere.

### Entry points

Depth is only meaningful relative to a root, and most code in a repository like
this one is called by a framework rather than by the repository. Every root kind
has a fixture:

| Kind | Fixture |
| ---- | ------- |
| `decorated-method` | `EntryPointsService.readReport`, carrying `@Get()` |
| `lifecycle` | `EntryPointsService.onModuleInit` |
| `module-bootstrap` | `bootstrap` in [`src/main.ts`](src/main.ts) |
| `exported-function` | `normalizeExampleLabel` in [`src/index.ts`](src/index.ts) |
| `orphan-root` | [`summarizeOrphanedWork`](examples/entry-points/entry-points.ts), which nothing calls |
| `declared` | [`DeclaredEntryPointsService.collect`](examples/declared-entry-points), whose address this package's own configuration names |

The bootstrap and barrel rules key on the literal paths `src/main.ts` and
`src/index.ts`, so those two fixtures are the only files in this package outside
`examples/`.

Orphan promotion is the safety net rather than a feature. Without it a missing
entry-point rule removes a whole subtree from every measurement in silence;
with it, the subtree surfaces under a root that says "nothing claimed this" —
which is itself worth knowing, since an orphan is either dead code or a rule
that needs adding. Most stack heads in _this_ package are orphan roots, because
fixtures have no framework to call them.

`dependency-cruiser` says the same thing from the other direction: it reports
`no-orphans` against
[`orphan-root.utilities.ts`](examples/entry-points/entry-points.ts)
as a warning on every run of this project. Two tools independently noticing the
same file is the example working, not a lint failure to chase.

### Per-project configuration

Every limit callidescope gates on belongs to a **project** rather than to a run,
and a project is a directory holding a `tsconfig.json`. Three examples cover
what a project may say about itself:

| Example | What it declares | What that changed |
| ------- | ---------------- | ----------------- |
| [`declared-entry-points`](examples/declared-entry-points) | `entryPoints.addresses`, in [`callidescope.config.ts`](callidescope.config.ts) at this package's root | A callable with a caller heads a stack of its own, under the `declared` kind |
| [`project-depth-limit`](examples/project-depth-limit) | `limits.maximumDepth`, in the same file | A six-frame chain is a finding at five and would pass at the six the run supplies |
| [`gated-leaf`](examples/gated-leaf) | Both fields, plus `limits.maximumBreadth` and `exclude`, in its own nested project | Four frames and three direct callees become findings that no limit above them would ever have reported, and one generated file goes untraced |

They sit in the reading order above in that order, and one rule does all the
work: **the workspace number is a default, not a ceiling, and not
inheritance.** A project's own file is the complete statement of how it is
traced and judged — every field present, or the run is refused naming the
project and the field — so a project that keeps a default keeps it by writing
it down rather than by staying silent.

Which is why a real package's configuration is a spread and an override —

```ts
export default {
  ...projectDefaults,
  limits: { maximumBreadth: undefined, maximumDepth: 5 },
};
```

— and **never** as a spread of the workspace limits. Such an object carries
limits that shape the graph itself, those are workspace-only, and a project file
holding one is refused before anything is traced. Nothing is lost: `maximumDepth`
and `maximumBreadth` are the only two a project may set, so a spread would supply
the field being overridden plus the one that gets the file rejected.

One of the three is a project nested inside this one, the way
[`codependix-examples`](../../codependix/codependix-examples) nests the workspaces it graphs.
That is what makes a per-project limit demonstrable at all: a limit belongs to a
project, so a report showing three different ones takes more than one project to
produce.

### Output

All four destinations are configured in
[`callidescope.workspace.config.ts`](callidescope.workspace.config.ts) and all four results are
committed:

| Destination | Result |
| ----------- | ------ |
| `json` | [`output/report.json`](output/report.json) — the whole run, machine-readable |
| `markdown` | [`output/report.md`](output/report.md) — the printed trees, between anchors |
| `mermaid` | [`output/diagram.md`](output/diagram.md) — the same stacks, drawn |

Beside those three, each of the two projects here declares a `write.markdown`
of its own, which is what puts
[the section at the bottom of this file](#-callidescope) and one in the
nested project's guide. No workspace declaration fans those out — a
project's section is that project's own to declare, or not to.

A run publishes a section only for a **scoped** project — the projects a run
was pointed at, not the ones its closure reached. This run is scoped to this
package and to the one nested project under `examples/`, so it writes two
sections and no more, even though it measures five projects. That is the rule the
closure is read against: **measurement reaches into a package's dependencies,
publishing does not.** A scoped run that also published would rewrite the
section in three sibling packages that never asked for it, and fight
`nx run codebase:callidescope:write` — which sets different limits and ignores
`LoggerService.*` — over the same three anchor blocks forever. The
whole-workspace run still publishes every project's section, because a run that
names no directory has every project as a scoped one.

`--format` is separate from all four: it decides what reaches the terminal
rather than a file. All three of its values are committed here too, because each
one prints the body of one of the files above:

| `--format` | Prints | Committed as |
| ---------- | ------ | ------------ |
| `markdown` | The printed trees and finding tables | [`output/report.md`](output/report.md), between its anchors |
| `mermaid` | The same report with its stacks drawn | [`output/diagram.md`](output/diagram.md), between its anchors |
| `json` | The machine-readable report | [`output/report.json`](output/report.json), byte for byte |

So a console rendering is never a fourth artifact to keep in step — reading the
file is reading what the terminal would have shown, minus the anchor comments
the splice needs.

The diagram is worth drawing only when stacks share tails, so two of these
fixtures share one:
[`roundToCents`](examples/shared-tail/round-to-cents.ts) is the last
frame of both `DeepStackService.quote` and `ForwardingStackService.handle`, and
the flowchart shows them converging on it. A single stack drawn alone is a
straight line, and a straight line is a list with extra steps.

### The two flags

Gating a project's limits and gating a report's freshness are two different
findings, and they sit on opposite sides of a pull request. This package is the
clearest place to see why, because it uses the opposite one from the workspace
around it:

| Run | Flag | Why |
| --- | ---- | --- |
| `nx run <project>:gate` | the project's own limits | A stack got longer in this change, and this change is what fixes it |
| `nx run callidescope-examples:examples` | `--check reports` | The fixtures are frozen, so a stale report means a fixture, a dependency, or the resolver moved |

The workspace cannot check its own report on a branch: the call graph moves on
nearly every change, so freshness would fail pull requests for being behind
`main` rather than for anything they did. It publishes on `main` instead. Here
the opposite mostly holds — the fixtures move only on a deliberate edit — so
freshness is the right gate, and depth is not gated at all, because these
fixtures are _meant_ to breach it.

The closure qualifies that "mostly". Three dependency packages are traced
alongside the fixtures now, and they are ordinary code that changes for ordinary
reasons, so a change to one of them makes this report stale too. That is the
gate working rather than misfiring — the report really did change — but it means
the fix is `nx run callidescope-examples:examples:write` in whichever change
moved the dependency, and the `examples` target names those packages' sources in
its `inputs` so a cached run is never replayed over them. Their READMEs are not
named there, because this run does not write into them.

`{workspaceRoot}/configuration/*.config.ts` is in those `inputs` too, and it is
not redundant with `shared-globals` — which holds `configuration/tsconfig.json`
and nothing else. Two of the three dependency packages are in the closure only
because this package's own `eslint.config.ts` and `codometer.config.ts` spread
the root ones, and the root ones import `@codebase/logging/eslint` and
`@codometer/configuration`. Delete an import there and these reports lose a
whole project, with nothing else in `inputs` changed — a cached green replayed
over exactly the drift this gate exists to catch.

Two command lines are refused outright:

```bash
callidescope --write --check reports   # a report cannot be stale in the run that just wrote it
callidescope --check lint              # not a finding this tool has
callidescope --check                   # a gate that cannot fail is a mistake, not a shorthand
```

## Acting on a finding

### A depth finding

Depth is a question, not a verdict. Two fixtures are eight frames deep and the
right answer differs completely:

- [`deep-stack`](examples/deep-stack) — every layer transforms the amount it
  was handed. Nothing here is removable one layer at a time; the question is
  whether pricing needs this many stages at all.
- [`forwarding-stack`](examples/forwarding-stack) — six of the eight frames
  are `return this.next(amount)`. Read one file at a time each is the least
  objectionable code there is; read as a stack they are pure overhead, and
  collapsing them costs nothing.

So: open the deepest frame's `file:line`, and read the summaries down the tree.
If a run of frames all say the same thing, they are the forwarding case. If each
says something different, the layering is real and the finding is about the
design rather than the code.

The one thing not to do is raise `maximumDepth` to make it pass. This
repository's limit is a ratchet set to today's worst stack, so raising it
converts a gate into a record of a decision nobody made.

### Frame annotations

[`frame-annotations`](examples/frame-annotations) is seven frames, one per
shape a comment-trivia reader gets wrong or a renderer has to shorten. The stack
is deep on purpose: annotations are read only for the frames a report actually
prints, so a shape has to be inside a reported stack to be demonstrated at all.

| Frame | Shape |
| ----- | ----- |
| `render` | An **overload** — its documentation sits on the signature, not on the implementation the graph points at |
| `summarize` | An **arrow-typed property** — its documentation sits on the property, not on the arrow |
| `describe` | A **destructured parameter**, printed `{ count, name }: DescribeArguments`, which has no name at all in the syntax |
| `collapseThisSignatureBecauseItRunsLong` | A signature past 80 characters, collapsed to `(…): string` |
| `finish` | A summary past 120 characters, printed as its opening sentence alone |

`legacyRender` carries the `@deprecated` tag and heads a shorter stack of its
own, marked `⚠ deprecated` on its `🚀` line. It cannot sit inside the first
stack: calling a deprecated member is an ESLint error in this repository, so the
only honest way to give the tag a frame is to make the deprecated callable a
root — which is what a callable on its way out would be anyway.

Shortening applies to the printed tree only.
[`output/report.json`](output/report.json) carries every comment in full,
because a machine reading it has no line width to respect.

## Configuring your own workspace

Start from
[`callidescope.workspace.config.ts`](callidescope.workspace.config.ts) here,
which is short on purpose, and read
[the configuration reference](../callidescope-configuration/README.md) for every
field. Yours will be called `callidescope.config.ts` — this one carries the
longer name because it is a workspace configuration sitting at a project root,
and only that name keeps it from also being read as this package's own project
configuration. Its doc comment explains why that matters.

Four decisions are worth making deliberately:

1. **`limits.maximumDepth`.** Set it to your deepest stack today, not to the
   number you want. A limit that fails on arrival is a backlog rather than a
   gate. Lower it as the outliers come down.
2. **`entryPoints.decorators`.** Add whatever your framework calls. Anything you
   miss still appears — as an orphan root — so the cost of getting this wrong is
   a wrong-looking label rather than a missing subtree.
3. **`excludeFrom`.** Point it at a gitignore-syntax file rather than growing
   the configuration. This repository's
   [`.callidescopeignore`](../../../../configuration/.callidescopeignore) excludes
   generated code, template sources, and — the reason it matters here — this
   package, whose fixtures exist to breach the limits the workspace gate
   enforces.
4. **Which of your projects say something for themselves.** The workspace number
   is a default rather than a ceiling, so a project low in your call graph can
   carry a limit that describes it instead of one picked for the code above it.
   Every traced project needs a complete `callidescope.config.ts` of its own —
   spread `projectDefaults` and keep the defaults you mean to keep, override
   what you don't. Add one where the default is telling you nothing, which is
   what [`gated-leaf`](examples/gated-leaf) is. Write only the limits you
   override, and never spread the workspace limits into a project file — see
   [`project-depth-limit`](examples/project-depth-limit) for why that is refused.

## Why this package is shaped the way it is

Every cross-cutting check in this repository had to be answered for a package
whose entire content is deliberately-shaped fixture code. The answers:

| Check | Answer |
| ----- | ------ |
| Workspace depth gate | The package is in [`.callidescopeignore`](../../../../configuration/.callidescopeignore) and traced by its own configuration instead |
| Published section | Yes — this package declares its own `write.markdown`, because a section reporting the deliberately-bad fixtures is the best example in the package, not noise |
| Test coverage | Nothing is instrumented. Fixture code exists to be read by the type checker, not executed; what is verified is what callidescope makes of it |
| `knip` and `fallow` | Every fixture is declared an entry point rather than ignored, so both keep checking dependencies while the orphan-root fixture stops being a finding |
| `jscpd` | Scoped for this project. The resolution-table fixtures are near-identical by design |
| `codometer` | No declared size limit: the package is private and never built, so there is no bundle to gate |
| Nested projects | One example directory, `gated-leaf`, holds a `tsconfig.json` and no `package.json`. The first is what makes it a project with limits of its own; the second is deliberate — Nx infers a project from a nested `package.json`, and a `tsconfig.json` and a `package.json` nested one directory apart would collide with `@nx/enforce-module-boundaries`. It is named in the run's `--directories` instead |
| Nx tags | `type:package`, `framework:nestjs`, `language:typescript`, `name:callidescope-examples`. The NestJS dependency is real — `injected-dependency` is the headline case |
| Project layout | An `examples/` directory rather than `src/modules/`, matching the other `*-examples` packages. `configuration/codebase-structure.json` declares it |
| `conformetry` | Not an instance of any template, and nothing had to be suppressed to keep it that way — see below |

The layout is what keeps this package out of conformance, and it is worth
saying why, because the alternative was worse. Conformetry selects the instances
of `nestjs-service-module`, `nestjs-service-file`, and three more by pattern:
`src/modules/*` and `src/modules/*/*.service.ts`, on any project tagged
`framework:nestjs`. Under the original `src/modules/` layout, carrying that tag
made every fixture directory a conformance instance owing a unit test and the
template's full file set — so the fixtures would have been shaped by a generator
template rather than by what they demonstrate.

Moving to `examples/` dissolved that without suppressing anything. There is no
`src/modules/` for those patterns to match, so the tag is free to be accurate
about a dependency that is genuinely real.

## Layout

```text
callidescope-examples/
├── callidescope.config.ts             what this package declares about itself
├── callidescope.workspace.config.ts   what traces this package, and the limits it defaults to
├── examples/
│   ├── <name>/
│   │   ├── README.md                  the guide for this example
│   │   └── *.ts                       the fixture callables
│   └── gated-leaf/                    a nested project, with its own limits
│       ├── callidescope.config.ts     what that project declares about itself
│       ├── *.generated.ts             the file this project's own exclude drops
│       ├── tsconfig.json              what makes the directory a project
│       └── README.md                  the guide, holding that project's own section
├── output/
│   ├── report.json                    the whole run, machine-readable
│   ├── report.md                      the printed trees, between anchors
│   └── diagram.md                     the same stacks, drawn
├── src/
│   ├── index.ts                       the barrel — an `exported-function` root
│   └── main.ts                        the bootstrap — a `module-bootstrap` root
└── testing/
    └── examples.integration.test.ts   every finding this guide documents
```

`src/` is the one thing this package has that its three sibling `*-examples`
packages do not, and it is a requirement rather than a leftover: the
`module-bootstrap` and `exported-function` entry-point rules key on the
**literal paths** `src/main.ts` and `src/index.ts`, so those two fixtures cannot
live under `examples/` with the rest. They are the only files in this package
outside `examples/`.

## Test

```bash
nx run callidescope-examples:vitest
```

[`testing/examples.integration.test.ts`](testing/examples.integration.test.ts)
traces the fixtures and asserts every finding this guide documents — the stack
depths, the floor, the unfollowable frames, the entry-point kinds. A fixture whose meaning silently changed when the
resolver changed would be worse than no fixture, and these assertions double as
regression tests for the resolver itself.

## License

MIT — see [LICENSE](../../../../LICENSE).

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `projects/ic-suite/callidescope/callidescope-examples`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 80 |
| Files | 40 |
| Calls traced | 53 |
| Call stacks | 19 |
| Deepest stack | 8 |
| Stacks through recursion | 1 |
| Unfollowable calls | 2 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 5 |
| `maximumBreadth` | none |

### Call stacks (depth)

**1. `ComputedMemberService.dispatch`** — depth ≥ 8 · orphan-root

```text
🚀 ComputedMemberService.dispatch(format: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:60]
   ↳ Dispatches a report request to a handler named at runtime.
  └─> ComputedMemberService.read(format: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:43]
     ↳ Reads the request's format and passes it on.
    └─> ComputedMemberService.normalize(format: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:33]
       ↳ Normalizes the requested format before anything routes on it.
      └─> ComputedMemberService.route(format: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:48]
         ↳ Routes the request one layer further down.
        └─> ComputedMemberService.select(format: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:53]
           ↳ Selects the branch that prepares the format.
          └─> ComputedMemberService.prepare(format: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:38]
             ↳ Prepares the format string the handler table is keyed by.
            └─> ComputedMemberService.choose(format: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:28]
               ↳ Chooses a handler by name.
              └─> ComputedMemberService.apply(format: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:23]
                 ↳ Applies the selected handler, whichever one that turns out to be.
```

**2. `DeepStackService.quote`** — depth 8 · orphan-root

```text
🚀 DeepStackService.quote(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:50]
   ↳ Quotes one order, priced through every stage below.
  └─> DeepStackService.validate(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:43]
     ↳ Rejects a negative amount before anything else reads it.
    └─> DeepStackService.removeDiscount(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:33]
       ↳ Removes the tier discount from the validated amount.
      └─> DeepStackService.resolveTier(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:38]
         ↳ Picks the pricing tier the discounted amount falls into.
        └─> DeepStackService.loadRate(amount: number, tier: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:28]
           ↳ Looks up the tax rate the resolved tier pays.
          └─> DeepStackService.applyTax(amount: number, rate: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:18]
             ↳ Adds tax at the resolved rate.
            └─> DeepStackService.convertCurrency(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:23]
               ↳ Converts to the reporting currency and rounds through the shared tail.
              └─> roundToCents(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/shared-tail/round-to-cents.ts:8]
                 ↳ The tail two of this package's deep stacks share.
```

**3. `ForwardingStackService.handle`** — depth 8 · orphan-root

```text
🚀 ForwardingStackService.handle(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:53]
   ↳ Handles one amount, through six layers that do nothing to it.
  └─> ForwardingStackService.process(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:41]
     ↳ Forwards, unchanged.
    └─> ForwardingStackService.execute(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:21]
       ↳ Forwards, unchanged.
      └─> ForwardingStackService.forward(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:31]
         ↳ Forwards, unchanged.
        └─> ForwardingStackService.perform(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:36]
           ↳ Forwards, unchanged.
          └─> ForwardingStackService.relay(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:46]
             ↳ Forwards, unchanged.
            └─> ForwardingStackService.finish(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:26]
               ↳ Rounds the amount, which is the only work on this path.
              └─> roundToCents(amount: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/shared-tail/round-to-cents.ts:8]
                 ↳ The tail two of this package's deep stacks share.
```

<details>
<summary>16 more call stacks</summary>

**4. `FrameAnnotationsService.trace`** — depth 7 · orphan-root

```text
🚀 FrameAnnotationsService.trace(value: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:95]
   ↳ Traces one value through every annotation shape below.
  └─> FrameAnnotationsService.render(value: number | string): string | string[] [projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:88]
     ↳ Renders one value for display, in the form its type calls for.
    └─> FrameAnnotationsService.summarize(rendered: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:27]
       ↳ Collapses a rendered value to something a description can quote.
      └─> FrameAnnotationsService.describe({ count, name }: DescribeArguments): string [projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:64]
         ↳ Describes a value from a parameter with no name at all in the syntax.
        └─> FrameAnnotationsService.compose(description: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:33]
           ↳ Joins the parts a description was built from.
          └─> FrameAnnotationsService.collapseThisSignatureBecauseItRunsLong(…): string [projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:53]
             ↳ Takes three parameters whose rendered signature runs past eighty characters, so the printed frame collapses it to `(…):…
            └─> FrameAnnotationsService.finish(description: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:43]
               ↳ Finishes the chain and hands back what the layers above it built.
```

**5. `ProjectDepthLimitService.judge`** — depth 6 · orphan-root

```text
🚀 ProjectDepthLimitService.judge(project: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:45]
   ↳ Judges one project, through every stage a resolved limit passes.
  └─> ProjectDepthLimitService.resolveConfiguration(project: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:38]
     ↳ Names the configuration file the project is judged by.
    └─> ProjectDepthLimitService.readLimit(project: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:28]
       ↳ Reads the limit whichever configuration file the project settled on.
      └─> ProjectDepthLimitService.applyLimit(project: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:18]
         ↳ Applies the limit the resolved project turned out to declare.
        └─> ProjectDepthLimitService.reportVerdict(verdict: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:33]
           ↳ States the verdict, and where the number behind it came from.
          └─> ProjectDepthLimitService.readDeclaringFile(project: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:23]
             ↳ Reads the file the number the verdict used was written in.
```

**6. `FrameAnnotationsService.legacyRender`** — depth 4 · orphan-root

```text
🚀 FrameAnnotationsService.legacyRender(value: string): string ⚠ deprecated [projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:74]
   ↳ Renders a value the way this package used to.
  └─> FrameAnnotationsService.compose(description: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:33]
     ↳ Joins the parts a description was built from.
    └─> FrameAnnotationsService.collapseThisSignatureBecauseItRunsLong(…): string [projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:53]
       ↳ Takes three parameters whose rendered signature runs past eighty characters, so the printed frame collapses it to `(…):…
      └─> FrameAnnotationsService.finish(description: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:43]
         ↳ Finishes the chain and hands back what the layers above it built.
```

**7. `MutualRecursionService.traverse`** — depth 4 · orphan-root

```text
🚀 MutualRecursionService.traverse(remaining: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/mutual-recursion/mutual-recursion.ts:45]
   ↳ Enters the cycle from outside it, so the cluster has a root above it.
  └─> MutualRecursionService.branch(remaining: number): number (cycle) [projects/ic-suite/callidescope/callidescope-examples/examples/mutual-recursion/mutual-recursion.ts:28]
     ↳ Second of the three, one hop from the leaf.
    └─> MutualRecursionService.leaf(remaining: number): number (cycle) [projects/ic-suite/callidescope/callidescope-examples/examples/mutual-recursion/mutual-recursion.ts:38]
       ↳ Third of the three, which calls back to the first.
      └─> MutualRecursionService.descend(remaining: number): number (cycle) [projects/ic-suite/callidescope/callidescope-examples/examples/mutual-recursion/mutual-recursion.ts:33]
         ↳ First of the three, and the way into the cycle.
```

**8. `bootstrap`** — depth 3 · module-bootstrap

```text
🚀 bootstrap(): number [projects/ic-suite/callidescope/callidescope-examples/src/main.ts:14]
   ↳ The `module-bootstrap` entry-point kind.
  └─> OrdersService.place(available: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/injected-dependency/orders.ts:21]
     ↳ Places one order against the injected inventory.
    └─> InventoryService.reserve(available: number): number [projects/ic-suite/callidescope/callidescope-examples/examples/injected-dependency/inventory.ts:9]
       ↳ Reserves one unit and reports the count left behind.
```

**9. `CallbackArgumentService.shoutAll`** — depth 3 · orphan-root

```text
🚀 CallbackArgumentService.shoutAll(entries: readonly string[]): string[] [projects/ic-suite/callidescope/callidescope-examples/examples/callback-argument/callback-argument.ts:22]
   ↳ Shouts every entry, through a callback `map` invokes.
  └─> CallbackArgumentService.map(…)(entry: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/callback-argument/callback-argument.ts:23]
    └─> CallbackArgumentService.shout(entry: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/callback-argument/callback-argument.ts:15]
       ↳ Upper-cases one entry.
```

**10. `DeclaredEntryPointsService.publish`** — depth 3 · orphan-root

```text
🚀 DeclaredEntryPointsService.publish(entries: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/declared-entry-points/declared-entry-points.ts:29]
   ↳ Nothing calls this, so nothing had to declare it.
  └─> DeclaredEntryPointsService.collect(entries: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/declared-entry-points/declared-entry-points.ts:24]
     ↳ The surface this package declares, called from inside it all the same.
    └─> DeclaredEntryPointsService.render(entries: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/declared-entry-points/declared-entry-points.ts:17]
       ↳ Renders whatever was collected, and ends both stacks.
```

**11. `EntryPointsService.onModuleInit`** — depth 2 · lifecycle

```text
🚀 EntryPointsService.onModuleInit(): string [projects/ic-suite/callidescope/callidescope-examples/examples/entry-points/entry-points.ts:29]
   ↳ A lifecycle hook a framework calls — the `lifecycle` kind.
  └─> EntryPointsService.prepareCache(): string [projects/ic-suite/callidescope/callidescope-examples/examples/entry-points/entry-points.ts:22]
     ↳ Does the work a lifecycle hook is called to do.
```

**12. `EntryPointsService.readReport`** — depth 2 · decorated-method

```text
🚀 EntryPointsService.readReport(): string [projects/ic-suite/callidescope/callidescope-examples/examples/entry-points/entry-points.ts:34]
   ↳ A decorated method — the `decorated-method` kind.
  └─> EntryPointsService.buildReport(): string [projects/ic-suite/callidescope/callidescope-examples/examples/entry-points/entry-points.ts:17]
     ↳ Builds the body a decorated request handler answers with.
```

**13. `normalizeExampleLabel`** — depth 2 · exported-function

```text
🚀 normalizeExampleLabel(label: string): string [projects/ic-suite/callidescope/callidescope-examples/src/index.ts:15]
   ↳ The `exported-function` entry-point kind.
  └─> normalizeLabel(label: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/plain-call/normalize-label.ts:2]
     ↳ Trims a label and collapses the whitespace inside it.
```

**14. `DeclaredEntryPointsService.collect`** — depth 2 · declared

```text
🚀 DeclaredEntryPointsService.collect(entries: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/declared-entry-points/declared-entry-points.ts:24]
   ↳ The surface this package declares, called from inside it all the same.
  └─> DeclaredEntryPointsService.render(entries: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/declared-entry-points/declared-entry-points.ts:17]
     ↳ Renders whatever was collected, and ends both stacks.
```

**15. `BaseClassService.run`** — depth 2 · orphan-root

```text
🚀 BaseClassService.run(): string [projects/ic-suite/callidescope/callidescope-examples/examples/base-class/base-class.ts:16]
   ↳ Extends the base result rather than replacing it.
  └─> BaseTaskService.run(): string [projects/ic-suite/callidescope/callidescope-examples/examples/base-class/base-task.ts:9]
     ↳ Reports the work the base class claims to have done.
```

**16. `ConstructedClassService.count`** — depth 2 · orphan-root

```text
🚀 ConstructedClassService.count(source: string): number [projects/ic-suite/callidescope/callidescope-examples/examples/constructed-class/constructed-class.ts:17]
   ↳ Counts the tokens the constructed parser produced.
  └─> ParserService.constructor(source: string): ParserService [projects/ic-suite/callidescope/callidescope-examples/examples/constructed-class/parser.ts:9]
```

**17. `DependencyClosureService.allowsDepth`** — depth 2 · orphan-root

```text
🚀 DependencyClosureService.allowsDepth(args: { configuration: CallidescopeConfiguration; depth: number; }): boolean [projects/ic-suite/callidescope/callidescope-examples/examples/dependency-closure/dependency-closure.ts:32]
   ↳ Whether a configuration allows a stack as deep as the one asked about.
  └─> DependencyClosureService.readDepthLimit(configuration: CallidescopeConfiguration): number [projects/ic-suite/callidescope/callidescope-examples/examples/dependency-closure/dependency-closure.ts:24]
     ↳ Reads the depth limit the dependency's own defaulting settles on.
```

**18. `PlainCallService.render`** — depth 2 · orphan-root

```text
🚀 PlainCallService.render(label: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/plain-call/plain-call.ts:17]
   ↳ Renders a label through the aliased helper.
  └─> normalizeLabel(label: string): string [projects/ic-suite/callidescope/callidescope-examples/examples/plain-call/normalize-label.ts:2]
     ↳ Trims a label and collapses the whitespace inside it.
```

**19. `StructuralInterfaceService.ingestDocument`** — depth 2 · orphan-root

```text
🚀 StructuralInterfaceService.ingestDocument(provider: StructuralProvider, document: string): number [projects/ic-suite/callidescope/callidescope-examples/examples/structural-interface/structural-interface.ts:17]
   ↳ Ingests one document through whatever satisfies the interface.
  └─> FilesystemProviderService.ingest(document: string): number [projects/ic-suite/callidescope/callidescope-examples/examples/structural-interface/structural-provider.ts:25]
     ↳ Counts the words one document contributes.
```

</details>

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `bootstrap` | 2 | `OrdersService.place`, `OrdersService.constructor` | `projects/ic-suite/callidescope/callidescope-examples/src/main.ts:14` |
| `BaseClassService.run` | 1 | `BaseTaskService.run` | `projects/ic-suite/callidescope/callidescope-examples/examples/base-class/base-class.ts:16` |
| `CallbackArgumentService.shoutAll` | 1 | `CallbackArgumentService.map(…)` | `projects/ic-suite/callidescope/callidescope-examples/examples/callback-argument/callback-argument.ts:22` |

<details>
<summary>48 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `CallbackArgumentService.map(…)` | 1 | `CallbackArgumentService.shout` | `projects/ic-suite/callidescope/callidescope-examples/examples/callback-argument/callback-argument.ts:23` |
| `ComputedMemberService.choose` | 1 | `ComputedMemberService.apply` | `projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:28` |
| `ComputedMemberService.normalize` | 1 | `ComputedMemberService.route` | `projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:33` |
| `ComputedMemberService.prepare` | 1 | `ComputedMemberService.choose` | `projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:38` |
| `ComputedMemberService.read` | 1 | `ComputedMemberService.normalize` | `projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:43` |
| `ComputedMemberService.route` | 1 | `ComputedMemberService.select` | `projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:48` |
| `ComputedMemberService.select` | 1 | `ComputedMemberService.prepare` | `projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:53` |
| `ComputedMemberService.dispatch` | 1 | `ComputedMemberService.read` | `projects/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:60` |
| `ConstructedClassService.count` | 1 | `ParserService.constructor` | `projects/ic-suite/callidescope/callidescope-examples/examples/constructed-class/constructed-class.ts:17` |
| `DeclaredEntryPointsService.collect` | 1 | `DeclaredEntryPointsService.render` | `projects/ic-suite/callidescope/callidescope-examples/examples/declared-entry-points/declared-entry-points.ts:24` |
| `DeclaredEntryPointsService.publish` | 1 | `DeclaredEntryPointsService.collect` | `projects/ic-suite/callidescope/callidescope-examples/examples/declared-entry-points/declared-entry-points.ts:29` |
| `DeepStackService.applyTax` | 1 | `DeepStackService.convertCurrency` | `projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:18` |
| `DeepStackService.convertCurrency` | 1 | `roundToCents` | `projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:23` |
| `DeepStackService.loadRate` | 1 | `DeepStackService.applyTax` | `projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:28` |
| `DeepStackService.removeDiscount` | 1 | `DeepStackService.resolveTier` | `projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:33` |
| `DeepStackService.resolveTier` | 1 | `DeepStackService.loadRate` | `projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:38` |
| `DeepStackService.validate` | 1 | `DeepStackService.removeDiscount` | `projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:43` |
| `DeepStackService.quote` | 1 | `DeepStackService.validate` | `projects/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:50` |
| `DependencyClosureService.allowsDepth` | 1 | `DependencyClosureService.readDepthLimit` | `projects/ic-suite/callidescope/callidescope-examples/examples/dependency-closure/dependency-closure.ts:32` |
| `EntryPointsService.onModuleInit` | 1 | `EntryPointsService.prepareCache` | `projects/ic-suite/callidescope/callidescope-examples/examples/entry-points/entry-points.ts:29` |
| `EntryPointsService.readReport` | 1 | `EntryPointsService.buildReport` | `projects/ic-suite/callidescope/callidescope-examples/examples/entry-points/entry-points.ts:34` |
| `ForwardingStackService.execute` | 1 | `ForwardingStackService.forward` | `projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:21` |
| `ForwardingStackService.finish` | 1 | `roundToCents` | `projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:26` |
| `ForwardingStackService.forward` | 1 | `ForwardingStackService.perform` | `projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:31` |
| `ForwardingStackService.perform` | 1 | `ForwardingStackService.relay` | `projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:36` |
| `ForwardingStackService.process` | 1 | `ForwardingStackService.execute` | `projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:41` |
| `ForwardingStackService.relay` | 1 | `ForwardingStackService.finish` | `projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:46` |
| `ForwardingStackService.handle` | 1 | `ForwardingStackService.process` | `projects/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:53` |
| `FrameAnnotationsService.summarize` | 1 | `FrameAnnotationsService.describe` | `projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:27` |
| `FrameAnnotationsService.compose` | 1 | `FrameAnnotationsService.collapseThisSignatureBecauseItRunsLong` | `projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:33` |
| `FrameAnnotationsService.collapseThisSignatureBecauseItRunsLong` | 1 | `FrameAnnotationsService.finish` | `projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:53` |
| `FrameAnnotationsService.describe` | 1 | `FrameAnnotationsService.compose` | `projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:64` |
| `FrameAnnotationsService.legacyRender` | 1 | `FrameAnnotationsService.compose` | `projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:74` |
| `FrameAnnotationsService.render` | 1 | `FrameAnnotationsService.summarize` | `projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:88` |
| `FrameAnnotationsService.trace` | 1 | `FrameAnnotationsService.render` | `projects/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:95` |
| `OrdersService.place` | 1 | `InventoryService.reserve` | `projects/ic-suite/callidescope/callidescope-examples/examples/injected-dependency/orders.ts:21` |
| `MutualRecursionService.branch` | 1 | `MutualRecursionService.leaf` | `projects/ic-suite/callidescope/callidescope-examples/examples/mutual-recursion/mutual-recursion.ts:28` |
| `MutualRecursionService.descend` | 1 | `MutualRecursionService.branch` | `projects/ic-suite/callidescope/callidescope-examples/examples/mutual-recursion/mutual-recursion.ts:33` |
| `MutualRecursionService.leaf` | 1 | `MutualRecursionService.descend` | `projects/ic-suite/callidescope/callidescope-examples/examples/mutual-recursion/mutual-recursion.ts:38` |
| `MutualRecursionService.traverse` | 1 | `MutualRecursionService.descend` | `projects/ic-suite/callidescope/callidescope-examples/examples/mutual-recursion/mutual-recursion.ts:45` |
| `PlainCallService.render` | 1 | `normalizeLabel` | `projects/ic-suite/callidescope/callidescope-examples/examples/plain-call/plain-call.ts:17` |
| `ProjectDepthLimitService.applyLimit` | 1 | `ProjectDepthLimitService.reportVerdict` | `projects/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:18` |
| `ProjectDepthLimitService.readLimit` | 1 | `ProjectDepthLimitService.applyLimit` | `projects/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:28` |
| `ProjectDepthLimitService.reportVerdict` | 1 | `ProjectDepthLimitService.readDeclaringFile` | `projects/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:33` |
| `ProjectDepthLimitService.resolveConfiguration` | 1 | `ProjectDepthLimitService.readLimit` | `projects/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:38` |
| `ProjectDepthLimitService.judge` | 1 | `ProjectDepthLimitService.resolveConfiguration` | `projects/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:45` |
| `StructuralInterfaceService.ingestDocument` | 1 | `FilesystemProviderService.ingest` | `projects/ic-suite/callidescope/callidescope-examples/examples/structural-interface/structural-interface.ts:17` |
| `normalizeExampleLabel` | 1 | `normalizeLabel` | `projects/ic-suite/callidescope/callidescope-examples/src/index.ts:15` |

</details>
<!-- callidescope:end -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/projects/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  callidescope_cli["callidescope-cli"]
  callidescope_configuration["callidescope-configuration"]
  callidescope_core["callidescope-core"]
  callidescope_examples["callidescope-examples"]
  callidescope_examples -.-> callidescope_cli
  callidescope_examples --> callidescope_configuration
  callidescope_examples --> callidescope_core
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class callidescope_examples subject
```

_Dashed edges are dependencies Nx inferred from configuration rather than from code._
<!-- codependix:end name="codependix-nx-projects" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs-modules" -->
_This project defines no NestJS modules to graph._
<!-- codependix:end name="codependix-nestjs-modules" -->

### File Imports

<!-- codependix:start name="codependix-file-imports" -->
```mermaid
graph LR
  file_callidescope_config_ts["callidescope.config.ts"]
  file_callidescope_workspace_config_ts["callidescope.workspace.config.ts"]
  file_codependix_config_ts["codependix.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_examples_base_class_base_class_ts["examples/base-class/base-class.ts"]
  file_examples_base_class_base_task_ts["examples/base-class/base-task.ts"]
  file_examples_callback_argument_callback_argument_ts["examples/callback-argument/callback-argument.ts"]
  file_examples_computed_member_computed_member_ts["examples/computed-member/computed-member.ts"]
  file_examples_constructed_class_constructed_class_ts["examples/constructed-class/constructed-class.ts"]
  file_examples_constructed_class_parser_ts["examples/constructed-class/parser.ts"]
  file_examples_declared_entry_points_declared_entry_points_ts["examples/declared-entry-points/declared-entry-points.ts"]
  file_examples_deep_stack_deep_stack_ts["examples/deep-stack/deep-stack.ts"]
  file_examples_dependency_closure_dependency_closure_ts["examples/dependency-closure/dependency-closure.ts"]
  file_examples_entry_points_entry_points_ts["examples/entry-points/entry-points.ts"]
  file_examples_forwarding_stack_forwarding_stack_ts["examples/forwarding-stack/forwarding-stack.ts"]
  file_examples_frame_annotations_frame_annotations_ts["examples/frame-annotations/frame-annotations.ts"]
  file_examples_gated_leaf_callidescope_config_ts["examples/gated-leaf/callidescope.config.ts"]
  file_examples_gated_leaf_gated_leaf_generated_ts["examples/gated-leaf/gated-leaf.generated.ts"]
  file_examples_gated_leaf_gated_leaf_ts["examples/gated-leaf/gated-leaf.ts"]
  file_examples_implementation_fan_out_api_sink_ts["examples/implementation-fan-out/api-sink.ts"]
  file_examples_implementation_fan_out_console_sink_ts["examples/implementation-fan-out/console-sink.ts"]
  file_examples_implementation_fan_out_database_sink_ts["examples/implementation-fan-out/database-sink.ts"]
  file_examples_implementation_fan_out_file_sink_ts["examples/implementation-fan-out/file-sink.ts"]
  file_examples_implementation_fan_out_line_sink_ts["examples/implementation-fan-out/line-sink.ts"]
  file_examples_implementation_fan_out_memory_sink_ts["examples/implementation-fan-out/memory-sink.ts"]
  file_examples_implementation_fan_out_network_sink_ts["examples/implementation-fan-out/network-sink.ts"]
  file_examples_implementation_fan_out_queue_sink_ts["examples/implementation-fan-out/queue-sink.ts"]
  file_examples_implementation_fan_out_stream_sink_ts["examples/implementation-fan-out/stream-sink.ts"]
  file_examples_implementation_fan_out_telemetry_sink_ts["examples/implementation-fan-out/telemetry-sink.ts"]
  file_examples_injected_dependency_injected_dependency_module_ts["examples/injected-dependency/injected-dependency.module.ts"]
  file_examples_injected_dependency_inventory_ts["examples/injected-dependency/inventory.ts"]
  file_examples_injected_dependency_orders_ts["examples/injected-dependency/orders.ts"]
  file_examples_mutual_recursion_mutual_recursion_ts["examples/mutual-recursion/mutual-recursion.ts"]
  file_examples_plain_call_normalize_label_ts["examples/plain-call/normalize-label.ts"]
  file_examples_plain_call_plain_call_ts["examples/plain-call/plain-call.ts"]
  file_examples_project_depth_limit_project_depth_limit_ts["examples/project-depth-limit/project-depth-limit.ts"]
  file_examples_shared_tail_round_to_cents_ts["examples/shared-tail/round-to-cents.ts"]
  file_examples_structural_interface_structural_interface_ts["examples/structural-interface/structural-interface.ts"]
  file_examples_structural_interface_structural_provider_ts["examples/structural-interface/structural-provider.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_main_ts["src/main.ts"]
  file_testing_examples_integration_test_ts["testing/examples.integration.test.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_examples_base_class_base_class_ts --> file_examples_base_class_base_task_ts
  file_examples_constructed_class_constructed_class_ts --> file_examples_constructed_class_parser_ts
  file_examples_deep_stack_deep_stack_ts --> file_examples_shared_tail_round_to_cents_ts
  file_examples_forwarding_stack_forwarding_stack_ts --> file_examples_shared_tail_round_to_cents_ts
  file_examples_injected_dependency_injected_dependency_module_ts --> file_examples_injected_dependency_inventory_ts
  file_examples_injected_dependency_injected_dependency_module_ts --> file_examples_injected_dependency_orders_ts
  file_examples_injected_dependency_orders_ts --> file_examples_injected_dependency_inventory_ts
  file_examples_plain_call_plain_call_ts --> file_examples_plain_call_normalize_label_ts
  file_examples_structural_interface_structural_interface_ts --> file_examples_structural_interface_structural_provider_ts
  file_src_index_ts --> file_examples_plain_call_normalize_label_ts
  file_src_main_ts --> file_examples_injected_dependency_inventory_ts
  file_src_main_ts --> file_examples_injected_dependency_orders_ts
  file_testing_examples_integration_test_ts --> file_callidescope_workspace_config_ts
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-2258-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-557.04_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-22-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-44-3178c6?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-44-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-4-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-32-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-134-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-1-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-8-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-31-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-113-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-76-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-189-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-0-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-53-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-62-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-39-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-193-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-537-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-0-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-0-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-0-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-0-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-0-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-0-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-0-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-0-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-0-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-5-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-10318-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-1882-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-738-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-6917-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-3176-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-929-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-1208-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-1011-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-7933-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-11-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-0-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-0-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-0-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-0-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-0-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-0-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-0-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-0-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-0-ea580c?style=flat-square)

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

![Module Files](https://img.shields.io/badge/Module_Files-1-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-0-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-0-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-0-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-0-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-1-7c3aed?style=flat-square)
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

![Markdown Files](https://img.shields.io/badge/Markdown_Files-21-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-1514-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-21-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-70-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-3-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-192-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-7-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-28-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-19-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-118-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-119-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-46-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-433-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- codometer:end -->
