# 🌉 Dependency closure

**`this.configurationService.resolveConfiguration(…)` → a frame in another package**

## Run it

```bash
nx run callidescope-examples:examples
```

No finding — four frames is under the limit. Read the stack in
[the section at the bottom of the package guide](../../README.md#-callidescope),
where the last two frames carry a `packages/ic-suite/callidescope/callidescope-configuration` path;
what it proves is asserted in
[the test suite](../../testing/examples.integration.test.ts).

The hop itself is the one
[`injected-dependency`](../injected-dependency/README.md) already made — a
property whose type names the declaration — except that this time the
declaration lives in a different package. `ConfigurationService` is declared in
`@callidescope/configuration`, which this package depends on.

That the call lands on a frame at all is a fact about **which projects the run
built a program for**. A project's own `tsconfig.json` never lists the packages
it imports, so a run pointed at one directory used to leave every call out of
that directory in code no traced project owned — and a call into code nothing
owns has nowhere to land. A scoped run now also builds a program for every
project its imports transitively reach — its **dependency closure** — and the
call resolves into real code instead of stopping at the package boundary:

```text
🚀 DependencyClosureService.allowsDepth(…): boolean [.../dependency-closure/dependency-closure.ts:32]
  └─> DependencyClosureService.readDepthLimit(…): number [.../dependency-closure/dependency-closure.ts:24]
    └─> ConfigurationService.resolveConfiguration(…) [packages/ic-suite/callidescope/callidescope-configuration/.../configuration.service.ts:431]
      └─> ConfigurationService.resolveEntryPoints(…) [packages/ic-suite/callidescope/callidescope-configuration/.../configuration.service.ts:181]
```

The last two `file:line` pairs are the whole point: they are in a package this
run was never pointed at.

**The same stack is depth 4 with the closure and depth 2 without it**, which is
what [the test suite](../../testing/examples.integration.test.ts) asserts: it
traces the fixtures a second time with `packages/ic-suite/callidescope/callidescope-configuration`
excluded, and the two dependency frames are gone. Depth is measured over the
code a run can see, so a run that cannot see a dependency reports a stack that
ends where the package does — an answer that is not wrong so much as scoped, and
scoped in a way nothing in the report said out loud.

Five projects are traced when this run starts here. Two of them are named as
starting roots and three arrive through the closure:

| Project | Reached because |
| ------- | --------------- |
| `packages/ic-suite/callidescope/callidescope-examples` | Named — the directory the run was pointed at |
| `.../../examples/gated-leaf` | Named — a nested project [`gated-leaf`](../gated-leaf/README.md) explains, and says why it is named rather than reached |
| `packages/ic-suite/callidescope/callidescope-configuration` | The fixture above imports it, and [`callidescope.workspace.config.ts`](../../callidescope.workspace.config.ts) imports a type from it |
| `packages/ic-suite/codometer/codometer-configuration` | Reached through the shared `configuration/codometer.config.ts` that this package's own [`codometer.config.ts`](../../codometer.config.ts) spreads |
| `packages/logging` | Reached through the shared `configuration/eslint.config.ts`, which imports `@codebase/logging/eslint` |

The last two arrive through the shared configuration directory the closure
refuses to enter, which is not the contradiction it looks like. Refusing
`configuration/` as a _destination_ keeps that directory from being traced; it
does nothing to the files it imports, which resolve to their own packages and
join the closure like anything else.

## What widens a closure, and what does not

A closure is derived from what the compiler really read — every file in a
project's program, not the dependency list its `package.json` declares. A
manifest says what a package may import; the program says what it did. The two
part company in both directions: a declared dependency nothing imports never
widens a closure, and a package no manifest here names widens one all the same
if some file the compiler read imported it — which is how `packages/logging`
gets into this run, through a shared configuration file rather than through
anything this package declares.

A type-only import is enough. `callidescope.workspace.config.ts` imports a type from
`@callidescope/configuration` and nothing else, and the compiler reads the
package all the same — so the dependency would be in this closure even without
the fixture above.

Two kinds of destination are refused, because without them a single leaf package
drags the whole workspace in:

- **A project root holding no `package.json`.** A directory holding only a
  `tsconfig.json` is where a repository keeps shared settings, and shared
  settings are read by every project rather than depended on by any. This run
  exercises that rule: this package's program really reads four files under
  [`configuration/`](../../../../../../configuration) — the shared `eslint.config.ts`,
  `vitest.config.ts`, and `codometer.config.ts` that this package's own three
  spread, plus a type declaration one of its `paths` entries names. Admit that
  directory and its program covers every configuration file in it, which reaches
  every toolchain the repository configures.
- **The workspace root.** A project whose root contains every other project
  cannot be a meaningful dependency of any of them.

Neither rule touches a **starting** project. Naming a directory is the caller
saying it should be traced, and a run naming no directory at all names every
project — so both are traced in full when asked for directly, and a
whole-workspace run's findings are exactly what they were.

What the rules cost is that a call into a refused directory resolves to no
frame, the way every call out of a package did before closures existed.

## What a closure never widens

Publishing. A run writes a `## 🔭 Callidescope` section for the projects it was
**scoped** to and for no others, so this run publishes into the three guides of
its three starting projects and leaves the three dependency packages alone —
measurement reaches into a dependency, publishing does not. A closure that
widened both would have this target rewriting an anchor block in three packages
that never asked for it, and `nx run codebase:callidescope:write` — which reads
different limits — writing the opposite content back into the same three
blocks on its next run.

The whole-workspace run is unaffected, for the same reason the two rules above
leave a starting project alone: a run naming no directory has every project as a
scoped one, so every project's section is still published.

## Next

[computed member](../computed-member/README.md).
