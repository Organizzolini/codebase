# 🗂️ Drift catalogue

One template, six instances: one that conforms, and one for each kind of drift
conformetry catches. This is the example to read to learn what a report looks
like before you have to read one under pressure.

## Run it

```bash
pnpm exec nx run conformetry-examples:drift-catalogue
```

The command exits non-zero. Absolute paths are shortened to `…` below; a real
run prints them in full.

```text
Conformance scores:
  ✗ …/instances/missing-comment (widget) — 34/35 requirements met (97.1%), below threshold 100.0%
  ✗ …/instances/missing-directory (widget) — 25/26 requirements met (96.2%), below threshold 100.0%
  ✗ …/instances/missing-export (widget) — 28/35 requirements met (80.0%), below threshold 100.0%
  ✗ …/instances/missing-file (widget) — 26/27 requirements met (96.3%), below threshold 100.0%
  ✗ …/instances/renamed-class (widget) — 25/35 requirements met (71.4%), below threshold 100.0%
  Total — 173/193 requirements met (89.6%) across 6 instance(s), 5 below threshold


  1. file: missing-comment.service.ts — 14/15 requirements met (93.3%)
     Instance: …/instances/missing-comment/missing-comment.service.ts
     Template: …/templates/widget/{{nameKebabCase}}/{{nameKebabCase}}.service.ts

     1. Missing comment // 🎯 Service
        Template: Line 1, Column 1
        Expected: `// 🎯 Service`
        Fix     : Add the comment // 🎯 Service to the instance file, in the order the template declares it.

  2. file: missing-directory.types.ts — 0/1 requirements met (0.0%)
     Instance: …/instances/missing-directory/inner/missing-directory.types.ts
     Template: …/templates/widget/{{nameKebabCase}}/inner/{{nameKebabCase}}.types.ts

     1. Missing directory: …/instances/missing-directory/inner
        Fix     : Create the directory …/instances/missing-directory/inner to match the template at …/templates/widget/{{nameKebabCase}}/inner.

  3. file: missing-export.constants.ts — 2/8 requirements met (25.0%)
     Instance: …/instances/missing-export/missing-export.constants.ts
     Template: …/templates/widget/{{nameKebabCase}}/{{nameKebabCase}}.constants.ts

     1. Missing FirstStatement
        Instance: Line 2, Column 1
        Template: Line 3, Column 1
        Weight  : 6 of the 8 requirements in this file
        Fix     : Add the missing FirstStatement to the instance file. See the template for the expected structure.

  4. file: missing-export.service.ts — 14/15 requirements met (93.3%)
     Instance: …/instances/missing-export/missing-export.service.ts
     Template: …/templates/widget/{{nameKebabCase}}/{{nameKebabCase}}.service.ts

     1. Missing Identifier "missingExportName"
        Instance: Line 9, Column 5
        Template: Line 9, Column 12
        Fix     : Add the missing Identifier "missingExportName" to the instance file. See the template for the expected structure.

  5. file: missing-file.constants.ts — 0/1 requirements met (0.0%)
     Instance: …/instances/missing-file/missing-file.constants.ts
     Template: …/templates/widget/{{nameKebabCase}}/{{nameKebabCase}}.constants.ts

     1. Missing file: …/instances/missing-file/missing-file.constants.ts
        Fix     : Create the file using the generator, or manually from the template at …/templates/widget/{{nameKebabCase}}/{{nameKebabCase}}.constants.ts.

  6. file: renamed-class.service.ts — 5/15 requirements met (33.3%)
     Instance: …/instances/renamed-class/renamed-class.service.ts
     Template: …/templates/widget/{{nameKebabCase}}/{{nameKebabCase}}.service.ts

     1. Missing ClassDeclaration "RenamedClassService"
        Instance: Line 4, Column 1
        Template: Line 4, Column 1
        Weight  : 10 of the 15 requirements in this file
        Fix     : Add the missing ClassDeclaration "RenamedClassService" to the instance file. See the template for the expected structure.
```

## The catalogue

Each instance is named after its own defect, so the report reads as an index.
`instances/conforming` is the control: it is not mentioned anywhere above.

| Instance | What was done to it | What is reported |
| -------- | ------------------- | ---------------- |
| `conforming` | Nothing | Nothing — a passing instance is silent |
| `missing-file` | Deleted `…​.constants.ts` | `Missing file:` — from the existence pass, before any validator runs |
| `missing-directory` | Deleted `inner/` | `Missing directory:` — reported once, not once per file inside it |
| `missing-export` | Kept the file, deleted its `export const` | `Missing FirstStatement`, weighing 6 of that file's 8 requirements, plus the identifier that referenced it |
| `missing-comment` | Dropped the `// 🎯 Service` section comment | `Missing comment // 🎯 Service` |
| `renamed-class` | Renamed the class | `Missing ClassDeclaration`, weighing 10 of that file's 15 requirements |

## How to read it

**Read the fraction, not the percentage.** `97.1%` and `96.2%` look
interchangeable, and `34/35` versus `25/26` says which one is a one-line fix.
The same three numbers — met, total, percentage — are printed at file, instance,
and total level.

**Read the weight.** `Weight : 10 of the 15 requirements in this file` is what
separates the expensive drift from the trivial. A missing class carries every
member it held; a missing comment carries itself. Nobody maintains a table of
weights — the weight _is_ the size of the subtree that went missing.

**Read the `Fix` line last, and trust it.** It names the concrete action, which
is what makes these reports actionable by a person or an agent without either
having to open the template.

**Two findings can come from one edit.** `missing-export` proves it: deleting a
declaration also deletes whatever referenced it.

## Next

[scoring-thresholds](../scoring-thresholds/README.md), for what to do when you
cannot fix all of this today.
