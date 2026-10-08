# 🗣️ One validator per language

Which validator handles a file is decided by its **extension**, and only the
packages a run actually needs are loaded. This example is one instance holding
one file for every validator conformetry ships, plus two files whose extensions
only the fallback claims.

## Run it

```bash
pnpm exec nx run conformetry-examples:language-validators
```

```text
All checked files conform.
```

> **Needs `python3` on `PATH`.** The Python validator compares through Python's
> own `ast` module rather than reimplementing a parser, and the Jupyter
> validator delegates its code cells to it. Without an interpreter those two
> files are the ones that break.

## What is here

```text
language-validators/
├── conformetry.config.ts
├── instances/
│   └── polyglot/
│       ├── .gitignore
│       ├── Polyglot.tsx
│       ├── polyglot.ipynb
│       ├── polyglot.json
│       ├── polyglot.md
│       ├── polyglot.py
│       ├── polyglot.ts
│       ├── polyglot.txt
│       └── settings.toml
└── templates/
    └── polyglot/
        └── {{nameKebabCase}}/                  …the same nine, with placeholders
```

| File | Validator | What it compares |
| ---- | --------- | ---------------- |
| `polyglot.ts` | `typescript` | Syntax tree structure and required comments |
| `Polyglot.tsx` | `typescript` | The same validator — `.tsx` is routed to it, JSX and all |
| `polyglot.md` | `markdown` | mdast structure: headings, lists, tables — not prose |
| `polyglot.py` | `python` | Structure via Python's own `ast` module |
| `polyglot.json` | `json` | Key structure and values |
| `polyglot.ipynb` | `jupyter` | The notebook envelope, delegating cells to `markdown` and `python` |
| `polyglot.txt` | `text` | Duplicate-aware line conformance |
| `.gitignore` | `text` | The same — it is the fallback, so no extension goes unchecked |
| `settings.toml` | `text` | The same |

## Narrowing a run

```bash
pnpm exec nx run conformetry-cli:start -- validate --config projects/ic-suite/conformetry/conformetry-examples/examples/language-validators/conformetry.config.ts --languages typescript
```

`--languages` takes a comma-separated list of the names in the table. Only the
packages a run needs are resolved, which is why a consumer that checks nothing
but TypeScript never pulls in the rest.

## Two passes, not one

Before any validator runs, **every file the template declares is checked to
exist.** Delete `instances/polyglot/.gitignore` and the run says so:

```text
  1. file: .gitignore — 0/1 requirements met (0.0%)

     1. Missing file: …/instances/polyglot/.gitignore
        Fix     : Create the file using the generator, or manually from the template at ….
```

Change its _contents_ instead and the `text` validator is what reports it —
drop the `enabled = true` line from `settings.toml`, for instance:

```text
  1. file: settings.toml — 2/3 requirements met (66.7%)

     1. Missing line: enabled = true
        Template: Line 2
        Expected: `enabled = true`
        Fix     : Add the line `enabled = true` to the instance file.
```

So the two passes answer different questions, and both cover every extension:
existence is checked for every declared file, and `text` is the content floor
for anything the named validators do not claim — `.gitignore`, `.env.default`,
`pyproject.toml`, `Dockerfile`.

A missing **directory** is reported once rather than as one finding per file
inside it; [drift-catalogue](../drift-catalogue/README.md) shows that case.

## Next

[two-directions](../two-directions/README.md), for asking the registry
questions instead of validating.
