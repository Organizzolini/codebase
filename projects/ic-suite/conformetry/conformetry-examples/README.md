# 👔 Conformetry Examples

**Eleven runnable examples of [Conformetry](../conformetry-cli/README.md), and
the guides that read them.**

Conformetry's only worked example used to be a real workspace: this
repository's own `configuration/conformetry.config.ts` and its ten templates.
That is a poor introduction on both counts — too large to read through, and too
specific to copy. This package is the sandbox instead. Every example is
self-contained: its own configuration, its own template folder, its own
instances, and an Nx target that runs it. Nothing here requires reading anything
else here first.

```bash
pnpm exec nx run conformetry-examples:examples          # every example, gated on what its guide promises
pnpm exec nx run conformetry-examples:hello-template    # one example, and watch its output
```

Agents arriving from a conformance report should start at
[AGENTS.md](AGENTS.md), which maps "conformance reported X" to the example that
explains X.

## The examples

Read in this order for a walkthrough; jump straight in for an answer.

| Example | Answers |
| ------- | ------- |
| [hello-template](examples/hello-template/README.md) | What is the smallest thing a generator can be? |
| [case-variants](examples/case-variants/README.md) | What does a template get for free from a name, and how do I override it? |
| [structural-not-textual](examples/structural-not-textual/README.md) | What does the comparison actually weigh? |
| [drift-catalogue](examples/drift-catalogue/README.md) | What does every kind of finding look like, and how do I read a report? |
| [scoring-thresholds](examples/scoring-thresholds/README.md) | How do I adopt a template without migrating everything today? |
| [language-validators](examples/language-validators/README.md) | What gets compared in each file format? |
| [two-directions](examples/two-directions/README.md) | How do I ask what a path owes, or what a template governs? |
| [ambiguous-attribution](examples/ambiguous-attribution/README.md) | Why does one path list two templates? |
| [nx-host](examples/nx-host/README.md) | What does `@conformetry/nx` add over the command line? |
| [embedding](examples/embedding/README.md) | How do I drive conformetry from my own tool? |
| [failure-modes](examples/failure-modes/README.md) | What does conformetry refuse, and what does it let through? |

## Start to finish

### 1. Install

```bash
pnpm add --save-dev @conformetry/cli
```

Node.js 20 or newer. Validating Python or Jupyter instances additionally needs
`python3` on `PATH` — the Python validator compares through Python's own `ast`
module rather than reimplementing a parser.

In an Nx workspace, add [`@conformetry/nx`](../conformetry-nx/README.md) too;
[nx-host](examples/nx-host/README.md) covers what it adds and how to register
it.

### 2. Write a generator

A single `conformetry.config.ts` default-exports an array of generator
definitions. The smallest useful one names a template folder, the inputs it
substitutes, and where its output already lives:

```ts
import { type ConformetryConfiguration } from "@conformetry/configuration";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    description: "The smallest generator there is: one template file",
    inputs: {
      name: { description: "Greeting name in kebab-case", type: "string" },
    },
    instances: [{ patterns: ["packages/*/src/greetings/*"] }],
    name: "hello",
    templatePath: "templates/hello",
  },
];

export default conformetryConfiguration;
```

`instances` is the field that makes validation possible. It says where this
generator's output already is, so validation knows what to check without being
told twice.

The template is an ordinary folder of ordinary files. Both file contents and
file **paths** are rendered with [mustache](https://mustache.github.io):

```text
templates/hello/
└── {{nameKebabCase}}/
    └── {{nameKebabCase}}.md
```

Every path in the configuration is resolved against the directory the command
runs in. This package's examples are documented as run from the workspace root,
so each one builds its paths from a single `EXAMPLE_PATH` constant.

Full reference: [`@conformetry/configuration`](../conformetry-configuration/README.md).

### 3. Scaffold from it

```bash
conformetry generate --template hello --name world
```

A template's own inputs are passed as flags. Unknown flags are accepted
deliberately — which inputs exist is not known until the template is chosen —
which is also why the template is selected with `--template` and not `--name`.
Omitting `--template` at a terminal offers a picker over every configured
template instead of failing.

Missing required inputs are prompted for when stdin is a TTY and `CI` is not
`true`. Otherwise the command fails rather than hanging.

Walk it: [hello-template](examples/hello-template/README.md),
then [case-variants](examples/case-variants/README.md).

### 4. Validate

```bash
conformetry validate
```

```text
All checked files conform.
```

Every instance the configured globs find is compared against the template it
was generated from — except that nothing recorded which template that was, so
attribution is inferred from how much of each template's structure the path
already has. Two templates can both have a claim; see
[ambiguous-attribution](examples/ambiguous-attribution/README.md).

### 5. Break something on purpose

This is the step most people skip, and it is the one that teaches the tool.
Delete an export, drop a section comment, rename a class, remove a file — then
run `validate` again.

[drift-catalogue](examples/drift-catalogue/README.md) has already done it for
you, once per kind of finding, and quotes the whole report.

What is _not_ a finding matters just as much: reformatting, added members, added
comments. [structural-not-textual](examples/structural-not-textual/README.md) is
that pair side by side.

### 6. Read the report

```text
Conformance scores:
  ✗ …/instances/renamed-class (widget) — 25/35 requirements met (71.4%), below threshold 100.0%
  Total — 173/193 requirements met (89.6%) across 6 instance(s), 5 below threshold

  6. file: renamed-class.service.ts — 5/15 requirements met (33.3%)
     Instance: …/instances/renamed-class/renamed-class.service.ts
     Template: …/templates/widget/{{nameKebabCase}}/{{nameKebabCase}}.service.ts

     1. Missing ClassDeclaration "RenamedClassService"
        Instance: Line 4, Column 1
        Template: Line 4, Column 1
        Weight  : 10 of the 15 requirements in this file
        Fix     : Add the missing ClassDeclaration "RenamedClassService" to the instance file. See the template for the expected structure.
```

Four habits cover it:

- **Read the fraction, not the percentage.** A percentage hides its own scale:
  `99.3%` reads the same whether one requirement of 151 went missing or thirty
  of four thousand did, and only the first is a five-minute fix.
- **Read the weight.** A finding that stands in for more than itself says so. A
  missing class carries every member it held.
- **Read both locations.** Every finding carries where the instance is wrong
  _and_ where the template says so.
- **Trust the `Fix` line.** Making the report actionable — by a person or an
  agent — is the point of the format.

### 7. Adopt a template incrementally

A new template makes every directory it claims instantly non-conforming, which
is why thresholds exist. Hold the directory still being migrated to `0.75` and
leave every other instance strict:

```ts
{
  name: "dossier",
  templatePath: "templates/dossier",
  threshold: 1,
  instances: [
    { patterns: ["packages/*/src/dossiers/*"] },
    { patterns: ["applications/legacy/src/dossiers/*"], threshold: 0.75 },
  ],
}
```

Findings print either way. A lowered threshold is permission to ship the drift,
not a reason to stop showing it.

[scoring-thresholds](examples/scoring-thresholds/README.md) runs exactly this,
including which of the three threshold levels wins.

## Keeping these guides honest

A guide whose commands have drifted is worse than no guide, so the examples are
**executed**, not merely committed.
[`testing/examples.integration.test.ts`](testing/examples.integration.test.ts)
reads the `examples/` directory, reads each example's Nx target out of
`project.json`, runs the commands that target runs, and asserts the exit code
and the text each guide quotes — zero for the passing examples, non-zero with
the expected findings for the deliberately drifted ones. It also generates
`hello-template` and `case-variants` into a temporary directory and asserts the
result is byte-identical to the committed instance, because an instance a reader
is told to copy has to be what the generator actually writes.

Adding an example directory without an expected outcome fails the suite rather
than going unchecked.

```bash
pnpm exec nx run conformetry-examples:vitest
```

## Conventions this package deliberately breaks

An examples package collides with gates written for ordinary source, and each
collision is answered rather than suppressed:

| Gate | Why it does not apply here | How that is expressed |
| ---- | -------------------------- | --------------------- |
| Test coverage 96% | Every example is either a configuration a reader copies or a script a reader runs, and the suite runs each as a child process. There is no imported library source to instrument. | `coverage.include: []` in `vitest.config.ts`, the same as [`conformetry-agents`](../conformetry-agents) |
| `knip` | Example code exists to be read, not imported. Unused files and exports are the norm. | An explicit workspace entry in `configuration/knip.config.ts` naming the example configurations as entry points |
| `jscpd` duplication | Eleven parallel examples are near-identical by design. | The fixture trees are excluded, exactly as `configuration/conformetry-templates/**` already is |
| ESLint, `oxfmt`, `tsc` | A template file holds mustache where an identifier belongs, and is not parseable as the language its extension names. | `examples/*/templates/**` and `examples/*/instances/**` are excluded; each example's `conformetry.config.ts` and `embed.ts` are **not**, and are linted and type-checked like any other source |
| Project structure | `examples/` is not one of the fixed set of project subfolders. | Declared in `configuration/codebase-structure.json` |
| `codometer` `sizeLimit` | Nothing here is built or shipped, so there is no compiled output to size. | A `codometer` target with no `PROJECT_LIMITS` entry, the same as the two `*-agents` packages |
| Project tags | `framework:nestjs` is accurate — the embedding example boots a real Nest container — and it is safe because every tag-scoped instance glob in `configuration/conformetry.config.ts` is under `src/modules/`, which this package does not have. Carrying the tag under a `src/modules/` layout would sweep the drifted fixtures into this repository's own conformance run. | `framework:nestjs`, `language:typescript`, `name:conformetry-examples`, `type:package` — and no `src/`, which is what keeps the tag free to be accurate |

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

Every example is self-contained: its own configuration, its own template folder,
its own instances, and an Nx target that runs it. Nothing here requires reading
anything else here first.

This package has no `src/`, and that is what keeps `framework:nestjs` safe to
declare — see [the table above](#conventions-this-package-deliberately-breaks).

## Test

```bash
pnpm exec nx run conformetry-examples:vitest
```

## License

MIT — see [LICENSE](../../../../LICENSE).

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/projects/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  conformetry_cli["conformetry-cli"]
  conformetry_configuration["conformetry-configuration"]
  conformetry_examples["conformetry-examples"]
  conformetry_generation["conformetry-generation"]
  conformetry_nx["conformetry-nx"]
  conformetry_output["conformetry-output"]
  conformetry_validation["conformetry-validation"]
  conformetry_examples -.-> conformetry_cli
  conformetry_examples --> conformetry_configuration
  conformetry_examples --> conformetry_generation
  conformetry_examples --> conformetry_nx
  conformetry_examples --> conformetry_output
  conformetry_examples --> conformetry_validation
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class conformetry_examples subject
```

_Dashed edges are dependencies Nx inferred from configuration rather than from code._
<!-- codependix:end name="codependix-nx-projects" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs-modules" -->
_This project defines no NestJS modules to graph._
<!-- codependix:end name="codependix-nestjs-modules" -->

### File Imports

<!-- codependix:start name="codependix-file-imports" -->
_This project has no internal file imports._
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-1100-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-105.81_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-90-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-50-3178c6?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-49-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-7-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-2-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-67-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-1-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-14-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-17-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-22-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-12-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-33-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-1-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-70-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-33-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-36-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-173-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-309-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-1-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-1-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-6-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-1-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-0-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-2-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-2-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-0-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-0-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-9-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-276-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-61-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-184-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-126-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-24-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-32-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-225-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-6-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-0-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-0-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-0-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-0-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-0-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-0-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-0-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-0-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-0-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-2-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-6-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-2-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-0-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-2-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-0-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-0-64748b?style=flat-square)

### Shell

![Shell Files](https://img.shields.io/badge/Shell_Files-0-89e051?style=flat-square)
![Shell Lines](https://img.shields.io/badge/Shell_Lines-0-4eaa25?style=flat-square)
![Shell Functions](https://img.shields.io/badge/Shell_Functions-0-16a34a?style=flat-square)
![Shell Variables](https://img.shields.io/badge/Shell_Variables-0-0284c7?style=flat-square)
![Shell Exports](https://img.shields.io/badge/Shell_Exports-0-ea580c?style=flat-square)
![Shell Conditionals](https://img.shields.io/badge/Shell_Conditionals-0-7c3aed?style=flat-square)
![Shell Loops](https://img.shields.io/badge/Shell_Loops-0-8b5cf6?style=flat-square)
![Shell Pipelines](https://img.shields.io/badge/Shell_Pipelines-0-059669?style=flat-square)
![Shebangs](https://img.shields.io/badge/Shebangs-0-6b7280?style=flat-square)
![Shell Comments](https://img.shields.io/badge/Shell_Comments-0-64748b?style=flat-square)
![Shell Comment Lines](https://img.shields.io/badge/Shell_Comment_Lines-0-475569?style=flat-square)

### SQL

![SQL Files](https://img.shields.io/badge/SQL_Files-0-e38c00?style=flat-square)
![SQL Lines](https://img.shields.io/badge/SQL_Lines-0-f29111?style=flat-square)
![SQL Statements](https://img.shields.io/badge/SQL_Statements-0-7c3aed?style=flat-square)
![SQL Selects](https://img.shields.io/badge/SQL_Selects-0-16a34a?style=flat-square)
![SQL Inserts](https://img.shields.io/badge/SQL_Inserts-0-22c55e?style=flat-square)
![SQL Updates](https://img.shields.io/badge/SQL_Updates-0-0ea5e9?style=flat-square)
![SQL Deletes](https://img.shields.io/badge/SQL_Deletes-0-dc2626?style=flat-square)
![SQL Creates](https://img.shields.io/badge/SQL_Creates-0-0284c7?style=flat-square)
![SQL Joins](https://img.shields.io/badge/SQL_Joins-0-8b5cf6?style=flat-square)
![SQL CTEs](https://img.shields.io/badge/SQL_CTEs-0-059669?style=flat-square)
![SQL Comments](https://img.shields.io/badge/SQL_Comments-0-64748b?style=flat-square)

### HCL

![HCL Files](https://img.shields.io/badge/HCL_Files-0-844fba?style=flat-square)
![HCL Lines](https://img.shields.io/badge/HCL_Lines-0-a78bfa?style=flat-square)
![HCL Blocks](https://img.shields.io/badge/HCL_Blocks-0-7c3aed?style=flat-square)
![HCL Resources](https://img.shields.io/badge/HCL_Resources-0-0284c7?style=flat-square)
![HCL Variables](https://img.shields.io/badge/HCL_Variables-0-16a34a?style=flat-square)
![HCL Outputs](https://img.shields.io/badge/HCL_Outputs-0-059669?style=flat-square)
![HCL Attributes](https://img.shields.io/badge/HCL_Attributes-0-0ea5e9?style=flat-square)
![HCL Interpolations](https://img.shields.io/badge/HCL_Interpolations-0-db2777?style=flat-square)
![HCL Comments](https://img.shields.io/badge/HCL_Comments-0-64748b?style=flat-square)

### CSS

![CSS Files](https://img.shields.io/badge/CSS_Files-0-264de4?style=flat-square)
![CSS Lines](https://img.shields.io/badge/CSS_Lines-0-2965f1?style=flat-square)
![CSS Rules](https://img.shields.io/badge/CSS_Rules-0-7c3aed?style=flat-square)
![CSS Selectors](https://img.shields.io/badge/CSS_Selectors-0-8b5cf6?style=flat-square)
![CSS Declarations](https://img.shields.io/badge/CSS_Declarations-0-0284c7?style=flat-square)
![CSS At Rules](https://img.shields.io/badge/CSS_At_Rules-0-f97316?style=flat-square)
![CSS Media Queries](https://img.shields.io/badge/CSS_Media_Queries-0-ea580c?style=flat-square)
![CSS Custom Properties](https://img.shields.io/badge/CSS_Custom_Properties-0-16a34a?style=flat-square)
![CSS Comments](https://img.shields.io/badge/CSS_Comments-0-64748b?style=flat-square)

### Conventions

![Module Files](https://img.shields.io/badge/Module_Files-1-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-15-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-6-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-6-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-0-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-1-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-0-0284c7?style=flat-square)
![CSS Comment Budget](https://img.shields.io/badge/CSS_Comment_Budget-0-16a34a?style=flat-square)
![HCL Comment Budget](https://img.shields.io/badge/HCL_Comment_Budget-0-ea580c?style=flat-square)
![Python Comment Budget](https://img.shields.io/badge/Python_Comment_Budget-0-db2777?style=flat-square)
![SQL Comment Budget](https://img.shields.io/badge/SQL_Comment_Budget-0-0ea5e9?style=flat-square)
![TOML Comment Budget](https://img.shields.io/badge/TOML_Comment_Budget-0-059669?style=flat-square)
![TypeScript Comment Budget](https://img.shields.io/badge/TypeScript_Comment_Budget-0-ca8a04?style=flat-square)
![YAML Comment Budget](https://img.shields.io/badge/YAML_Comment_Budget-0-7c3aed?style=flat-square)
![Shell Comment Budget](https://img.shields.io/badge/Shell_Comment_Budget-0-0284c7?style=flat-square)

### Jupyter

![Notebooks](https://img.shields.io/badge/Notebooks-2-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-4-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-2-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-2-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-0-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-0-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-2-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-0-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-0-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-0-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-0-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-4-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-2-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-0-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-24-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-34-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-5-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-38-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-1546-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-38-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-89-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-9-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-151-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-9-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-24-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-16-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-118-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-70-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-74-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-307-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-2-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- codometer:end -->

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `projects/ic-suite/conformetry/conformetry-examples`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 2 |
| Files | 16 |
| Calls traced | 7 |
| Call stacks | 1 |
| Deepest stack | 13 |
| Stacks through recursion | 0 |
| Unfollowable calls | 0 |

### Limits

What this project is judged against. `declared` is the number in this project's own `callidescope.config.ts`; `inherited` is the one the run supplies for every project that names none.

| Limit | Value | Origin |
| --- | --- | --- |
| `maximumDepth` | 13 | declared |
| `maximumBreadth` | 6 | declared |

### Call stacks (depth)

**1. `main`** — depth ≥ 13 · orphan-root

```text
🚀 main(): Promise<void> [projects/ic-suite/conformetry/conformetry-examples/examples/embedding/embed.ts:44]
   ↳ Generates one instance, then measures the committed ones, using nothing but the runtime packages.
  └─> ValidationService.validate(args: RunValidationArguments): RunValidationResult [projects/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation.service.ts:136]
     ↳ Validates every instance and returns the differences found.
    └─> InstanceDiscoveryService.matchInstances(…): ResolvedInstances [projects/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:95]
       ↳ Resolves every instance to the template, or templates, that explain it.
      └─> InstanceDiscoveryMatchingService.matchInstances(…): ResolvedInstances [projects/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:93]
         ↳ Resolves every instance to the template — or templates — that explain it.
        └─> InstanceDiscoveryMatchingService.matchTemplates(…): TemplateMatch[] [projects/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:154]
           ↳ Weighs every template that shares at least one file with the instance, best-first.
          └─> InstanceDiscoveryMatchingService.map(…)(…): { matchedFileCount: number; matchRatio: number; template: TemplateDefinition; } [projects/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:160]
            └─> TemplateDiscoveryService.countMatchingFiles(…): number [projects/ic-suite/conformetry/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:120]
               ↳ Counts how many of a template's files the instance path already has.
              └─> TemplateDiscoveryService.filter(…)(templateFilePath: string): boolean [projects/ic-suite/conformetry/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:129]
                └─> TemplateDiscoveryService.resolveInstanceFilePath(…): string [projects/ic-suite/conformetry/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:178]
                   ↳ Maps a template file path to the instance file path it governs.
                  └─> RenderingService.renderPath(…): string [projects/ic-suite/conformetry/conformetry-generation/src/modules/rendering/rendering.service.ts:142]
                     ↳ Renders a template path with mustache, the same way contents are rendered.
                    └─> RenderingService.assertEverySubstitutionSupplied(…): void [projects/ic-suite/conformetry/conformetry-generation/src/modules/rendering/rendering.service.ts:35]
                       ↳ Refuses to render a template asking for a value nobody supplied.
                      └─> RenderingService.collectInterpolatedNames(template: string): string[] [projects/ic-suite/conformetry/conformetry-generation/src/modules/rendering/rendering.service.ts:61]
                         ↳ Every placeholder a template interpolates, deduplicated.
                        └─> RenderingService.walk(spans: TemplateSpans): void [projects/ic-suite/conformetry/conformetry-generation/src/modules/rendering/rendering.service.ts:63]
```

### Module spread

| Callable | Spread | Calls directly | Location |
| --- | --- | --- | --- |
| `main` | 13 | `projects/ic-suite/conformetry/conformetry-configuration:modules/configuration`, `projects/ic-suite/conformetry/conformetry-configuration:modules/template-discovery`, `projects/ic-suite/conformetry/conformetry-core:modules/reporting`, `projects/ic-suite/conformetry/conformetry-generation:modules/generation`, `projects/ic-suite/conformetry/conformetry-validation:modules/validation` | `projects/ic-suite/conformetry/conformetry-examples/examples/embedding/embed.ts:44` |

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `main` | 6 | `ConfigurationService.loadConformetryConfiguration`, `GenerationService.runGenerator`, `ValidationService.validate`, `flatMap(…)`, `TemplateDiscoveryService.collectTemplates`, `ReportingService.formatReport` | `projects/ic-suite/conformetry/conformetry-examples/examples/embedding/embed.ts:44` |
| `flatMap(…)` | 1 | `InstanceDiscoveryService.findInstances` | `projects/ic-suite/conformetry/conformetry-examples/examples/embedding/embed.ts:81` |

### Possibly misplaced

None.
<!-- callidescope:end -->
