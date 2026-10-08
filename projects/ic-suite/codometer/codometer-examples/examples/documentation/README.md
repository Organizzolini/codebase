# 📗 Documentation limits

A **comment budget** is how long a comment may run, and it is now one of the
three things a custom statistic's counter can select — `comment`, alongside
`patterns` and `symbols`. Naming `kind` measures a documented declaration's
JSDoc-style comment for that declaration kind; leaving it off measures a
plain comment block, in the language `language` names or in every language
that has comments. Either way, the counter is gated the same way any other
custom statistic is — an ordinary `limits[]` entry addressing its
`custom.<label>` metric path, whose value is a **count** of the blocks that
broke the selector's own maximum, not the length itself.

## Run it

```bash
cd examples/corpus
codometer --config ../documentation/codometer.config.ts --check limits
```

## What is here

```text
documentation/
├── codometer.config.ts       a per-kind JSDoc comment budget, one counter per kind
├── comments.config.ts        one budget per language, across every `#`-style language
└── yaml-comments.config.ts   a YAML comment budget carrying two maxima
```

It is opt-in, and gated by the same `--check limits` flag as every other
limit — there is no separate flag.

Under `codometer.config.ts`, only two of the four kind counters find a
breach: `custom.Class Comment Budget` counts one — `CatalogService`, whose
eight-line overview is longer than a class's 4 — and
`custom.Method Comment Budget` counts one — `Receipt.blank`, whose seven-line
note is longer than a method's 2. `custom.Interface Comment Budget` and
`custom.Property Comment Budget` both count zero. A counter that holds is
still measured, at zero; it is a breaching declaration that is named, by
file, line, and measured length, in the metric's own `instances`.

## YAML comment blocks

```bash
cd examples/corpus
codometer --config ../documentation/yaml-comments.config.ts --check limits
```

That configuration's counter names `language: "yaml"` and no `kind`, so not
one JSDoc comment is measured — a plain comment block and a documented
declaration's comment are enabled separately on purpose, even sharing every
other field name.

A **block** is the run of `#` lines a reader takes as one thought. A blank line
ends one, and a comment trailing a value is never part of the block above it.
Comments come from the tokenizer rather than the text, so a `#` inside a quoted
scalar stays a character in a string.

The corpus holds exactly **one** block — the note above `pipeline.yaml`'s
anchor — and this counter carries two maxima for it: one line, and five
words. The two disagree — one line against a maximum of one holds, while
twelve words against a maximum of five breaches — which is why the maxima are
separate fields rather than one `maximum` steered by a `unit`. But both
maxima belong to **one counter**, so a block that breaches either is one
breach, not two: the counter's `custom.YAML Comment Budget` metric counts 1,
with one instance at `yaml/pipeline.yaml:2`, measured at 12 — the words
figure that broke its budget.

Both kinds of budget — one naming `kind`, one naming `language` — reach the
report through one channel and render the same way; the metric's `label`, not
a `kind` field on the instance, is what says which counter found it.

## Every language, one budget each

```bash
cd examples/corpus
codometer --config ../documentation/comments.config.ts --check limits
```

There is no longer a shared top-level budget a language can override a field
of — every language gets its own `comment` selector, one custom statistic
apiece, so "every language at three words except shell at eight" is written
out once per language. Each limit reads `value: 0`: no block belonging to
that counter may breach.

The gate's own diagnostic names each breached metric and the **count** it
measured — seven counters, each at `"measured":1` against a limit of 0 —
because a limit's value counts breaching blocks. **Which** block broke which
budget is in the report, in each metric's own `instances`:

```bash
cd examples/corpus
codometer --config ../documentation/comments.config.ts --format json
```

```json
{
  "instances": [{ "file": "css/theme.css", "line": 1, "measured": 12 }],
  "limits": [{ "breached": true, "label": null, "severity": "fail", "value": 0 }],
  "name": "codebase.custom.CSS Comment Budget",
  "path": "custom.CSS Comment Budget",
  "unit": null,
  "value": 1
}
```

Six more read exactly the same way, one instance apiece:
`custom.HCL Comment Budget` at `hcl/network.tf:1` measured 12,
`custom.Python Comment Budget` at `python/inventory.py:7` measured 10,
`custom.Shell Comment Budget` at `shell/release.sh:2` measured 11,
`custom.SQL Comment Budget` at `sql/reporting.sql:1` measured 7,
`custom.TOML Comment Budget` at `toml/service.toml:1` measured 5, and
`custom.YAML Comment Budget` at `yaml/pipeline.yaml:2` measured 12.
`custom.TypeScript Comment Budget` is the one that holds, at `value: 0` with an
empty `instances`.

`shell/release.sh`'s **second** block, at line 8, measures six words and holds
under the loosened eight-word budget — it is absent from
`custom.Shell Comment Budget`'s `instances` rather than listed as a breach.
`custom.TypeScript Comment Budget` **holds**, at 0, with no instance at all:
the corpus's TypeScript and JavaScript sources carry only JSDoc comments, and
a `comment` selector naming no `kind` skips exactly those, so this counter's
own `count` never rises above its `value: 0` limit — what is absent is as
informative as what breaches.

And `release.sh`'s counted block starts on line **2**, not line 1: a `#!`
shebang is never a comment, and without that rule every shell script opening
with one would measure a block whose first word is `!/usr/bin/env`.

Python, YAML, CSS, and TypeScript/JavaScript's non-JSDoc comments are read by a
real parser or tokenizer — `tokenize` in the Python subprocess, the `yaml`
package's CST, postcss's own parse, the TypeScript compiler's scanner — so none
of the four mistakes a comment marker inside a string literal for a comment.
Shell, TOML, SQL, and HCL use a line scanner instead (SQL through the same
patterns `SqlService` already strips comments with) that cannot tell the two
apart, exactly as those analyzers' own `comments` counters already cannot. HCL
is the only language read for all three of its comment markers at once — `#`,
`//`, and `/* */`.

## What is absent is as informative

A module-level `const`, including one holding an arrow function, is not a
documentable declaration and breaches no `kind`-based counter. So `priceLine`
and `DEFAULT_CURRENCY` never appear in any counter's `instances`, whatever
comments they carry.

## Next

[write-check](../write-check/README.md), for turning a breach into a gate.
