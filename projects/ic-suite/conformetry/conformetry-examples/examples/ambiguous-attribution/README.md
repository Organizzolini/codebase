# 🎭 Ambiguous attribution

Nothing records which template produced a file. Attribution is **inferred** from
how much of a template's structure a path already has — so a path can belong to
more than one template, and sometimes it belongs to two equally. This example is
one of each.

## Run it

```bash
pnpm exec nx run conformetry-examples:ambiguous-attribution
```

### A path two templates explain unequally

```bash
pnpm exec nx run conformetry-cli:start -- templates --config projects/ic-suite/conformetry/conformetry-examples/examples/ambiguous-attribution/conformetry.config.ts --instances projects/ic-suite/conformetry/conformetry-examples/examples/ambiguous-attribution/instances/guide
```

```text
  overview
    A two-file template: the document, and its notes
    Template: projects/ic-suite/conformetry/conformetry-examples/examples/ambiguous-attribution/templates/overview
    Instances:
      projects/ic-suite/conformetry/conformetry-examples/examples/ambiguous-attribution/instances/guide 2/2 files 100%
  digest
    A two-file template: the document, and its summary
    Template: projects/ic-suite/conformetry/conformetry-examples/examples/ambiguous-attribution/templates/digest
    Instances:
      projects/ic-suite/conformetry/conformetry-examples/examples/ambiguous-attribution/instances/guide 1/2 files 50%
```

**Both templates are listed, because both explain the path.** `overview` fits
completely and `digest` fits halfway, and reporting only the winner would hide
that `digest` has a claim on this directory at all — which is exactly what you
need to know before editing either template.

### A path two templates tie on

```bash
pnpm exec nx run conformetry-cli:start -- templates --config projects/ic-suite/conformetry/conformetry-examples/examples/ambiguous-attribution/conformetry.config.ts --instances projects/ic-suite/conformetry/conformetry-examples/examples/ambiguous-attribution/instances/atlas
```

```text
  overview
    …
      projects/ic-suite/conformetry/conformetry-examples/examples/ambiguous-attribution/instances/atlas 1/2 files 50%
  digest
    …
      projects/ic-suite/conformetry/conformetry-examples/examples/ambiguous-attribution/instances/atlas 1/2 files 50%
```

`instances/atlas` holds only `atlas.md`, the one file both templates declare.
Neither fits better. Validation reports that as a finding rather than picking
one, and the run exits non-zero:

```text
  1. file: atlas — -1/0 requirements met (100.0%)
     Instance: …/instances/atlas
     Template: …/templates

     1. Ambiguous instance: matches digest, overview equally well
        Fix     : Give the templates digest, overview distinguishing files, or narrow the instance glob so only one applies.
```

> The `-1/0 requirements met (100.0%)` line is a rough edge in the report
> renderer: an unmatched instance has no requirement count, so the numbers on
> that line are not meaningful. The finding beneath it is.

## Why a single verdict would be wrong

A glob is the author asserting that these paths **are** instances. So when
nothing explains a path, silence is the one unacceptable answer — it would hide
two different problems that need opposite fixes:

| Reason | What it means | What to do |
| ------ | ------------- | ---------- |
| `no-match` | No template explains this path well enough | The instance drifted past recognition, or the glob is wrong |
| `ambiguous` | Two or more templates tied, and neither fits completely | Give the templates distinguishing files, or narrow the glob |

Picking a winner arbitrarily would produce a report full of findings against a
template the directory was never generated from — worse than no report, because
it looks authoritative.

## A complete tie is different

Two templates tying at **100%** is not ambiguous: the instance is matched
against every tied template. A module holding both a command and a service
really is an instance of `nestjs-command-module` _and_ `nestjs-service-module`,
and calling that ambiguous would demand the author narrow a glob that is not
wrong. It is also why the run total counts instance/template **pairs** rather
than files — a directory governed by two templates owes both of them.

## One configuration detail

Only `overview` declares the instance glob here, and `digest` declares none:

```ts
instances: [{ patterns: [`${EXAMPLE_PATH}/instances/*`] }],   // overview
instances: [],                                                // digest
```

A run unions every generator's groups into one list of paths, and which template
explains a path is inferred either way. Writing the same glob under both
generators locates each path twice, and every finding about it is then reported
twice. Say it once.

## Next

[nx-host](../nx-host/README.md), for the other way instances get located.
