# 🕳️ Failure modes worth showing on purpose

Two templates that ask for something the configuration does not give them. One
is a design decision and conforms. The other used to conform too, silently —
that is now an error, and this example is the reproduction.

## Run it

```bash
pnpm exec nx run conformetry-examples:failure-modes
```

The first command exits zero and the second exits non-zero, so the target as a
whole exits non-zero.

## 1. A `TODO` comment is a prompt, not text to copy

The `todo-comment` template carries one:

```ts
// 🎯 Service

// TODO: say what this service is for
/** Runs the {{nameKebabCase}} work. */
export class {{namePascalCase}}Service {
```

**A template comment containing `TODO` is treated as a prompt rather than text
to copy, so any instance comment satisfies it.** `instances/documented` answers
it with something else entirely, and conforms:

```bash
pnpm exec nx run conformetry-cli:start -- validate --config packages/ic-suite/conformetry/conformetry-examples/examples/failure-modes/conformetry.config.ts --instances packages/ic-suite/conformetry/conformetry-examples/examples/failure-modes/instances/documented
```

```text
All checked files conform.
```

```ts
// 🎯 Service

// Owned by whoever picks it up next.
/** Runs the documented work. */
export class DocumentedService {
```

This one is deliberate, and it is what lets a template say _write something
here_ without dictating what. `// 🎯 Service` in the same file is not a `TODO`,
so it is required verbatim — [drift-catalogue](../drift-catalogue/README.md)
shows what dropping it reports.

The comment still has to be **there**, though. Delete the instance's line
entirely and the file loses a requirement:

```text
  1. file: documented.service.ts — 13/14 requirements met (92.9%)

     1. Missing comment /** Runs the documented work. */
        Expected: `/** Runs the documented work. */`
```

Note which comment is named: the remaining ones slide up into the slots the
template declared, and the last one is reported missing. The count and the
order are part of the comparison even when one entry's text is not.

## 2. A placeholder nobody supplied, and nothing in the instance reveals

The `missing-input` template asks for `{{owner}}`:

```markdown
# {{namePascalCase}}

## Ownership

Owner: {{owner}}
```

Nothing supplies it. `owner` is not a declared input, and the instance group
carries no `substitutions` entry for it. Validation then tries to read the
value from the instance: it renders a random stand-in for `{{owner}}`, and
whatever text the instance holds where the template holds the stand-in becomes
the value. Here the instance's line is `Owner:` with nothing after it, so there
is nothing to read:

```bash
pnpm exec nx run conformetry-cli:start -- validate --config packages/ic-suite/conformetry/conformetry-examples/examples/failure-modes/conformetry.config.ts --instances packages/ic-suite/conformetry/conformetry-examples/examples/failure-modes/instances/unowned
```

```text
     1. Could not infer {{owner}}: no instance node aligned with the template text that uses it
        Fix     : Supply owner in the instance group's substitutions, or restore the template text that uses {{owner}} in the instance.
```

That finding fails the instance at any threshold. Had the line read
`Owner: platform`, validation would have taken `platform` as the value and
checked every other use of `{{owner}}` against it.

Generation has no instance to read from, so it still refuses outright with
`MissingSubstitutionError: No value was supplied for {{owner}}`:

```bash
pnpm exec nx run conformetry-cli:start -- generate --template missing-input --name unowned --directory tmp/conformetry-examples/failure-modes --config packages/ic-suite/conformetry/conformetry-examples/examples/failure-modes/conformetry.config.ts
```

### Why this had to be an error

Mustache renders an unknown placeholder as an empty string rather than leaving
the token visible or failing. Left alone, that made this the quietest failure
in the toolchain, because **both halves of the loop lost the same thing**:

- Generation wrote `Owner:` followed by one trailing space, and nothing else.
- Validation rendered the template the same way and compared against `Owner:`,
  which matched. No finding, no warning, nothing.

The instance conformed, the report was clean, and the value nobody supplied was
gone from both ends. Conformance cannot catch a hole it renders identically
into both sides of its own comparison, so neither side renders it empty any
more: generation refuses, and validation either reads a real value from the
instance or says it could not.

Refusing is a deliberate trade: a template cannot use a placeholder as an
"optional field". That is better than a silent hole.

### What is still allowed

A supplied value that happens to be **empty** is an answer, not a hole:

```ts
substitutions: { owner: "" }
```

And **section** tags are conditionals, so absence is how a template asks for a
block to be skipped or taken. Neither of these is refused:

```mustache
{{#owner}}Owner: {{owner}}{{/owner}}
{{^owner}}Unowned.{{/owner}}
```

That pair is the idiomatic way to say "optional" now: ask the question with a
section, and interpolate only inside it.

## What to take from it

Conformetry measures an instance against a **rendered** template, so anything
the rendering itself loses is invisible to the comparison by construction. That
is why nothing is ever rendered empty: a finding would have to come from a
comparison that never saw the problem. The `TODO` case is the same
mechanism used deliberately — the template chooses to ask for less.

## Next

Back to the [package guide](../../README.md), or straight to
[AGENTS.md](../../AGENTS.md) if you arrived here from a conformance report.
