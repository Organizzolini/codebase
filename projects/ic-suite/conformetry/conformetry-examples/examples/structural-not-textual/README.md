# 🌳 Structural, not textual

Conformetry's central claim is that comparison is structural: an instance is
compared as a syntax tree, not as text. This example is the pair that proves
it — one instance reformatted past recognition that **passes**, next to one
missing a single export that **fails**.

## Run it

```bash
pnpm exec nx run conformetry-examples:structural-not-textual
```

```text
Conformance scores:
  ✗ …/instances/dropped-export (report) — 29/36 requirements met (80.6%), below threshold 100.0%
  Total — 65/72 requirements met (90.3%) across 2 instance(s), 1 below threshold


  1. file: dropped-export.service.ts — 28/35 requirements met (80.0%)
     Instance: …/instances/dropped-export/dropped-export.service.ts
     Template: …/templates/report/{{nameKebabCase}}/{{nameKebabCase}}.service.ts

     1. Missing FirstStatement
        Instance: Line 4, Column 1
        Template: Line 16, Column 1
        Weight  : 6 of the 35 requirements in this file
        Fix     : Add the missing FirstStatement to the instance file. See the template for the expected structure.

     2. Missing comment /** Title the report carries when nobody sets one. */
        Template: Line 15, Column 1
        Expected: `/** Title the report carries when nobody sets one. */`
        Fix     : Add the comment /** Title the report carries when nobody sets one. */ to the instance file, in the order the template declares it.
```

The command exits non-zero. `instances/reformatted` is absent from the report
entirely, which is the whole point: a conforming instance is not mentioned.

## What passes

`instances/reformatted/reformatted.service.ts` differs from the template in
three ways at once, and none of them is a finding:

- **Formatting.** Single quotes where the template has double, a one-line
  method body, no blank line before the `return`.
- **An added member.** A `count` method the template never asked for.
- **An added comment.** Three lines of commentary the template does not have.

A template is a floor, not a ceiling. It says what an instance must have, so
anything extra is free.

## What fails

`instances/dropped-export/dropped-export.service.ts` is a faithful copy of the
template with one line deleted — the exported `…Title` constant. That single
deletion produces **two** findings, and this is where the weighting shows:

- `Missing FirstStatement` carries `6 of the 35 requirements in this file`,
  because a deleted declaration costs the whole subtree it stood for.
- `Missing comment` is the JSDoc that documented it, one requirement.

## One caveat worth knowing

`@conformetry/cli`'s README says renaming a local does not fail validation.
That is not quite right, and this example is where you would find out: a local
the **template itself declares** is part of the structure being compared, so
renaming it _is_ a finding.

```text
1. Missing VariableDeclaration "joined"
   Weight  : 7 of the 35 requirements in this file
```

`instances/reformatted` therefore keeps the template's `joined` and reformats
everything else. What is genuinely free is formatting, added members, and added
comments — not renaming something the template named.

## Next

[drift-catalogue](../drift-catalogue/README.md), for one instance per kind of
finding, and what a real report reads like.
