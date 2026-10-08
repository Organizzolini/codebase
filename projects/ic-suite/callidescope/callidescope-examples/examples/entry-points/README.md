# 🚀 Entry points

**One fixture per root kind.**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read `entryPointCount` in the `projects/ic-suite/callidescope/callidescope-examples` entry of [`output/report.json`](../../output/report.json)'s `projects`, and the `🚀` lines in [`output/report.md`](../../output/report.md) for the roots deep enough to be reported. The top-level summary counts the closure's dependency packages too, so it is the wrong place to look for the kinds below.

Depth is only meaningful relative to a root, and most code in a repository like
this one is called by a framework rather than by the repository. So roots are
named by rules, and every rule has a fixture — plus one kind that is no rule at
all, which [`declared-entry-points`](../declared-entry-points/README.md) is for:

| Kind | Fixture | Rule |
| ---- | ------- | ---- |
| `decorated-method` | `EntryPointsService.readReport` | Carries `@Get()`, one of the configured decorators |
| `lifecycle` | `EntryPointsService.onModuleInit` | A NestJS lifecycle method name |
| `module-bootstrap` | `bootstrap` in [`src/main.ts`](../../src/main.ts) | A function named `bootstrap` or `main` in `src/main.ts` |
| `exported-function` | `normalizeExampleLabel` in [`src/index.ts`](../../src/index.ts) | Exported from the barrel |
| `orphan-root` | `summarizeOrphanedWork`, here | Nothing calls it |
| `declared` | [`DeclaredEntryPointsService.collect`](../declared-entry-points/README.md) | No rule at all — a project named its address |

## Why two of them live in `src/`

The bootstrap and barrel rules key on the **literal paths** `src/main.ts` and
`src/index.ts`, so those two fixtures cannot move into this directory with the
rest. They are the only files in this package outside `examples/`, and that is
why.

## Orphan promotion is a safety net, not a feature

Without it, a missing entry-point rule removes a whole subtree from every
measurement in silence. With it, the subtree surfaces under a root that says
"nothing claimed this" — and an orphan is either dead code or a rule that needs
adding, both of which are worth knowing.

Most stack heads in _this_ package are orphan roots, because fixtures have no
framework to call them. `dependency-cruiser` reports `no-orphans` against this
file on every run, which is two tools independently noticing the same thing.

## Next

[declared entry points](../declared-entry-points/README.md).
