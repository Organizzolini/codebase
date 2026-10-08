# 👔 Conformetry Examples — Agent Guide

Eleven runnable examples of [Conformetry](../conformetry-cli/README.md). Every
one is self-contained and executes in about a second, so **reproduce the
behavior here before reasoning about it in a real project**. A conformance
report against real code mixes the tool's behavior with that project's
conventions; these examples do not.

The three conformetry skills own the workflow —
[conformetry-generate](../conformetry-agents/skills/conformetry-generate/SKILL.md),
[conformetry-configure](../conformetry-agents/skills/conformetry-configure/SKILL.md),
[conformetry-validate](../conformetry-agents/skills/conformetry-validate/SKILL.md).
This file is where those skills point when a behavior needs to be _seen_ rather
than described.

## Run one

```bash
pnpm exec nx run conformetry-examples:<example-directory-name>
```

The target name is the directory name. Some exit non-zero on purpose; the table
below says which.

To run all eleven and have every exit code and quoted line checked:

```bash
pnpm exec nx run conformetry-examples:examples
```

Four of the per-example targets exit non-zero by design, which is why running
them as a plain batch could never be the gate — the aggregate checks each
against the outcome its own guide promises.

## Conformetry said X — open this example

| Report said | Read | Because |
| ----------- | ---- | ------- |
| `Missing file: …` | [drift-catalogue](examples/drift-catalogue/README.md) | The existence pass runs before any validator and covers every declared file, whatever its extension |
| `Missing directory: …` | [drift-catalogue](examples/drift-catalogue/README.md) | A missing directory is reported once, not once per file inside it |
| `Missing comment // 🎯 …` | [drift-catalogue](examples/drift-catalogue/README.md) | Section comments are requirements; add the comment, in the order the template declares it |
| `Missing comment /** … */` | [structural-not-textual](examples/structural-not-textual/README.md) | JSDoc is compared too, and deleting a declaration reports its documentation separately |
| `Missing ClassDeclaration "…"` | [drift-catalogue](examples/drift-catalogue/README.md) | The name is part of the structure; a renamed class carries the weight of every member it held |
| `Missing FirstStatement` | [drift-catalogue](examples/drift-catalogue/README.md) | A top-level declaration the template has and the instance does not — usually a deleted `export` |
| `Missing Identifier "…"` | [drift-catalogue](examples/drift-catalogue/README.md) | Something the template referenced is gone, often as a second finding from one deletion |
| `Missing VariableDeclaration "…"` | [structural-not-textual](examples/structural-not-textual/README.md) | A local the template itself declared was renamed. This _is_ a finding |
| `Missing line: …` | [language-validators](examples/language-validators/README.md) | The `text` fallback compares lines, and claims every extension the named validators do not |
| `Missing markdown heading: "…"` | [scoring-thresholds](examples/scoring-thresholds/README.md) | Markdown is compared as mdast structure — headings, lists, tables — not as prose |
| `Ambiguous instance: matches … equally well` | [ambiguous-attribution](examples/ambiguous-attribution/README.md) | Two templates tied and neither fits completely. Give them distinguishing files, or narrow the glob |
| `… matched no template` | [ambiguous-attribution](examples/ambiguous-attribution/README.md) | Either the instance drifted past recognition or the glob is wrong |
| `below threshold 100.0%` | [scoring-thresholds](examples/scoring-thresholds/README.md) | The default threshold is a perfect match; three levels can lower it, narrowest first |
| `meets threshold 75.0%` with findings printed | [scoring-thresholds](examples/scoring-thresholds/README.md) | A lowered threshold is permission to ship the drift, not a reason to stop showing it |
| `No instances were found.` | [nx-host](examples/nx-host/README.md) | Tag-scoped groups are invisible to the command-line host, which locates by glob alone |
| `MissingSubstitutionError: No value was supplied for …` | [failure-modes](examples/failure-modes/README.md) | Generation only: a template interpolates a placeholder nothing supplies. Declare it as a generator input, or ask the question with a `{{#section}}` instead |
| `Could not infer {{…}}: no instance node aligned with …` | [failure-modes](examples/failure-modes/README.md) | Validation found no instance text where the template uses that placeholder. Restore that text in the instance, or supply the value in the instance group's `substitutions` |
| `All checked files conform.` but the code is obviously wrong | [failure-modes](examples/failure-modes/README.md) | A `TODO` template comment is satisfied by any comment, on purpose |
| `Unknown generator "…"` | [two-directions](examples/two-directions/README.md) | `conformetry templates` is the only thing that answers which generators exist; a generator is addressed by its full name |

## I need to know whether X is a finding

| Change to an instance | Finding? | Shown by |
| --------------------- | -------- | -------- |
| Reformatting — quotes, line breaks, blank lines | No | [structural-not-textual](examples/structural-not-textual/README.md) |
| Adding a method, a field, an import, a comment | No | [structural-not-textual](examples/structural-not-textual/README.md) |
| Renaming a local the template declared | **Yes** | [structural-not-textual](examples/structural-not-textual/README.md) |
| Renaming a class, function, or exported constant | **Yes** | [drift-catalogue](examples/drift-catalogue/README.md) |
| Deleting an export | **Yes**, usually twice | [drift-catalogue](examples/drift-catalogue/README.md) |
| Deleting a section comment or a JSDoc block | **Yes** | [drift-catalogue](examples/drift-catalogue/README.md) |
| Rewording a comment the template wrote | **Yes** | [drift-catalogue](examples/drift-catalogue/README.md) |
| Rewording a comment the template marked `TODO` | No | [failure-modes](examples/failure-modes/README.md) |
| Leaving a template placeholder without a value | **Refused before comparison** | [failure-modes](examples/failure-modes/README.md) |
| Deleting a file, or a whole directory | **Yes** | [drift-catalogue](examples/drift-catalogue/README.md) |
| Changing a line in a `.toml`, `.gitignore`, or other unclaimed extension | **Yes** | [language-validators](examples/language-validators/README.md) |
| A trailing space markdown does not need | No | [language-validators](examples/language-validators/README.md) |

## I am writing or changing a configuration

| Question | Read |
| -------- | ---- |
| What are the minimum fields a generator needs? | [hello-template](examples/hello-template/README.md) |
| Where is a template "laid down" — which directory is the instance? | [hello-template](examples/hello-template/README.md) |
| What does a template get for free from `name`? | [case-variants](examples/case-variants/README.md) |
| How do I override a derived case variant? | [case-variants](examples/case-variants/README.md) |
| Why does validation need `substitutions` when `generate` has flags? | [case-variants](examples/case-variants/README.md) |
| How do I adopt a template without migrating every instance? | [scoring-thresholds](examples/scoring-thresholds/README.md) |
| Which of the three thresholds wins? | [scoring-thresholds](examples/scoring-thresholds/README.md) |
| How do I make a small template matchable inside a directory a big one claims? | [two-directions](examples/two-directions/README.md) |
| Should two generators declare the same instance glob? | [ambiguous-attribution](examples/ambiguous-attribution/README.md) — no |
| How do tag-scoped instance groups work? | [nx-host](examples/nx-host/README.md) |
| Which validator will handle this extension? | [language-validators](examples/language-validators/README.md) |
| What will be refused, and what is merely permissive? | [failure-modes](examples/failure-modes/README.md) |

## I am building a host

[embedding](examples/embedding/README.md) — the runtime packages driven
directly, with no CLI. Covers which modules to import, which service does what,
what the host itself owes (expanding globs into instances), where the adapters
are, and why the compiler must preserve decorator metadata.

## Exit codes, so a run can be scripted

| Example | Exit code | Why |
| ------- | --------- | --- |
| `hello-template` | 0 | Conforms |
| `case-variants` | 0 | Conforms |
| `structural-not-textual` | **1** | One of the two instances is missing an export |
| `drift-catalogue` | **1** | Five of the six instances are drifted, one per finding kind |
| `scoring-thresholds` | 0 | The drifted instance clears its lowered threshold, and its findings still print |
| `language-validators` | 0 | Conforms |
| `two-directions` | 0 | Listings, not validation |
| `ambiguous-attribution` | **1** | One instance ties between two templates |
| `nx-host` | 0 | The command-line host finds nothing to check |
| `embedding` | 0 | Conforms |
| `failure-modes` | **1** | The `TODO` half conforms; the placeholder nobody supplied is refused |

Every row is asserted by
[`testing/examples.integration.test.ts`](testing/examples.integration.test.ts),
which runs the commands each example's Nx target runs and checks both the exit
code and the text the guide quotes. If a guide and the tool ever disagree, that
suite fails.

## Layout

```text
conformetry-examples/
├── examples/
│   ├── tsconfig.json                   what lets Vite transform the NestJS instances
│   └── <name>/
│       ├── README.md                   the guide for this example
│       ├── conformetry.config.ts       its own generators and instance globs
│       ├── templates/                  what the generator renders
│       └── instances/                  what it rendered, or what drifted from it
└── testing/
    └── examples.integration.test.ts    every example, run and asserted
```

- Every example is self-contained. Nothing here requires reading anything else
  here first, which is the whole point of reproducing a behavior in this package
  rather than in a real project.
- **There is no `src/`**, and that is load-bearing: every tag-scoped instance
  glob in `configuration/conformetry.config.ts` is under `src/modules/`, so the
  absence of that directory is what keeps this repository's own conformance run
  from reaching the drifted fixtures — even though the package carries
  `framework:nestjs`, which is accurate because the embedding example boots a
  real Nest container.
- `examples/tsconfig.json` exists for the NestJS instances. Vite resolves a
  file's compiler options through the nearest tsconfig whose `include` claims it,
  so without it the decorators reach Node untransformed.

## Adding an example

- One directory under `examples/`, named for the question it answers.
- Its own `conformetry.config.ts`, `templates/`, and `instances/`. Do not reach
  into another example's fixtures — self-containment is the feature.
- A `README.md`: `# <emoji> Title`, then `## Run it` with the target and the
  output it prints, then the explanation, then `## Next` linking to the next
  example.
- An Nx target named for the directory, in `project.json`. The suite reads the
  command out of that target, so the target is the single definition of how the
  example runs.
- A row in the `## The examples` table in [README.md](README.md), a row in the
  exit-code table above, and an entry in `EXPECTATIONS` in
  `testing/examples.integration.test.ts`. An example added without an
  expectation fails the suite rather than going unchecked.

## Do not fix a deliberately broken example

Five instances in `drift-catalogue`, one in `structural-not-textual`, and one in
`ambiguous-attribution` are **broken on purpose**. Repairing them destroys the
example and fails the suite that expects the failure. If a conformance run in
this repository reports them, the instance globs are wrong, not the fixtures —
this package has no `src/` precisely so that the repository's own tag-scoped
globs cannot reach them.

`failure-modes` additionally holds a template asking for a value nobody supplies,
which is refused rather than rendered as a hole. That refusal is the example.

## Key files

| File | What it is |
| ---- | ---------- |
| [README.md](README.md) | The guided tour, and the `## The examples` index |
| [project.json](project.json) | One target per example, and the `examples` aggregate |
| [testing/examples.integration.test.ts](testing/examples.integration.test.ts) | Every example's expected exit code and quoted output |
