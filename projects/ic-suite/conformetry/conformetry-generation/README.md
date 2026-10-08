# 👔 Conformetry Generation

[![npm](https://img.shields.io/npm/v/@conformetry/generation?logo=npm&label=npm)](https://www.npmjs.com/package/@conformetry/generation)

The generation runtime for [Conformetry](../conformetry-cli/README.md): it
walks a template tree, renders every path and every file, and writes the
result.

```bash
npm install --save-dev @conformetry/generation
```

## Usage

```ts
import { GenerationService } from "@conformetry/generation";

const result = await generationService.runGenerator({
  definition: {
    name: "nestjs-service-module",
    templateDirectoryPath: "templates/nestjs-service-module",
  },
  inputs: { name: "billing" },
  instancePath: "packages/billing/src/modules",
});
// → { generatedFilePaths: [...], outputDirectoryPath: "..." }
```

The lifecycle is `preGenerate` → render → `postGenerate` → format, and the
returned file paths are sorted.

## Rendering

`RenderingService` is the single owner of template substitution across the
whole toolchain. Generation renders templates to create files; validation
renders the _same_ templates to compare against files that already exist. Both
must substitute identically or validation would flag the files the generator
itself produced — which is why neither reimplements this.

Contents and paths are both rendered with
[mustache](https://mustache.github.io), HTML escaping disabled so substituted
values cannot corrupt source code. `buildNameSubstitutions` derives
`nameCamelCase`, `nameKebabCase`, `namePascalCase`, and `nameSnakeCase` from a
single name; callers merge their own inputs over the result, so an explicit
input of the same key always wins.

> **An interpolated placeholder nobody supplied raises
> `MissingSubstitutionError`.** Mustache would otherwise render it as an empty
> string rather than leaving the token visible, and because generation and
> validation render identically, both halves of the loop lost the same value and
> agreed that nothing was wrong. A hole rendered into both sides of a comparison
> is not something that comparison can report, so the renderer refuses instead.
> Validation never renders the hole either: it reads the missing value from the
> instance, and reports when it cannot.
>
> Section tags are exempt, deliberately: `{{#field}}` and `{{^field}}` are
> conditionals, so an absent name is how a template asks for a block to be
> skipped or taken. A supplied value that is the empty string is an answer too —
> only an absent key is a hole. Together those are how a template says
> "optional": ask with a section, interpolate inside it.

Paths once used a `__field__` syntax of their own, on the assumption that
braces were not portable across filesystems. They are — and the separate syntax
could not tell a placeholder from a Python dunder, so a template shipping
`__init__.py` depended on `init` never being a substitution.

## Adapters

Filesystem and formatter access go through `FileSystemAdapter` and
`FormatterAdapter`, defaulting to disk and a no-op. That is how
[`@conformetry/nx`](../conformetry-nx/README.md) reuses this runtime unchanged
against an Nx generator `Tree`. Rendering deliberately is _not_ an adapter, for
the reason above.

## Exports

`GenerationService`, `RenderingService`, their modules, and the
`FileSystemAdapter`, `FormatterAdapter`, `GeneratorDefinition`, and
`Substitutions` types.

## Test

```bash
nx run conformetry-generation:vitest
```

## License

MIT — see [LICENSE](../../../../LICENSE).

## 👔 Conformetry

This project was generated from the [nestjs-service-project](../../../../configuration/conformetry-templates/nestjs-service-project) conformetry template.

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `projects/ic-suite/conformetry/conformetry-generation`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 13 |
| Files | 11 |
| Calls traced | 10 |
| Call stacks | 1 |
| Deepest stack | 2 |
| Stacks through recursion | 0 |
| Unfollowable calls | 2 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 8 |
| `maximumBreadth` | 4 |

### Call stacks (depth)

**1. `GenerationService.listDirectory`** — depth 2 · orphan-root

```text
🚀 GenerationService.listDirectory(directoryPath: string): Promise<DirectoryEntry[]> [projects/ic-suite/conformetry/conformetry-generation/src/modules/generation/generation.service.ts:38]
  └─> GenerationService.map(…)(entry: Dirent<string>): { isDirectory: boolean; name: string; } [projects/ic-suite/conformetry/conformetry-generation/src/modules/generation/generation.service.ts:41]
```

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `GenerationService.runGenerator` | 4 | `GenerationService.resolveAdapters`, `GenerationService.normalizeInputs`, `GenerationService.buildSubstitutions`, `GenerationService.renderDirectory` | `projects/ic-suite/conformetry/conformetry-generation/src/modules/generation/generation.service.ts:190` |
| `GenerationService.renderDirectory` | 2 | `ConfigurationService.renderPath`, `GenerationService.renderFile` | `projects/ic-suite/conformetry/conformetry-generation/src/modules/generation/generation.service.ts:104` |
| `GenerationService.listDirectory` | 1 | `GenerationService.map(…)` | `projects/ic-suite/conformetry/conformetry-generation/src/modules/generation/generation.service.ts:38` |

<details>
<summary>2 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `GenerationService.buildSubstitutions` | 1 | `ConfigurationService.buildNameSubstitutions` | `projects/ic-suite/conformetry/conformetry-generation/src/modules/generation/generation.service.ts:74` |
| `GenerationService.renderFile` | 1 | `ConfigurationService.renderContent` | `projects/ic-suite/conformetry/conformetry-generation/src/modules/generation/generation.service.ts:153` |

</details>
<!-- callidescope:end -->

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
  conformetry_cli --> conformetry_generation
  conformetry_examples --> conformetry_generation
  conformetry_generation --> conformetry_configuration
  conformetry_nx --> conformetry_generation
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class conformetry_generation subject
```
<!-- codependix:end name="codependix-nx-projects" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs-modules" -->
```mermaid
flowchart LR
  ConfigurationModule
  GenerationModule
  InputModule
  InstanceDiscoveryModule
  InstanceGroupModule
  RenderingModule
  TemplateDiscoveryModule
  ConfigurationModule --> InputModule
  ConfigurationModule --> InstanceDiscoveryModule
  ConfigurationModule --> InstanceGroupModule
  ConfigurationModule --> RenderingModule
  ConfigurationModule --> TemplateDiscoveryModule
  GenerationModule --> ConfigurationModule
  InstanceDiscoveryModule --> InstanceGroupModule
  InstanceDiscoveryModule --> RenderingModule
  InstanceDiscoveryModule --> TemplateDiscoveryModule
  TemplateDiscoveryModule --> RenderingModule
```
<!-- codependix:end name="codependix-nestjs-modules" -->

### File Imports

<!-- codependix:start name="codependix-file-imports" -->
```mermaid
graph LR
  file_callidescope_config_ts["callidescope.config.ts"]
  file_codependix_config_ts["codependix.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_modules_generation_generation_constants_ts["src/modules/generation/generation.constants.ts"]
  file_src_modules_generation_generation_module_ts["src/modules/generation/generation.module.ts"]
  file_src_modules_generation_generation_module_unit_test_ts["src/modules/generation/generation.module.unit.test.ts"]
  file_src_modules_generation_generation_service_ts["src/modules/generation/generation.service.ts"]
  file_src_modules_generation_generation_service_unit_test_ts["src/modules/generation/generation.service.unit.test.ts"]
  file_src_modules_generation_generation_types_ts["src/modules/generation/generation.types.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vite_config_ts["vite.config.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_modules_generation_generation_module_ts --> file_src_modules_generation_generation_service_ts
  file_src_modules_generation_generation_module_unit_test_ts --> file_src_modules_generation_generation_module_ts
  file_src_modules_generation_generation_service_ts --> file_src_modules_generation_generation_types_ts
  file_src_modules_generation_generation_service_unit_test_ts --> file_src_modules_generation_generation_service_ts
  file_src_modules_generation_generation_service_unit_test_ts --> file_src_modules_generation_generation_types_ts
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-1241-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-48.14_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-5-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-18-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-5.70_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-18-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-8-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-4-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-33-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-3-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-9-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-7-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-52-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-27-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-59-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-20-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-57-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-41-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-18-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-63-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-184-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-0-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-0-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-0-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-0-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-0-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-0-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-0-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-0-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-0-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-4-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-148-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-32-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-94-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-79-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-35-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-133-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-7-ea580c?style=flat-square)

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

![TOML Files](https://img.shields.io/badge/TOML_Files-0-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-0-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-0-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-0-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-0-0284c7?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-2-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-2-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-2-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-2-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-3-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-0-7c3aed?style=flat-square)
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

![Notebooks](https://img.shields.io/badge/Notebooks-0-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-0-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-0-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-0-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-0-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-0-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-0-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-0-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-0-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-0-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-0-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-0-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-0-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-0-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-0-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-0-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-0-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-1-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-222-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-7-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-12-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-45-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-6-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-25-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-2-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-10-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-9-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-11-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-73-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- codometer:end -->
