# 🧭 One folder at a time

Codometer measures **one directory** and knows nothing about workspaces or
project graphs. With no `--config`, the configuration is found by walking
upward and taking the **first** file found — and the command line carries no
`--directory` flag, so which directory is measured is decided entirely by
where you run it from.

## Run it

```bash
# examples/discovery/nested carries its own configuration, and it wins:
# one badge, "Configurations", and none of this package's counters.
cd examples/discovery/nested
codometer

# One folder up carries none, so the search continues to this package's:
# "Service Files" and "Unit Tests" return, "Configurations" does not — and so
# does the package's own "Corpus" target, now reported as an empty match
# rather than a size, since this folder holds no examples/corpus/.
cd examples/discovery
codometer
```

## What is here

```text
discovery/
└── nested/
    └── codometer.config.ts    the nearest configuration, which wins outright
```

The nearest one wins outright; nothing from a further ancestor is folded in,
because a merged configuration leaves a limit that never applied looking exactly
like one that did.

Three configuration files sit above that nested one — this package's, the
workspace root's, and the file the root one re-exports — and a run in
`examples/discovery/nested` takes nothing from any of them.

## A configuration is one plain object, wherever it is discovered from

A configuration file authored as a function is no longer recognized — every
file is a plain object, resolved once and reused however it was reached.
This package's own [`codometer.config.ts`](../../codometer.config.ts) used to
be a function for exactly the reason `nested`'s wins here: it branched on
whether the folder being measured was the package root itself (where the
corpus is a size-gated `Corpus` target) or a folder beneath it (where it was
not). That branch is gone along with the capability, so the same file now
answers both cases identically, `Corpus` target included.

Run the second command above and see it: the run still exits `0` — nothing
here asks for `--check` or `--output-*`, and a bare run only _reports_ a
failure rather than gating on it — but standard error now names a failed
metric alongside the badges, `Target "Corpus" matched no files, and a limit is
written against its "size" metric`. That is a real behavior change from the
old function-based configuration, not a bug in this example: a folder
answered by the package's configuration but not equal to it now always
resolves the same `Corpus` target, empty or not.

## Next

[staleness](../staleness/README.md), the last example, and the one that is a
warning rather than a feature.
