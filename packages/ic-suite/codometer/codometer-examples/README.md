# ⏲️ Codometer Examples

**A sample corpus with known contents, and one runnable example per thing
codometer does.**

Codometer's more interesting half is the one no language analyzer can produce:
the conventions a repository holds _itself_ to. But declaring a custom
statistic, addressing a metric by its dotted path, or writing a limit against a
compiled target are all things you would otherwise learn from a thousand-line
reference with nothing to try them against.

This package is that something. Every command in every example is runnable,
every number is one the tool really produces, and a test asserts each of them —
so a guide that drifts from the tool fails a check rather than misleading you.

Nothing in the corpus is meant to be good code. Every sample exists to be
counted, and several are deliberately shaped the way this repository's own
conventions are not.

```bash
nx run codometer-examples:examples          # run every example, gate on what it prints
nx run codometer-examples:vitest            # assert every number below
nx run codometer-examples:codometer:write   # regenerate this README's badge section
```

Agents arriving from a codometer report should start at [AGENTS.md](AGENTS.md),
which maps "codometer said X" to the example that explains X.

## The examples

Each directory under [`examples/`](examples) is one example and carries its own
`README.md`. Read in this order for a walkthrough; jump straight in for an
answer. Every one of them measures the same corpus, pointed at a different
configuration — the command line carries no `--directory` flag, so a run
always measures the process's own working directory, and that directory is
`examples/corpus`:

```bash
cd examples/corpus
codometer --config ../<name>/<file>.config.ts
```

| Example | Answers |
| ------- | ------- |
| [statistics](examples/statistics/README.md) | How do I count a convention no analyzer knows about? |
| [python](examples/python/README.md) | Why is every Python counter zero? |
| [targets](examples/targets/README.md) | How do I measure files the current directory does not hold? |
| [compression](examples/compression/README.md) | What does a `size` metric actually measure? |
| [limits](examples/limits/README.md) | How high may a metric go, and why was my limit refused? |
| [documentation](examples/documentation/README.md) | How long may a comment run, and what breaches it? |
| [write-check](examples/write-check/README.md) | What does each `--output-*` and `--check` combination do? |
| [output](examples/output/README.md) | Where does the report, the document, and the badge block land? |
| [discovery](examples/discovery/README.md) | Which configuration file wins? |
| [staleness](examples/staleness/README.md) | Why is `--check reports` failing when nothing changed? |

## The fixtures

Two directories under `examples/` are not examples. They are the subject every
example measures, and they carry no `README.md` of their own — a markdown file
inside the corpus would change the very counts these guides quote.

### The corpus

`examples/corpus/` holds twenty-seven samples across twelve languages, plus the
`.gitignore` that hides its stand-in build directory. It is small enough to
count by hand, which is the whole point: a guide saying "four service files"
is only worth reading if you can check.

| What | Count |
| ---- | ----- |
| Files measured | 28 |
| Folders | 12 |
| Source files | 18 |
| TypeScript files | 15 |
| JavaScript files | 2 |
| One file each | Python, Jupyter, JSON, YAML, Markdown, SQL, Shell, TOML, HCL, CSS |
| `*.service.ts` files | 4 |
| `*.unit.test.ts` files | 6 |
| `*.integration.test.ts` files | 1 |
| Static methods | 4 |

`examples/corpus/.gitignore` names `generated/`, which is empty in a fresh
checkout on purpose: a file that is both tracked and ignored breaks `git add`,
and so every pre-commit hook, for everyone who touches it afterwards. Fill it
yourself to watch discovery skip it — see
[targets](examples/targets/README.md#where-ignore-rules-stop).

### The compiled stand-ins

Two more files sit in `examples/compiled/`, **beside** the corpus rather than
inside it — stand-ins for build output, which is where build output really
lives. They are what [targets](examples/targets/README.md) and
[compression](examples/compression/README.md) measure, and a bare corpus
measurement never sees them because it measures one directory and they are not
in it.

### Every language analyzer

A bare run measures every language it recognizes. The corpus carries one
idiomatic sample per analyzer so each group has something in it:

```bash
cd examples/corpus
codometer --format json | jq '.targets[0].metrics[] | select(.value > 0)'
```

Two things in the output surprise people:

- **TypeScript and JavaScript are one group.** A TypeScript class is counted
  under `javascript.classes`, not `typescript.classes`, because the group is
  "TypeScript & JavaScript" rather than two of them. `typescript.*` carries only
  what is TypeScript-specific — `files`, `interfaces`, `enums`, `decorators`,
  `docComments`, `genericDeclarations`. The corpus has 5 classes: four written
  in TypeScript and one in JavaScript.
- **A dot file is a file.** `examples/corpus/.gitignore` is measured like any
  other, which is why the count is 28 rather than 27.

### Notebooks measured by composition

`examples/corpus/jupyter/holdings.ipynb` is codometer's least visible internal
and its most surprising. There is no fourth parser: the notebook is decomposed
and handed to three analyzers that already exist.

| Reaches | What it measures | This notebook |
| ------- | ---------------- | ------------- |
| JSON analyzer | The envelope — the document is JSON | `totalNodes` 74, `maxDepth` 8 |
| Python analyzer | The code cells | `classes` 1, `functions` 1, `codeLines` 18 |
| Markdown analyzer | The markdown cells | `headings` 2, `links` 1, `markdownLines` 8 |
| Jupyter analyzer | Only what is left | `cells` 5, `codeCells` 3, `markdownCells` 2, `executedCells` 3, `outputs` 2 |

Composition is about what is counted, not where it is filed. The notebook is
still one Jupyter file and **not** also a JSON, Python, or markdown one — all
three of those counts stay at 1, from the standalone samples.

[python](examples/python/README.md) shows the same seam from the failure side:
one missing interpreter takes a slice out of two groups at once.

## Gating a pull request on it

The examples end here. What they add up to is a gate: measure a directory,
declare a counter, add a target, write a limit — and then make a change that
breaches it fail before it lands.

Two commands do that, and they are deliberately different jobs:

```bash
# On the branch: measure, write the report, fail if a limit breached.
codometer --output-json codometer-report.json --check limits

# Afterwards: diff every report against the base branch's and render the result.
codometer changes --directory . --baseline <base-reports> --markdown summary.md
```

The first is the gate. `--output-json <path>` writes on its own — no companion
flag needed, unlike the old `--write` this replaced (only the
[bare flag is still refused](examples/output/README.md#a-bare-flag-needs-a-configured-entry-to-resolve)
when nothing is configured to resolve it from) — and the report has to exist
even when the gate trips, because the pull request that failed is the one that
needs the numbers. That is the last row of the
[`--output-*` / `--check` matrix](examples/write-check/README.md), and it is
exactly what this repository's own `codometer` Nx target runs per project.

The second is the report a reviewer reads: `codometer changes` joins each
project's fresh `codometer-report.json` against a snapshot of the base branch's
and renders what moved. The join key is the metric's `name` — its target's name
then its path — which is why a target's name is worth choosing once and leaving
alone. Rename a target and every metric under it reads as removed and re-added.

Three things are worth knowing before wiring this up:

- **Gate on `limits`, not on `reports`, from a branch.** Staleness is a
  different finding, it is
  [not portable across runtimes](examples/staleness/README.md), and a branch's
  committed report is expected to lag the default branch's.
- **A limit is an assertion that the files exist.** A target that matched
  nothing fails the gate — see
  [empty targets](examples/limits/README.md#empty-targets) — which is the check
  earning its keep on the day a build silently produces nothing.
- **Put a `warn` under the `fail`.** One metric may carry both, the report lists
  both, and the warn is how the number is seen coming before it stops anybody.
  [`fail.config.ts`](examples/limits/fail.config.ts) is that pair.

## Keeping it honest

A guide quoting a count the tool no longer produces is worse than no guide, and
this package's whole value is that its numbers are checkable. So they are
checked:

```bash
nx run codometer-examples:examples
nx run codometer-examples:vitest
```

The first runs every example configuration the way its guide says to and gates
on the exit code it promised. The second drives the real command line over the
corpus — the same seam the guides describe — and asserts the counts and the
sentences the refusals print. What is deliberately **not** asserted as a literal
is anything a runtime can move: line counts and byte sizes are checked as
ranges, because pinning them would fail for reasons no reader cares about, and
[staleness](examples/staleness/README.md) is the proof that pinning a compressed
size would fail for reasons that are not even true.

This package also measures itself, gated on the corpus staying small:

```bash
nx run codometer-examples:codometer:check
```

## Notes on the corpus

- **It is not measured with the repository.** `configuration/.codometerignore`
  excludes it, so twenty-seven sample files in twelve languages do not distort
  the statistics of the repository that happens to hold them.
- **It is not linted like source.** The samples exist to be counted, and several
  are deliberately shaped the way this repository's own conventions are not — a
  static method, an uncalled export, a near-identical sample per language.
  Linting them would either stop them demonstrating what they demonstrate or
  bury them under suppression comments, so the corpus is scoped out of ESLint,
  knip, jscpd, and fallow deliberately, once, in each tool's configuration.
- **It is polyglot but tagged `language:typescript`.** The tag decides which
  composite targets a project runs, and pointing `ruff`, `pyright`, and
  `sqlfluff` at sample files would force them to be more than samples. They are
  data, not source.

## Layout

```text
codometer-examples/
├── codometer.config.ts                what measures this package, and its first example
├── examples/
│   ├── corpus/                        the fixture every example measures
│   ├── compiled/                      stand-ins for build output, beside the corpus
│   └── <name>/                        one example: configurations and a README.md
└── testing/
    ├── codometer.ts                   the command-line driver every test goes through
    ├── corpus.integration.test.ts     the corpus contents the guides quote
    ├── examples.integration.test.ts   targets, compression, and discovery, asserted against their guides
    └── <topic>.integration.test.ts    every other example, one or two guides per suite
```

This package has no `src/`. Nothing here is imported by anything — the
configurations are read by the tool, and the corpus is read as data.

## Test

```bash
nx run codometer-examples:vitest
```

## License

MIT — see [LICENSE](../../../../LICENSE).

<!-- SAMPLE_STATISTICS_START -->

## ⏲️ Codometer

Statistics for the sample corpus and the guides beside it, measured by [codometer](../codometer-cli), regenerated by `nx run codometer-examples:codometer:write`.

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-3671-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-186.25_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-27-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-59-3178c6?style=flat-square)

### Measured Targets

![Corpus Size](https://img.shields.io/badge/Corpus_Size-8.32_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-54-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-7-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-2-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-1-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-0-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-92-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-7-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-4-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-9-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-9-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-8-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-164-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-21-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-182-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-3-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-175-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-75-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-35-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-221-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-1227-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-0-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-1-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-49-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-3-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-4-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-1-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-2-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-3-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-2-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-8-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-8-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-1-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-1-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-4-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-110-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-25-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-71-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-53-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-4-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-6-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-1-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-27-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-102-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-5-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-1-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-21-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-1-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-5-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-4-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-12-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-20-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-1-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-2-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-1-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-5-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-1-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-19-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-2-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-2-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-9-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-1-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-1-64748b?style=flat-square)

### Shell

![Shell Files](https://img.shields.io/badge/Shell_Files-1-89e051?style=flat-square)
![Shell Lines](https://img.shields.io/badge/Shell_Lines-30-4eaa25?style=flat-square)
![Shell Functions](https://img.shields.io/badge/Shell_Functions-2-16a34a?style=flat-square)
![Shell Variables](https://img.shields.io/badge/Shell_Variables-1-0284c7?style=flat-square)
![Shell Exports](https://img.shields.io/badge/Shell_Exports-1-ea580c?style=flat-square)
![Shell Conditionals](https://img.shields.io/badge/Shell_Conditionals-1-7c3aed?style=flat-square)
![Shell Loops](https://img.shields.io/badge/Shell_Loops-2-8b5cf6?style=flat-square)
![Shell Pipelines](https://img.shields.io/badge/Shell_Pipelines-1-059669?style=flat-square)
![Shebangs](https://img.shields.io/badge/Shebangs-1-6b7280?style=flat-square)
![Shell Comments](https://img.shields.io/badge/Shell_Comments-2-64748b?style=flat-square)
![Shell Comment Lines](https://img.shields.io/badge/Shell_Comment_Lines-2-475569?style=flat-square)

### SQL

![SQL Files](https://img.shields.io/badge/SQL_Files-1-e38c00?style=flat-square)
![SQL Lines](https://img.shields.io/badge/SQL_Lines-39-f29111?style=flat-square)
![SQL Statements](https://img.shields.io/badge/SQL_Statements-6-7c3aed?style=flat-square)
![SQL Selects](https://img.shields.io/badge/SQL_Selects-2-16a34a?style=flat-square)
![SQL Inserts](https://img.shields.io/badge/SQL_Inserts-1-22c55e?style=flat-square)
![SQL Updates](https://img.shields.io/badge/SQL_Updates-1-0ea5e9?style=flat-square)
![SQL Deletes](https://img.shields.io/badge/SQL_Deletes-1-dc2626?style=flat-square)
![SQL Creates](https://img.shields.io/badge/SQL_Creates-2-0284c7?style=flat-square)
![SQL Joins](https://img.shields.io/badge/SQL_Joins-1-8b5cf6?style=flat-square)
![SQL CTEs](https://img.shields.io/badge/SQL_CTEs-1-059669?style=flat-square)
![SQL Comments](https://img.shields.io/badge/SQL_Comments-1-64748b?style=flat-square)

### HCL

![HCL Files](https://img.shields.io/badge/HCL_Files-1-844fba?style=flat-square)
![HCL Lines](https://img.shields.io/badge/HCL_Lines-29-a78bfa?style=flat-square)
![HCL Blocks](https://img.shields.io/badge/HCL_Blocks-5-7c3aed?style=flat-square)
![HCL Resources](https://img.shields.io/badge/HCL_Resources-2-0284c7?style=flat-square)
![HCL Variables](https://img.shields.io/badge/HCL_Variables-2-16a34a?style=flat-square)
![HCL Outputs](https://img.shields.io/badge/HCL_Outputs-1-059669?style=flat-square)
![HCL Attributes](https://img.shields.io/badge/HCL_Attributes-10-0ea5e9?style=flat-square)
![HCL Interpolations](https://img.shields.io/badge/HCL_Interpolations-1-db2777?style=flat-square)
![HCL Comments](https://img.shields.io/badge/HCL_Comments-1-64748b?style=flat-square)

### CSS

![CSS Files](https://img.shields.io/badge/CSS_Files-1-264de4?style=flat-square)
![CSS Lines](https://img.shields.io/badge/CSS_Lines-25-2965f1?style=flat-square)
![CSS Rules](https://img.shields.io/badge/CSS_Rules-4-7c3aed?style=flat-square)
![CSS Selectors](https://img.shields.io/badge/CSS_Selectors-5-8b5cf6?style=flat-square)
![CSS Declarations](https://img.shields.io/badge/CSS_Declarations-8-0284c7?style=flat-square)
![CSS At Rules](https://img.shields.io/badge/CSS_At_Rules-1-f97316?style=flat-square)
![CSS Media Queries](https://img.shields.io/badge/CSS_Media_Queries-1-ea580c?style=flat-square)
![CSS Custom Properties](https://img.shields.io/badge/CSS_Custom_Properties-5-16a34a?style=flat-square)
![CSS Comments](https://img.shields.io/badge/CSS_Comments-1-64748b?style=flat-square)

### Conventions

![Service Files](https://img.shields.io/badge/Service_Files-4-7c3aed?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-6-0284c7?style=flat-square)

### Jupyter

![Notebooks](https://img.shields.io/badge/Notebooks-1-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-5-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-3-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-2-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-3-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-2-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-18-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-1-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-1-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-1-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-1-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-8-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-2-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-1-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-40-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-74-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-8-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-12-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-1025-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-12-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-64-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-1-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-126-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-9-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-28-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-2-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-9-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-67-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-63-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-38-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-385-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-1-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-1-a16207?style=flat-square)
<!-- SAMPLE_STATISTICS_END -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  codometer_cli["codometer-cli"]
  codometer_configuration["codometer-configuration"]
  codometer_core["codometer-core"]
  codometer_examples["codometer-examples"]
  codometer_examples -.-> codometer_cli
  codometer_examples --> codometer_configuration
  codometer_examples --> codometer_core
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class codometer_examples subject
```

_Dashed edges are dependencies Nx inferred from configuration rather than from code._
<!-- codependix:end name="codependix-nx-projects" -->

### File Imports

<!-- codependix:start name="codependix-file-imports" -->
```mermaid
graph LR
  file_codependix_config_ts["codependix.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_examples_compression_brotli_config_ts["examples/compression/brotli.config.ts"]
  file_examples_compression_gzip_config_ts["examples/compression/gzip.config.ts"]
  file_examples_compression_none_config_ts["examples/compression/none.config.ts"]
  file_examples_discovery_nested_codometer_config_ts["examples/discovery/nested/codometer.config.ts"]
  file_examples_documentation_codometer_config_ts["examples/documentation/codometer.config.ts"]
  file_examples_documentation_comments_config_ts["examples/documentation/comments.config.ts"]
  file_examples_documentation_yaml_comments_config_ts["examples/documentation/yaml-comments.config.ts"]
  file_examples_limits_ambiguous_config_ts["examples/limits/ambiguous.config.ts"]
  file_examples_limits_default_target_config_ts["examples/limits/default-target.config.ts"]
  file_examples_limits_empty_target_limited_config_ts["examples/limits/empty-target-limited.config.ts"]
  file_examples_limits_empty_target_unlimited_config_ts["examples/limits/empty-target-unlimited.config.ts"]
  file_examples_limits_fail_config_ts["examples/limits/fail.config.ts"]
  file_examples_limits_unbound_config_ts["examples/limits/unbound.config.ts"]
  file_examples_limits_units_config_ts["examples/limits/units.config.ts"]
  file_examples_limits_unprefixed_config_ts["examples/limits/unprefixed.config.ts"]
  file_examples_limits_unreadable_unit_config_ts["examples/limits/unreadable-unit.config.ts"]
  file_examples_limits_warn_config_ts["examples/limits/warn.config.ts"]
  file_examples_output_codometer_config_ts["examples/output/codometer.config.ts"]
  file_examples_output_custom_render_config_ts["examples/output/custom-render.config.ts"]
  file_examples_output_custom_write_config_ts["examples/output/custom-write.config.ts"]
  file_examples_output_renamed_markers_config_ts["examples/output/renamed-markers.config.ts"]
  file_examples_output_self_excluded_config_ts["examples/output/self-excluded.config.ts"]
  file_examples_python_default_interpreter_config_ts["examples/python/default-interpreter.config.ts"]
  file_examples_python_unreachable_interpreter_config_ts["examples/python/unreachable-interpreter.config.ts"]
  file_examples_python_uv_config_ts["examples/python/uv.config.ts"]
  file_examples_staleness_codometer_config_ts["examples/staleness/codometer.config.ts"]
  file_examples_statistics_codometer_config_ts["examples/statistics/codometer.config.ts"]
  file_examples_targets_codometer_config_ts["examples/targets/codometer.config.ts"]
  file_examples_targets_ignored_config_ts["examples/targets/ignored.config.ts"]
  file_examples_targets_reordered_config_ts["examples/targets/reordered.config.ts"]
  file_examples_write_check_codometer_config_ts["examples/write-check/codometer.config.ts"]
  file_testing_codometer_ts["testing/codometer.ts"]
  file_testing_corpus_integration_test_ts["testing/corpus.integration.test.ts"]
  file_testing_examples_integration_test_ts["testing/examples.integration.test.ts"]
  file_testing_run_examples_ts["testing/run-examples.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_testing_corpus_integration_test_ts --> file_testing_codometer_ts
  file_testing_examples_integration_test_ts --> file_testing_codometer_ts
  file_testing_run_examples_ts --> file_testing_codometer_ts
```
<!-- codependix:end name="codependix-file-imports" -->
