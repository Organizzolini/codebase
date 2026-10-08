# 🎯 Targets

A **target** is a named set of files, addressed by glob — declared under the
configuration's `inputs` array, which is what `targets` used to be called.
That is what lets one measure compiled output: something that lives outside
the measured directory, is named by a `.gitignore`, or both.

## Run it

```bash
cd examples/corpus
codometer --config ../targets/codometer.config.ts
```

## What is here

```text
targets/
├── codometer.config.ts   five targets over one corpus
├── reordered.config.ts   the same four, every include written backwards
└── ignored.config.ts     a target reaching into an ignored directory
```

| Target | Declares | Files |
| ------ | -------- | ----- |
| `codebase` | the directory itself, ignore rules in force | 28 |
| `Compiled` | `directory: ".."`, `include: ["compiled/**/*.js"]` | 2 |
| `Compiled Without Vendor` | the same, plus `"!compiled/**/vendor.js"` | 1 |
| `Sources` | `include: ["typescript/**/*.ts"]`, `exclude: ["**/*.test.ts"]` | 8 |
| `Manifests` | `directory: ".."`, reaching the package's own manifests | 2 |

The `codebase` row against the `Compiled` row is the whole argument for targets:
28 files, none of them the two that a build produced, and a target that sees
exactly those two.

## Negations are a set, not a sequence

**Negations form one set applied to the whole target.** They are not read in
order, so rearranging the array cannot change what the target holds.
[`reordered.config.ts`](reordered.config.ts) is the same four targets with every
`include` written backwards, and the test asserts the two reports name the same
files — which is the only honest way to state a property about an ordering
nobody can see.

## Where ignore rules stop

[`ignored.config.ts`](ignored.config.ts)

`.gitignore` is already in force for the codebase target — discovery reads every
one it walks past, and never invokes git. A declared target's globs are the
exception. Try it:

```bash
cp -R projects/ic-suite/codometer/codometer-examples/examples/compiled projects/ic-suite/codometer/codometer-examples/examples/corpus/generated
cd projects/ic-suite/codometer/codometer-examples/examples/corpus
codometer --config ../targets/ignored.config.ts
rm -rf projects/ic-suite/codometer/codometer-examples/examples/corpus/generated
```

`codebase` still reports 28 files — the copy is invisible to it, because
`examples/corpus/.gitignore` names `generated/`. `Ignored Output` reports the 2
that discovery refused to walk into. That asymmetry is the entire reason a size
gate on a build directory can exist.

The directory is empty in the repository rather than committed, because a file
that is both tracked and ignored makes `git add` fail for everyone afterwards —
which breaks the pre-commit hook on every later change, not just the one that
introduced it.

## Dot files need spelling out

**Dot files are excluded unless a glob spells one out.** The `Corpus` target
this package gates itself on includes `examples/corpus/**` and holds 27 files —
the samples, and not the `.gitignore` beside them. The `codebase` target in the
table above holds 28, because a bare directory measurement walks into dot files
like any other.

## Next

[compression](../compression/README.md), for what a target's `size` metric
really measures.
