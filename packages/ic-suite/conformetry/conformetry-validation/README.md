# 👔 Conformetry Validation

[![npm](https://img.shields.io/npm/v/@conformetry/validation?logo=npm&label=npm)](https://www.npmjs.com/package/@conformetry/validation)

The validation orchestrator for [Conformetry](../conformetry-cli/README.md):
it matches instances to templates, checks the declared files exist, routes
each document to the validator that claims its extension, and deduplicates
what comes back.

```bash
npm install --save-dev @conformetry/validation
```

## Usage

```ts
import { ValidationService } from "@conformetry/validation";

const result = validationService.validate({
  instances, // from DiscoveryService.findInstances
  templates, // from DiscoveryService.collectTemplate
  languageNames: ["typescript"], // optional filter
  threshold: 0.9, // optional run-level conformance floor
});
// → { ok, fileResults, checkedPaths, scores, unmatched }
```

Instances arrive from the caller. This package used to scan the workspace for
`project.json` files and infer scope from generator name suffixes, which made a
generic package depend on one repository's layout.

## Order of checks

1. **Files exist.** Every file the matched template declares is checked first,
   whatever its extension. A missing file cannot be compared, and reporting it
   once is clearer than every language reporting it in turn. See
   [`@conformetry/languages`](../conformetry-languages/README.md), whose
   `FilesService` owns that pass.
2. **Documents compare.** Each validator sees only the documents whose
   extensions it claims.

Instances that matched no template are reported alongside the content
differences rather than skipped, so one report covers both "this file is wrong"
and "conformetry cannot tell what this path was generated from".

## Scoring

Each matched instance is scored by how much of its template it honours, and
passes when that reaches the threshold resolved for it — the instance group's,
else the generator's, else the run's, else a perfect `1`.

Scores are taken **before** deduplication. Deduplication decides which template
gets to _print_ a shared file's finding, which is a reporting concern; a score
answers how well one instance honours its own template, so collapsing the
report must not change it.

`ok` is `false` when any instance falls below its threshold, or when any
instance matched no template at all — an unmatched path has no template to be
held to, so no threshold could excuse it.

## Language resolution

Which languages a run needs is
[`@conformetry/languages`](../conformetry-languages/README.md)'s question, not
this package's. `LanguagesService` is injected, asked which engines claim the
extensions the run's templates declare, and its answer is what `validate`
dispatches over. An extension no language claims is compared line by line by
the text fallback, so no template file goes unchecked.

Nothing is imported on demand any more. That mechanism bought install-time
optionality nobody was spending — the fallback makes every run need the
package regardless — so the specifier registry, the module loader, and the
`loadLanguageModule` option went with it. The trade-off, and the three
alternatives weighed against it, are recorded in
[ADR 0006](../../../../docs/adr/0006-hold-every-conformetry-language-in-one-package.md).

## Exports

`ValidationService`, `ValidationDeduplicationService`,
`ValidationFindingsService`, `ValidationScoringService`, `ValidationModule`,
and the `RunValidationArguments`, `RunValidationResult`, and
`InstanceFileResults` types.

## Test

```bash
nx run conformetry-validation:vitest
```

## License

MIT — see [LICENSE](../../../../LICENSE).

## 👔 Conformetry

This project was generated from the [nestjs-service-project](../../../../configuration/conformetry-templates/nestjs-service-project) conformetry template.

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `packages/ic-suite/conformetry/conformetry-validation`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 43 |
| Files | 18 |
| Calls traced | 43 |
| Call stacks | 0 |
| Deepest stack | 0 |
| Stacks through recursion | 0 |
| Unfollowable calls | 1 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 13 |
| `maximumBreadth` | 10 |

### Call stacks (depth)

None.

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `ValidationService.validate` | 10 | `ConfigurationService.matchInstances`, `ValidationService.selectValidators`, `LanguagesService.resolveValidators`, `ValidationService.readTemplateExtensions`, `ValidationService.map(…)`, `ValidationScoringService.scoreInstances`, `ValidationDeduplicationService.deduplicate`, `ValidationFindingsService.buildUnmatchedResults`, `ValidationService.map(…)`, `ValidationService.every(…)` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation.service.ts:136` |
| `ValidationService.validateInstance` | 6 | `ConfigurationService.prepareDocuments`, `ValidationService.flatMap(…)`, `FilesService.checkInstanceFiles`, `ValidationService.map(…)`, `ValidationService.flatMap(…)`, `ValidationService.reduce(…)` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation.service.ts:87` |
| `RunnerService.runValidator` | 4 | `RunnerService.map(…)`, `RunnerService.filter(…)`, `RunnerService.filter(…)`, `RunnerService.reduce(…)` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/runner/runner.service.ts:81` |

<details>
<summary>17 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `ValidationScoringService.scoreInstance` | 4 | `ValidationScoringService.reduce(…)`, `ScoringService.calculateScore`, `ValidationScoringService.resolveThreshold`, `ValidationScoringService.resolveInstancePath` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation-scoring.service.ts:74` |
| `ValidationDeduplicationService.deduplicate` | 2 | `ValidationDeduplicationService.selectOwners`, `ValidationDeduplicationService.flatMap(…)` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation-deduplication.service.ts:90` |
| `ValidationFindingsService.buildUnmatchedResults` | 2 | `ValidationFindingsService.resolveTemplatesRootPath`, `ValidationFindingsService.map(…)` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation-findings.service.ts:68` |
| `ValidationScoringService.scoreInstances` | 2 | `ValidationScoringService.scoreInstance`, `ValidationScoringService.resolveScoreKey` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation-scoring.service.ts:111` |
| `RunnerService.filter(…)` | 1 | `RunnerService.claimsDocument` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/runner/runner.service.ts:85` |
| `RunnerService.map(…)` | 1 | `RunnerService.validateDocument` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/runner/runner.service.ts:88` |
| `ValidationDeduplicationService.selectOwners` | 1 | `ValidationDeduplicationService.compareInstances` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation-deduplication.service.ts:57` |
| `ValidationDeduplicationService.flatMap(…)` | 1 | `ValidationDeduplicationService.filter(…)` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation-deduplication.service.ts:94` |
| `ValidationDeduplicationService.filter(…)` | 1 | `ValidationDeduplicationService.resolveFindingKey` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation-deduplication.service.ts:95` |
| `ValidationFindingsService.resolveTemplatesRootPath` | 1 | `ValidationFindingsService.map(…)` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation-findings.service.ts:57` |
| `ValidationFindingsService.map(…)` | 1 | `ValidationFindingsService.describeReason` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation-findings.service.ts:74` |
| `ValidationScoringService.reduce(…)` | 1 | `ScoringService.sumWeights` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation-scoring.service.ts:75` |
| `ValidationService.readTemplateExtensions` | 1 | `ValidationService.flatMap(…)` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation.service.ts:50` |
| `ValidationService.flatMap(…)` | 1 | `ValidationService.map(…)` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation.service.ts:53` |
| `ValidationService.selectValidators` | 1 | `ValidationService.filter(…)` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation.service.ts:63` |
| `ValidationService.map(…)` | 1 | `RunnerService.runValidator` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation.service.ts:100` |
| `ValidationService.map(…)` | 1 | `ValidationService.validateInstance` | `packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation.service.ts:147` |

</details>
<!-- callidescope:end -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  conformetry_cli["conformetry-cli"]
  conformetry_configuration["conformetry-configuration"]
  conformetry_core["conformetry-core"]
  conformetry_examples["conformetry-examples"]
  conformetry_languages["conformetry-languages"]
  conformetry_nx["conformetry-nx"]
  conformetry_validation["conformetry-validation"]
  conformetry_cli --> conformetry_validation
  conformetry_examples --> conformetry_validation
  conformetry_nx --> conformetry_validation
  conformetry_validation --> conformetry_configuration
  conformetry_validation --> conformetry_core
  conformetry_validation --> conformetry_languages
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class conformetry_validation subject
```
<!-- codependix:end name="codependix-nx-projects" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs-modules" -->
```mermaid
flowchart LR
  ConfigurationModule
  DifferencesModule
  FilesModule
  InputModule
  InstanceDiscoveryModule
  InstanceGroupModule
  JsonModule
  JupyterModule
  LanguagesModule
  MarkdownModule
  PythonModule
  RenderingModule
  RunnerModule
  ScoringModule
  TemplateDiscoveryModule
  TextModule
  TypescriptModule
  ValidationModule
  ConfigurationModule --> InputModule
  ConfigurationModule --> InstanceDiscoveryModule
  ConfigurationModule --> InstanceGroupModule
  ConfigurationModule --> RenderingModule
  ConfigurationModule --> TemplateDiscoveryModule
  FilesModule --> ConfigurationModule
  FilesModule --> DifferencesModule
  InstanceDiscoveryModule --> InstanceGroupModule
  InstanceDiscoveryModule --> RenderingModule
  InstanceDiscoveryModule --> TemplateDiscoveryModule
  JsonModule --> ScoringModule
  JupyterModule --> JsonModule
  JupyterModule --> MarkdownModule
  JupyterModule --> PythonModule
  LanguagesModule --> JsonModule
  LanguagesModule --> JupyterModule
  LanguagesModule --> MarkdownModule
  LanguagesModule --> PythonModule
  LanguagesModule --> TextModule
  LanguagesModule --> TypescriptModule
  MarkdownModule --> ScoringModule
  PythonModule --> DifferencesModule
  PythonModule --> ScoringModule
  TemplateDiscoveryModule --> RenderingModule
  TypescriptModule --> ScoringModule
  ValidationModule --> ConfigurationModule
  ValidationModule --> FilesModule
  ValidationModule --> LanguagesModule
  ValidationModule --> RunnerModule
  ValidationModule --> ScoringModule
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
  file_src_modules_runner_runner_constants_ts["src/modules/runner/runner.constants.ts"]
  file_src_modules_runner_runner_module_ts["src/modules/runner/runner.module.ts"]
  file_src_modules_runner_runner_module_unit_test_ts["src/modules/runner/runner.module.unit.test.ts"]
  file_src_modules_runner_runner_service_ts["src/modules/runner/runner.service.ts"]
  file_src_modules_runner_runner_service_unit_test_ts["src/modules/runner/runner.service.unit.test.ts"]
  file_src_modules_runner_runner_types_ts["src/modules/runner/runner.types.ts"]
  file_src_modules_validation_validation_deduplication_service_ts["src/modules/validation/validation-deduplication.service.ts"]
  file_src_modules_validation_validation_deduplication_service_unit_test_ts["src/modules/validation/validation-deduplication.service.unit.test.ts"]
  file_src_modules_validation_validation_findings_service_ts["src/modules/validation/validation-findings.service.ts"]
  file_src_modules_validation_validation_findings_service_unit_test_ts["src/modules/validation/validation-findings.service.unit.test.ts"]
  file_src_modules_validation_validation_scoring_service_ts["src/modules/validation/validation-scoring.service.ts"]
  file_src_modules_validation_validation_scoring_service_unit_test_ts["src/modules/validation/validation-scoring.service.unit.test.ts"]
  file_src_modules_validation_validation_constants_ts["src/modules/validation/validation.constants.ts"]
  file_src_modules_validation_validation_module_ts["src/modules/validation/validation.module.ts"]
  file_src_modules_validation_validation_service_ts["src/modules/validation/validation.service.ts"]
  file_src_modules_validation_validation_service_unit_test_ts["src/modules/validation/validation.service.unit.test.ts"]
  file_src_modules_validation_validation_types_ts["src/modules/validation/validation.types.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vite_config_ts["vite.config.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_modules_runner_runner_module_ts --> file_src_modules_runner_runner_service_ts
  file_src_modules_runner_runner_module_unit_test_ts --> file_src_modules_runner_runner_module_ts
  file_src_modules_runner_runner_module_unit_test_ts --> file_src_modules_runner_runner_service_ts
  file_src_modules_runner_runner_service_ts --> file_src_modules_runner_runner_types_ts
  file_src_modules_runner_runner_service_unit_test_ts --> file_src_modules_runner_runner_service_ts
  file_src_modules_validation_validation_deduplication_service_ts --> file_src_modules_validation_validation_constants_ts
  file_src_modules_validation_validation_deduplication_service_ts --> file_src_modules_validation_validation_types_ts
  file_src_modules_validation_validation_deduplication_service_unit_test_ts --> file_src_modules_validation_validation_deduplication_service_ts
  file_src_modules_validation_validation_deduplication_service_unit_test_ts --> file_src_modules_validation_validation_types_ts
  file_src_modules_validation_validation_findings_service_unit_test_ts --> file_src_modules_validation_validation_findings_service_ts
  file_src_modules_validation_validation_scoring_service_ts --> file_src_modules_validation_validation_constants_ts
  file_src_modules_validation_validation_scoring_service_ts --> file_src_modules_validation_validation_types_ts
  file_src_modules_validation_validation_scoring_service_unit_test_ts --> file_src_modules_validation_validation_scoring_service_ts
  file_src_modules_validation_validation_module_ts --> file_src_modules_runner_runner_module_ts
  file_src_modules_validation_validation_module_ts --> file_src_modules_validation_validation_deduplication_service_ts
  file_src_modules_validation_validation_module_ts --> file_src_modules_validation_validation_findings_service_ts
  file_src_modules_validation_validation_module_ts --> file_src_modules_validation_validation_scoring_service_ts
  file_src_modules_validation_validation_module_ts --> file_src_modules_validation_validation_service_ts
  file_src_modules_validation_validation_service_ts --> file_src_modules_runner_runner_service_ts
  file_src_modules_validation_validation_service_ts --> file_src_modules_validation_validation_deduplication_service_ts
  file_src_modules_validation_validation_service_ts --> file_src_modules_validation_validation_findings_service_ts
  file_src_modules_validation_validation_service_ts --> file_src_modules_validation_validation_scoring_service_ts
  file_src_modules_validation_validation_service_ts --> file_src_modules_validation_validation_types_ts
  file_src_modules_validation_validation_service_unit_test_ts --> file_src_modules_validation_validation_module_ts
  file_src_modules_validation_validation_service_unit_test_ts --> file_src_modules_validation_validation_service_ts
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-1663-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-63.09_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-4-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-18-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-7.78_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-18-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-5-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-5-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-45-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-4-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-11-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-5-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-74-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-31-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-91-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-14-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-84-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-72-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-15-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-88-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-220-475569?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-1-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-4-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-1-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-1-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-4-ca8a04?style=flat-square)
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
