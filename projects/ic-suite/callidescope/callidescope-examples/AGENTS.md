# 🔭 Callidescope Examples — Agent Guide

A small codebase written to be traced, not run: one worked example per thing
callidescope can report, so a failing `callidescope` run has somewhere concrete
to point. Read [README.md](README.md) for the guided tour; this file is the
lookup table for when callidescope has already said something.

Nothing here is executed by anything. Do not "fix" it, do not refactor it, and
do not delete an uncalled callable: several fixtures are deliberately bad, and
one is defined by having no caller at all.

## Run one

```bash
nx run callidescope-examples:examples          # trace the fixtures, gate the committed reports
nx run callidescope-examples:examples:write    # regenerate output/ and the three published sections
nx run callidescope-examples:vitest            # assert every documented finding
```

There is no per-example command. Almost every example directory carries no
`tsconfig.json`, so the package traces as one unit — every example's `## Run it`
names the command above and then says where in `output/` to look. One
directory is an exception and is a project of its own,
[`gated-leaf`](examples/gated-leaf/README.md), because a limit resolves per
project and that is what it demonstrates.

The run is not confined to this package, though. A scoped run also traces every
project its imports transitively reach, so this one covers five projects: the
two it is named at — `projects/ic-suite/callidescope/callidescope-examples` and the nested
`gated-leaf` — plus `projects/ic-suite/callidescope/callidescope-configuration`,
`projects/ic-suite/codometer/codometer-configuration`, and `projects/logging`. See
[`dependency-closure`](examples/dependency-closure/README.md).

## Callidescope said X — open this example

| What the run said | Open | What it means |
| ----------------- | ---- | ------------- |
| `🚨 [DEPTH n > limit]` and every frame's summary differs | [`deep-stack`](examples/deep-stack/README.md) | The layering is real. Question whether the stages are all needed; do not delete one layer at a time |
| `🚨 [DEPTH n > limit]` and a run of frames all say the same thing | [`forwarding-stack`](examples/forwarding-stack/README.md) | Layers that only pass arguments along. Collapse them |
| `depth ≥ n` rather than `depth n` | [`computed-member`](examples/computed-member/README.md) | Something on the path could not be followed. The number is a floor, not a bug |
| `Unfollowable calls` above zero | [`computed-member`](examples/computed-member/README.md), [`implementation-fan-out`](examples/implementation-fan-out/README.md) | A computed member name, or a structural expansion dropped for exceeding the implementation-candidate cap |
| `Stacks through recursion` above zero | [`mutual-recursion`](examples/mutual-recursion/README.md) | A cycle, collapsed before depth was measured. The depth is a floor |
| A stack headed `· orphan-root` | [`entry-points`](examples/entry-points/README.md) | Nothing claimed the callable. Either dead code, or an entry-point rule your configuration is missing |
| A stack headed `· declared` | [`declared-entry-points`](examples/declared-entry-points/README.md) | A project named that address in its own `callidescope.config.ts`. That is the surface it asked to be measured on |
| `declares an entryPoints.addresses entry that resolves to nothing` | [`declared-entry-points`](examples/declared-entry-points/README.md) | A declared address names a callable that has moved or been renamed. Fix the address; the refusal exists so a rename cannot loosen a gate in silence |
| `which only the workspace configuration may set` | [`project-depth-limit`](examples/project-depth-limit/README.md) | A project's `callidescope.config.ts` reached past `entryPoints`, `limits.maximumDepth`, `limits.maximumBreadth`, and `exclude` |
| Different findings in one report judged against different limits | [`project-depth-limit`](examples/project-depth-limit/README.md), [`gated-leaf`](examples/gated-leaf/README.md) | Not a bug. A limit belongs to a project, and every project writes its own — so findings against different numbers in one report are different projects' numbers |
| A project reporting depth 0 while carrying a real chain | [`gated-leaf`](examples/gated-leaf/README.md) | It roots nothing, because everything it owns is called from above. Declare its entry points before giving it a limit |
| `--check breadth requires at least one project in scope` | [`gated-leaf`](examples/gated-leaf/README.md) | Breadth has no default anywhere. Some project in scope has to declare `limits.maximumBreadth` before the gate can run |
| A file a project's own `exclude` names, still traced | [`gated-leaf`](examples/gated-leaf/README.md) | A project's globs are anchored to that project's root. A workspace-relative glob in a project file matches nothing; drop the leading path, or move the glob to the run's own configuration |
| A frame marked `⚠ deprecated`, or printed `(…): T` | [`frame-annotations`](examples/frame-annotations/README.md) | Annotation shortening in the printed tree. `output/report.json` carries the full text |
| A call resolved to a class that never writes `implements` | [`structural-interface`](examples/structural-interface/README.md) | Structural matching, which is the only thing that works on an arrow-typed property |
| A frame you did not expect, named for a declaration rather than the local name | [`plain-call`](examples/plain-call/README.md) | The checker unwraps the import alias. A report always names the declaration |
| A frame, a stack, or a per-project row in a package the run was not pointed at | [`dependency-closure`](examples/dependency-closure/README.md) | A scoped run traces the projects its imports reach. Not a leak — a call into a dependency lands on a frame instead of stopping at the package boundary |
| A stack that ends at a call into another directory, with no frame for it | [`dependency-closure`](examples/dependency-closure/README.md) | The destination is refused: a project root holding no `package.json` is shared settings rather than a package, and the workspace root contains every project |
| `A configured destination is stale` | [`callidescope.workspace.config.ts`](callidescope.workspace.config.ts) | Run the `write` configuration of whichever project owns the destination |
| `--check` rejected a value | [README, "The two flags"](README.md#the-two-flags) | The set is drawn from `breadth`, `depth`, and `reports`; an empty `--check` is refused |

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
│       └── tsconfig.json              what makes the directory a project
├── output/
│   ├── report.json                    the whole run, machine-readable
│   ├── report.md                      the printed trees, between anchors
│   └── diagram.md                     the same stacks, drawn
├── src/
│   ├── index.ts                       an `exported-function` root
│   └── main.ts                        a `module-bootstrap` root
└── testing/
    └── examples.integration.test.ts   every finding this guide documents
```

- Every directory under `examples/` is one example, readable on its own.
- **One of them is also a project.** `gated-leaf` holds a `tsconfig.json`,
  which is what makes a directory a project and therefore what lets a limit
  belong to it. It is named in the `examples` target's `--directories` rather
  than reached through the closure, and it may not gain a `package.json`: Nx
  infers a project from a nested one, after which a `tsconfig.json` and a
  `package.json` nested one directory apart collide with
  `@nx/enforce-module-boundaries`. `gated-leaf`'s guide says so in full.
- **No other example needed a project of its own.** A project-declared depth
  limit and a project-declared entry point are already demonstrated by this
  package's own root `callidescope.config.ts` — the root package itself has a
  `tsconfig.json`, so it was already a discoverable project before this
  package's examples were reworked as a set. `project-depth-limit` and
  `declared-entry-points` read from that root configuration and stay plain
  fixtures; only the exclusion criterion needed the extra isolation a nested
  project buys (a project-scoped `exclude` glob, provable only against a
  project boundary), which `gated-leaf` already supplied.
- **Its guide carries a generated block.** It declares a `write.markdown` of
  its own pointing at `README.md` under a `## 🔭 Callidescope` heading, and it
  is scoped, so its `README.md` holds one between `<!-- callidescope:start -->`
  and `<!-- callidescope:end -->`. Do not hand-edit inside those anchors —
  regenerate.
- **`src/` is a requirement, not a leftover.** The `module-bootstrap` and
  `exported-function` entry-point rules key on the literal paths `src/main.ts`
  and `src/index.ts`, so those two fixtures cannot live under `examples/` with
  the rest. This is the one structural difference from the three sibling
  `*-examples` packages, and this is why.
- `src/` is not covered by tests and should not be — see the comment in
  [`vitest.config.ts`](vitest.config.ts).

## Adding an example

- One directory under `examples/`, named for the behavior it demonstrates.
- Every callable demonstrates exactly one thing. A fixture doing two jobs makes
  both harder to point at.
- A `README.md` in that directory: `# <emoji> Title`, then the bold one-line
  claim, then `## Run it` with the trace command and where in `output/` to look,
  then the explanation, then `## Next` linking to the next example.
- A link in the reading order in [README.md](README.md)'s `## The examples`, and
  a `## Next` link from the example before it. Inserting into a reading order
  changes its neighbor: the example you inserted after must now link to yours,
  and yours to whatever it used to link to.
- A row in the lookup table above, so an agent handed a finding can get here
  from what the run printed rather than from the directory listing.
- An assertion in `testing/examples.integration.test.ts` in the same change. A
  fixture with no assertion is a claim, not an example.
- Regenerate `output/` — see [Changing a fixture](#changing-a-fixture) for the
  order, which matters.

## Do not fix a deliberately broken example

Most of this package is code that would fail review if it were real, and that is
the point:

- `deep-stack` and `forwarding-stack` both breach `maximumDepth` on purpose.
  `configuration/.callidescopeignore` is what keeps this package excluded from
  the inferred `gate` target altogether — the callidescope Nx plugin withholds
  `gate` from an excluded project, since it never traces one. Removing that
  entry stops the exclusion, so the plugin infers `gate` here the same as
  everywhere else, and these two fixtures fail it immediately.
- `computed-member` cannot be followed on purpose, which is what makes a depth a
  floor.
- `implementation-fan-out` exceeds the implementation-candidate cap on purpose.
- `entry-points` holds a callable nothing calls on purpose.
  `dependency-cruiser` reports `no-orphans` against it on every run — two tools
  independently noticing the same file is the example working, not a lint
  failure to chase.
- `frame-annotations` carries a `@deprecated` member and a signature past 80
  characters on purpose.
- `project-depth-limit` is six frames against the five this package declares for
  itself, on purpose — it is a finding under this package's own limit and would
  pass under the six the run supplies, which is the whole example.
- `gated-leaf` breaches both of the limits its own `callidescope.config.ts`
  declares, on purpose: four frames against three, and three direct callees
  against two. `maximumBreadth` has no default anywhere, so `--check breadth`
  needs some project in scope to declare one — this is the project that makes
  the refusal and the finding demonstrable side by side, and quieting it takes
  the example away with it.

One finding is not a fixture at all. `LoggerService.log` is reported at five
frames against the four `projects/logging` declares — a real stack in a real
package the closure reaches, not a fixture. Four is right there: the
whole-workspace run ignores calls to `LoggerService.*` and measures four, and
this run deliberately does not ignore them and measures five, so one declared
number is a pass in the gate and a finding in this report. Do not restructure
the logger to quiet this run, and do not raise its four — that buys headroom on
the gate that matters to tidy a fixture package.
[`dependency-closure`](examples/dependency-closure/README.md) is the example
that finding belongs to. The three dependency packages the closure reaches all
declare their own limits now; a finding that used to appear here —
`ConfigurationService.loadConfiguration` at eight frames against the run's
default six — is gone because `projects/ic-suite/codometer/codometer-configuration` declares eight,
and that guide reads it as the outcome rather than as drift.

**This package gates `reports`, not `depth`.** Adding `--check depth` to its
`examples` target would fail by design.

## Changing a fixture

The numbers in
[`testing/examples.integration.test.ts`](testing/examples.integration.test.ts)
are exact — callable count, edge count, every stack depth. That is deliberate: a
fixture whose meaning silently changes when the resolver changes is worse than
no fixture. Any edit under `examples/` or `src/` therefore takes three steps:

```bash
nx run callidescope-examples:typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=write   # first — see below
nx run callidescope-examples:examples:write                        # regenerate output/ and the three published sections
nx run callidescope-examples:vitest                                # update the expectations, then confirm
```

Lint **before** regenerating, never after. Every frame in every report carries a
`file:line`, and `eslint --fix` sorts class members — so adding one method moves
the line numbers of the ones after it, and a report written before that sort is
stale the moment it lands.

If a number moved and you did not intend it, the resolver changed and that is
the finding. Do not update the expectation until you know which change caused
it.

Numbers can also move with no edit here at all. The committed reports cover the
three projects the closure reaches, so a change to
`projects/ic-suite/callidescope/callidescope-configuration`, `projects/ic-suite/codometer/codometer-configuration`, or
`projects/logging` makes them stale. The `examples` target names those packages'
sources in its `inputs`, so the staleness is caught rather than cached over, and
the three steps above are the fix. Their READMEs are not named there: this run
measures those packages but publishes nothing into them.

A root `configuration/*.config.ts` moves them too, which is less obvious. Two of
those projects are in the closure only because this package's own
`eslint.config.ts` and `codometer.config.ts` spread the root ones, which import
`@codebase/logging/eslint` and `@codometer/configuration` — so removing an import
there drops a whole project from the committed reports. That glob is in `inputs`
for exactly that reason, and belongs there rather than in `shared-globals`.

The assertions in the test
suite are deliberately written against this package's **own** per-project report
for that reason — a sibling package gaining a method should not fail a suite
about fixtures.

## Key files

| File | What it is |
| ---- | ---------- |
| [README.md](README.md) | The human guide — how to read a stack, and how to act on each finding |
| [callidescope.workspace.config.ts](callidescope.workspace.config.ts) | Why this package's limits differ from the workspace's |
| [callidescope.config.ts](callidescope.config.ts) | What this package declares about itself — a complete project configuration, every field written out inline rather than spread from a shared default |
| [../callidescope-cli/README.md](../callidescope-cli/README.md) | The behavior being demonstrated |
| [../callidescope-configuration/README.md](../callidescope-configuration/README.md) | Every configuration field |
