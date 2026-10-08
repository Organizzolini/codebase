# 📏 Project depth limit

**Six frames: a finding under the five this package declares, and not one
under the six the run supplies as its default.**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read `deepStacks` in [`output/report.json`](../../output/report.json).
`ProjectDepthLimitService.judge` carries `"limit": 5` — this package's own
number, not the run's.

`ProjectDepthLimitService.judge` heads a chain of six ordinary frames. Six is
what `limits.maximumDepth` reads in
[`callidescope.workspace.config.ts`](../../callidescope.workspace.config.ts),
the number every project in this run falls back to if it spreads
`projectDefaults` and overrides nothing — which is not this package. Six frames
would pass six.

This package declares five for itself, in the
[`callidescope.config.ts`](../../callidescope.config.ts) at its root, so the
same chain is a finding. Nothing about the code changed — only which file the
number was written in.

## What a project may declare, and how

A project configuration is a `callidescope.config.ts` at the project's own root
— the directory holding the `tsconfig.json` that makes it a project. It may set
`entryPoints`, `limits.maximumDepth`, `limits.maximumBreadth`, and `exclude`,
and nothing else. A file setting anything else is refused by name, before
anything is traced.

**Write only the limits you override:**

```ts
limits: { maximumDepth: 5 }
```

Nothing is lost by writing the override alone. Limits fall back one at a time
rather than as an object, so a limit a project does not name still comes from
the run.

## Why two configuration files sit at this package's root

Because the two roles are read differently, and one file cannot hold both.
[`callidescope.workspace.config.ts`](../../callidescope.workspace.config.ts) is
the _workspace_ configuration this run is handed — output destinations, and the
default limits every project falls back to. It carries the
longer name because those fields are workspace-only, so being discovered as this
package's own project configuration would refuse the run. Its doc comment works
through that in full.

[`callidescope.config.ts`](../../callidescope.config.ts) is this _project's_
own, found the way every project's is: by that exact name, at the project root.

## Next

[gated leaf](../gated-leaf/README.md).
