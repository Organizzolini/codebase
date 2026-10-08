# 📣 Declared entry points

**Two roots in one class: one nothing calls, one the project named.**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read the `projects/ic-suite/callidescope/callidescope-examples` entry of
[`output/report.json`](../../output/report.json)'s `projects` and find the two
stacks this file heads. `DeclaredEntryPointsService.publish` is
`"entryPointKind": "orphan-root"` and three frames deep;
`DeclaredEntryPointsService.collect` is `"entryPointKind": "declared"` and two.

`publish` is a root because nothing calls it — the safety net
[`entry-points`](../entry-points/README.md) is about. `collect` has a caller,
`publish`, so no rule promotes it and it would head no stack at all. It is a
root because this package's
[`callidescope.config.ts`](../../callidescope.config.ts) names its address:

```ts
entryPoints: {
  addresses: [
    "projects/ic-suite/callidescope/callidescope-examples/examples/declared-entry-points/declared-entry-points.ts#DeclaredEntryPointsService.collect",
  ],
},
```

The address is the same `<file>#<qualified-name>` form the `depth` and `breadth`
commands take and every stack frame prints, so one can be copied out of a report
straight into a configuration.

## Why declaring is not optional for a package low in the graph

A stack is filed under the project owning its **root**, and most of what a
package publishes is called from above rather than from inside. So a package
that declares nothing roots nothing, and a project that roots nothing measures
zero however deep its code runs — which makes any limit on it gate nothing at
all. [`gated-leaf`](../gated-leaf/README.md) is that case, worked through as its
own project.

Declaring an address is how a package states the surface it means to be measured
on, rather than being measured on whatever happens to have no caller.

## Declared addresses add roots; they never take any away

Three things hold at once, and the order they run in is what makes them
compatible:

| Pass | Why it sits there |
| ---- | ----------------- |
| 1. The existing rules | Declaring one root suppresses no decorated method, lifecycle hook, bootstrap, or barrel export — and a callable a rule already rooted keeps the kind saying _why_ something calls it |
| 2. Declared addresses | They root whatever the rules did not reach, which is the whole of what they are for |
| 3. Orphan promotion | A root somebody forgot to declare surfaces as an orphan instead of vanishing |

A declared address that a rule would also have found is one root, not two:
roots are deduplicated by the callable, never by the text that named it, and
the earlier pass keeps its kind. Declaring `EntryPointsService.readReport` would
change nothing — it is `decorated-method` and stays that way.

## A declared address that resolves to nothing fails the run

By design, and it is the highest-value refusal in the whole feature. Rename the
callable without editing the address and the run stops before it prints or
writes anything:

```text
🔭 Rejected a project configuration {"reason":"projects/ic-suite/callidescope/callidescope-examples/examples/gated-leaf
declares an entryPoints.addresses entry that resolves to nothing:
\"…/gated-leaf.ts#GatedLeafService.readMissing\". Check the file path and the qualified name
callidescope prints for it in a stack."}
```

It names the project that declared it, the field, and the address. An address
matching more than one declaration is refused the same way, with the candidates
rendered as addresses — the same rendering `depth` and `breadth` print, so what
you are handed here and what you are handed at a prompt are one thing said one
way.

Without that refusal a rename silently drops a root, the project's measured
depth quietly falls, and a gate loosens in the one commit nobody would think to
check it in.

## Next

[deep stack](../deep-stack/README.md).
