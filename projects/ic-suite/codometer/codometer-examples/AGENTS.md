# ⏲️ Codometer Examples — Agent Guide

A sample corpus with known contents, and one runnable example per thing
codometer does. Read [README.md](README.md) for the guided tour; this file is
the lookup table for when codometer has already said something and you need to
know what to do about it.

## Run one

```bash
nx run codometer-examples:examples     # every example, gated on the exit code its guide promises
nx run codometer-examples:vitest       # every number and refusal message the guides quote
```

One example on its own, which is what a guide's `## Run it` section names —
there is no `--directory` flag any more, so the directory a guide says to
measure is the directory you `cd` into first:

```bash
cd projects/ic-suite/codometer/codometer-examples/examples/corpus
codometer --config ../<name>/<file>.config.ts --check limits
```

## Codometer said X — open this example

| It said | It means | Open |
| ------- | -------- | ---- |
| `Cannot bind the limit written against "X": nothing measured answers to it` | The path has no target name on the front, and no `defaultInput` is set. Even one input is not enough — write `codebase.X`. | [`limits/unprefixed.config.ts`](examples/limits/unprefixed.config.ts) |
| `it could be the "X" target's "files" metric, or the "codebase" target's "X.files" metric` | An input shares a name with a metric group, and a `defaultInput` makes both readings valid. Write the target name in full. Removing the `defaultInput` also removes the ambiguity. | [`limits/ambiguous.config.ts`](examples/limits/ambiguous.config.ts) |
| `Cannot bind the limit written against "T.python.files"` on a target that exists | The input does not run the analysis that produces the counter. Add `"language"` to its `analyses`, or limit something it measures. | [`limits/unbound.config.ts`](examples/limits/unbound.config.ts) |
| `Input "T" matched no files, and a limit is written against its "size" metric` | The glob stopped matching, or the build never ran. Do not "fix" it by removing the limit — the limit is what caught it. | [`limits/empty-target-limited.config.ts`](examples/limits/empty-target-limited.config.ts) |
| `Cannot read the limit on "T.size" from "8 K"` | The trailing `b` is required. `"8 KB"` is 8000 bytes, decimal, not 8192. | [`limits/unreadable-unit.config.ts`](examples/limits/unreadable-unit.config.ts) |
| `--output-json or --output-markdown cannot be combined with --check reports` | Nothing can be stale in the run that just wrote it. Run them separately. Replaces the old `--write cannot be combined with --check reports` message — there is no `--write` any more. | [`write-check/codometer.config.ts`](examples/write-check/codometer.config.ts) |
| `--check does not accept "X"` | The set is drawn from `limits` and `reports`, comma-separated. | [`write-check/codometer.config.ts`](examples/write-check/codometer.config.ts) |
| `--output-json needs a path, or a "json" entry in the configuration's "outputs" to resolve one from` | The bare flag (no value) asks the run to write wherever the configuration says, and nothing there names a `json` output. Pass `--output-json <path>`, or declare one. A path always writes on its own now — the old `--output-json <path> needs --write or --check reports` refusal is gone with `--write`. | [`output/codometer.config.ts`](examples/output/codometer.config.ts) |
| `Found stale reports` right after a green run elsewhere | Compressed sizes depend on the runtime's zlib. Check on the Node version the repository pins before believing it. | [`staleness/codometer.config.ts`](examples/staleness/codometer.config.ts) |
| `Breached a warning limit` and the run still exits 0 | `severity: "warn"` is advice. Only a `fail` limit under `--check limits` gates. | [`limits/warn.config.ts`](examples/limits/warn.config.ts) |
| `Skipped Python analysis … command not found`, and the run still exits 0 | The interpreter is unreachable. Every `python.*` counter reads 0, and so do `jupyter.classes`/`jupyter.functions`. Name it with `python: { command: … }`. | [`python/unreachable-interpreter.config.ts`](examples/python/unreachable-interpreter.config.ts) |
| Nothing at all — a counter reports zero | For Python, the interpreter. For a symbol counter, the wrong `kinds`/`modifiers`. For an input, the globs. | [`python/uv.config.ts`](examples/python/uv.config.ts), [`statistics/codometer.config.ts`](examples/statistics/codometer.config.ts) |
| `Breached a failing limit` naming a `custom.<Label> Comment Budget` metric | A `comment` selector's counter found a block over its own `maximumLines`/`maximumWords`/`maximumCharacters`. There is no separate "documentation length" message any more — a comment-budget breach is an ordinary limit breach, addressed by the counter's own `custom.<label>` path. Condense the block, or raise the budget. | [`documentation/codometer.config.ts`](examples/documentation/codometer.config.ts), [`documentation/yaml-comments.config.ts`](examples/documentation/yaml-comments.config.ts) |
| A `custom.<Language> Comment Budget` breach in a `.py`, `.sh`, or `.toml` file you did not expect | The line scanner reads a `#` inside a string as a comment; only Python, YAML, CSS, and TypeScript/JavaScript are read by a real tokenizer. Condense the block, or give that language's own `comment` selector a looser budget. | [`documentation/comments.config.ts`](examples/documentation/comments.config.ts) |
| A shell block reported starting one line later than you counted | A `#!` shebang is never a comment, so the block starts below it. | [`documentation/comments.config.ts`](examples/documentation/comments.config.ts) |
| A `custom.<label>` comment counter reports 0 for a language whose JSDoc comments you expected it to catch | A `comment` selector naming `language` and no `kind` skips JSDoc comments entirely — a `kind`-based selector measures those instead. The two are enabled separately, even though they share every other field name and reach the report through one channel. | [`documentation/codometer.config.ts`](examples/documentation/codometer.config.ts) |
| A configuration you edited had no effect | A nearer configuration file won. The search takes the **first** file walking upward and merges nothing — even a configuration file authored as a function is no longer recognized, so the same object always answers, whichever folder reached it. | [`discovery/nested/codometer.config.ts`](examples/discovery/nested/codometer.config.ts) |

## Three things that reliably confuse

- **`patterns` on a symbol counter narrows the search, it is not what is
  counted.** A counter with `symbols` counts declarations; adding `patterns`
  says which files to look in. The corpus is built so the two disagree: four
  static methods exist, three of them in `*.service.ts`.
- **A static class field holding an arrow function is a property, not a
  method,** and carries none of the field's modifiers. `CatalogService.blank`
  exists to be the thing a static-method counter fails to find.
- **A TypeScript class is counted under `javascript.classes`.** The group is
  "TypeScript & JavaScript". `typescript.*` carries only what is
  TypeScript-specific: `files`, `interfaces`, `enums`, `decorators`,
  `docComments`, `genericDeclarations`.

## Layout

```text
codometer-examples/
├── codometer.config.ts                what measures this package, and its first example
├── examples/
│   ├── corpus/                        the fixture every example measures
│   ├── compiled/                      stand-ins for build output, beside the corpus
│   └── <name>/
│       ├── README.md                  the guide for this example
│       └── *.config.ts                one configuration per variant
└── testing/
    ├── codometer.ts                   the command-line driver every test goes through
    ├── run-examples.ts                the `examples` target's runner
    ├── corpus.integration.test.ts     the corpus contents the guides quote
    ├── examples.integration.test.ts   targets, compression, and discovery, asserted against their guides
    └── <topic>.integration.test.ts    every other example, one or two guides per suite
```

- `examples/corpus/` and `examples/compiled/` are **fixtures, not examples**.
  They carry no `README.md` and must not be given one: a markdown file inside
  the corpus would move the very counts every guide quotes, and the `Corpus`
  target is gated on its gzipped size.
- Every other directory under `examples/` is one example, carries its own
  `README.md`, and is readable on its own.
- There is no `src/`. Every line of TypeScript here is either a configuration
  the tool reads or a test that runs it, which is why the package declares no
  `dependency-cruiser`, `oxlint`, or `build` target.

## Adding an example

- One folder under `examples/`, named for the behavior rather than numbered.
- One configuration file per variant, named for what it varies
  (`brotli.config.ts`, `reordered.config.ts`).
- A `README.md` in that folder: `# <emoji> Title`, then `## Run it` with the
  exact command and the exit code it produces, then the explanation, then
  `## Next` linking to the next example. `nx run codometer-examples:examples`
  fails on an example with no `README.md`.
- A row in the `## The examples` index table in [README.md](README.md), and a
  `## Next` link from the example before it in that order.
- An entry in `EXPECTED_EXIT_CODES` in `testing/run-examples.ts`. A
  configuration with no entry fails the `examples` target.
- The assertion goes in the `testing/*.integration.test.ts` suite for its
  topic in the same change, or a new suite beside them for a new topic — the
  runner spreads suites across workers, so a suite is the unit of parallelism.
  An example with no test is a claim, not an example.
- Spawn each configuration once. Where several cases read the same run, spawn
  it in a `beforeAll`; where a case wants both the exit code and the report,
  `gateAndMeasureExample` returns both from one run.
- If the example writes anything, run it through `withCorpusCopy` — the
  committed corpus must never be written to, or every other test's counts move.

## Do not fix a deliberately broken example

Twelve of this package's configurations are meant to fail, and eleven of them
exit non-zero on purpose. `limits/unprefixed.config.ts` writes a path that binds to nothing,
`limits/ambiguous.config.ts` writes a path that reads two ways,
`limits/empty-target-limited.config.ts` limits a target that matches nothing,
and `python/unreachable-interpreter.config.ts` names an interpreter that is not
installed. Each one is the reproduction of a refusal a reader will hit, and
"fixing" it deletes the only place that refusal is demonstrated.

The exit code each one produces is recorded in `EXPECTED_EXIT_CODES` and in the
guide beside it. If a run disagrees with both, the tool changed — that is the
regression this package exists to catch.

## Changing the corpus

The corpus is a fixture with published numbers, so a change to it is a change to
the guides:

1. Edit the sample.
2. `nx run codometer-examples:vitest` — the tests name every count that moved.
3. Update the tables in [README.md](README.md) to match, and the doc comment on
   any example configuration that quotes the old number.
4. `nx run codometer-examples:codometer:check` — the corpus is gated on staying
   under 24 KB gzipped.

Never update a guide's number by hand without re-running. The numbers are the
only reason this package exists.

`examples/corpus/generated/` is empty in the repository and must stay that way.
Nothing ignored may be committed here: a file that is both tracked and ignored
makes `git add` fail, and lint-staged re-stages every file it touches, so one
such file breaks the pre-commit hook on every later commit — not only the one
that introduced it. The two compiled samples live in `examples/compiled/`,
beside the corpus and tracked normally, and the ignore demonstration copies them
in at run time.

## Key files

| File | What it is |
| ---- | ---------- |
| [README.md](README.md) | The guided tour, and the `## The examples` index |
| [codometer.config.ts](codometer.config.ts) | What measures this package, and the discovery example |
| [testing/codometer.ts](testing/codometer.ts) | The command-line seam every test and the runner go through |
| [testing/run-examples.ts](testing/run-examples.ts) | The `examples` target, and the completeness checks |
