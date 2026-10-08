# 📉 Scoring and thresholds

Validation reports **how much** of its template an instance honours, not just
whether it does — and a threshold is what turns that number into a verdict.
This example holds one group of instances to the default `1` and another to
`0.75`, so you can watch findings print for an instance that still passes.

## Run it

```bash
pnpm exec nx run conformetry-examples:scoring-thresholds
```

The command exits **zero**.

```text
Conformance scores:
  ✓ …/instances/migrating/legacy (dossier) — 18/20 requirements met (90.0%), meets threshold 75.0%
  Total — 38/40 requirements met (95.0%) across 2 instance(s), 0 below threshold


  1. file: legacy.md — 2/3 requirements met (66.7%)
     Instance: …/instances/migrating/legacy/legacy.md
     Template: …/templates/dossier/{{nameKebabCase}}/{{nameKebabCase}}.md

     1. Missing markdown heading: "Contents"
        Instance: Line 4
        Expected: `Contents`
        Fix     : Add the heading "Contents" to the instance file.

  2. file: legacy.service.ts — 14/15 requirements met (93.3%)
     Instance: …/instances/migrating/legacy/legacy.service.ts
     Template: …/templates/dossier/{{nameKebabCase}}/{{nameKebabCase}}.service.ts

     1. Missing comment // 🌎 Public Methods
        Template: Line 5, Column 3
        Expected: `// 🌎 Public Methods`
        Fix     : Add the comment // 🌎 Public Methods to the instance file, in the order the template declares it.
```

Two things to notice. `instances/strict/tidy` conforms, so it is not mentioned.
And `instances/migrating/legacy` is marked `✓ … meets threshold 75.0%` while
its two findings are printed in full: **a lowered threshold is permission to
ship the drift, not a reason to stop showing it.**

## The three levels

The configuration sets two of them:

```ts
{
  name: "dossier",
  templatePath: `${EXAMPLE_PATH}/templates/dossier`,
  threshold: 1,                                            // the generator
  instances: [
    { patterns: [`${EXAMPLE_PATH}/instances/strict/*`] },   // inherits 1
    { patterns: [`${EXAMPLE_PATH}/instances/migrating/*`], threshold: 0.75 },
  ],
}
```

The third is the `--threshold` flag, and it is the **weakest** of the three:

```text
instances[].threshold ?? generator.threshold ?? runThreshold ?? 1
```

The example's second command proves it. Running with `--threshold 0.5` changes
nothing at all, because both narrower levels are already set:

```bash
pnpm exec nx run conformetry-cli:start -- validate --config projects/ic-suite/conformetry/conformetry-examples/examples/scoring-thresholds/conformetry.config.ts --threshold 0.5
```

```text
  ✓ …/instances/migrating/legacy (dossier) — 18/20 requirements met (90.0%), meets threshold 75.0%
```

| Level | Where | Applies to |
| ----- | ----- | ---------- |
| Instance group | `instances[].threshold` | Only the paths that group's globs locate |
| Generator | `threshold` on the generator | Every instance of that template |
| Run | `--threshold` | Every instance the run touches, unless something narrower said otherwise |

A level nobody set stays unset rather than being filled with the default, which
is what lets a `--threshold` reach an instance whose generator has no opinion.
The default of `1` is applied only at the end of the chain.

When two groups locate the same instance with different thresholds, the
**strictest** wins: nothing makes one group more specific than another, so
letting order decide would mean a lenient group could silently relax a bar
someone else set.

## Why this is the feature that makes a new template bearable

Introducing a template to an existing codebase means every directory it claims
is instantly non-conforming. Without thresholds the choice is to migrate the
whole workspace in one change or not adopt the template at all.

With them, the directory still being migrated is held to `0.75` while every
other instance of the same template stays strict — and the findings for the
lenient directory keep printing, so the migration stays visible instead of
being declared done.

## Next

[language-validators](../language-validators/README.md), for what gets compared
in each file format.
