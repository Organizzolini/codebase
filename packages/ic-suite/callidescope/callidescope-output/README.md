# 🔭 Callidescope Output

[![npm](https://img.shields.io/npm/v/@callidescope/output?logo=npm&label=npm)](https://www.npmjs.com/package/@callidescope/output)

**Renders call-graph findings into markdown, mermaid, and JSON output formats.**

This package sits between
[`@callidescope/graph`](../callidescope-graph/README.md), which it depends on
for the shapes it renders, and
[`@callidescope/cli`](../callidescope-cli/README.md), which orchestrates a run
and hands this package the findings.

```bash
npm install --save-dev @callidescope/output
```

## What This Package Owns

- **`output-markdown`** — anchored-block splicing into markdown files
- **`output-json`** — JSON file output
- **`report`** — assembles findings, as markdown or a mermaid diagram, into the reportable shape
- **`project-reports`** — per-project report sections, scoping a run's findings to the project each one came from

## Test

```bash
nx run callidescope-output:vitest
```

## 👔 Conformetry

This project was generated from the [nestjs-service-project](../../../../configuration/conformetry-templates/nestjs-service-project) conformetry template.

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `packages/ic-suite/callidescope/callidescope-output`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 137 |
| Files | 38 |
| Calls traced | 142 |
| Call stacks | 2 |
| Deepest stack | 4 |
| Stacks through recursion | 0 |
| Unfollowable calls | 1 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 13 |
| `maximumBreadth` | 7 |

### Call stacks (depth)

**1. `OutputMarkdownService.syncAnchoredBlock`** — depth ≥ 4 · orphan-root

```text
🚀 OutputMarkdownService.syncAnchoredBlock(…): boolean [packages/ic-suite/callidescope/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:161]
  └─> OutputMarkdownService.syncAnchoredBlock(args: SyncAnchoredBlockArguments): boolean [packages/ic-suite/callidescope/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:206]
     ↳ Splices the anchored block into a file.
    └─> OutputMarkdownService.buildBlockPattern(destination: SyncAnchoredBlockArguments["destination"]): RegExp [packages/ic-suite/callidescope/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:54]
       ↳ Builds the pattern matching everything between the two anchors.
      └─> OutputMarkdownService.escapePattern(value: string): string [packages/ic-suite/callidescope/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:63]
         ↳ Escapes a marker so it can sit inside a pattern.
```

**2. `OutputMarkdownService.wrapInAnchors`** — depth 2 · orphan-root

```text
🚀 OutputMarkdownService.wrapInAnchors(override: string | undefined): string [packages/ic-suite/callidescope/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:168]
  └─> OutputMarkdownService.wrapInAnchors(args: WrapInAnchorsArguments): string [packages/ic-suite/callidescope/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:236]
     ↳ Wraps content in the configured anchors.
```

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `MarkdownReportService.renderRun` | 7 | `MarkdownReportService.subsectionPrefix`, `WorkspaceReportService.buildRows`, `MarkdownReportService.renderSummaryTable`, `WorkspaceReportService.renderProjectIndex`, `WorkspaceReportService.renderHeadroom`, `MarkdownReportService.renderStacksAs`, `MarkdownReportService.renderCallableBreadths` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:305` |
| `MarkdownReportService.renderProjectSection` | 5 | `MarkdownReportService.renderSummaryTable`, `MarkdownReportService.renderProjectLimits`, `WorkspaceReportService.limitsFor`, `MarkdownReportService.renderStacksAs`, `MarkdownReportService.renderCallableBreadths` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:257` |
| `OutputMarkdownService.syncAnchoredBlock` | 5 | `MissingMarkdownPathError.constructor`, `OutputMarkdownService.readExisting`, `OutputMarkdownService.wrapInAnchors`, `OutputMarkdownService.buildBlockPattern`, `OutputMarkdownService.spliceBlock` | `packages/ic-suite/callidescope/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:206` |

<details>
<summary>68 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `AddressReportService.renderBreadthDiagram` | 4 | `AddressReportService.toFrame`, `AddressReportService.map(…)`, `AddressReportService.map(…)`, `MermaidReportService.renderStacks` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:61` |
| `ProjectReportsService.buildSummary` | 4 | `ProjectReportsService.filter(…)`, `ProjectReportsService.filter(…)`, `ProjectReportsService.reduce(…)`, `ProjectReportsService.filter(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:133` |
| `ReportFindingsService.reportFindings` | 4 | `ReportFindingsService.reportStaleness`, `ReportFindingsService.reportDeepStacks`, `ReportFindingsService.reportWideCallables`, `ReportFindingsService.reportEmptyTrace` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report-findings/report-findings.service.ts:127` |
| `WriteDestinationsService.syncDestinations` | 4 | `OutputJsonService.sync`, `OutputMarkdownService.sync`, `MarkdownReportService.renderRun`, `WriteDestinationsService.syncProjectDestinations` | `packages/ic-suite/callidescope/callidescope-output/src/modules/write-destinations/write-destinations.service.ts:121` |
| `MermaidReportService.renderStacks` | 3 | `MermaidReportService.countNewCallables`, `MermaidReportService.addStack`, `MermaidReportService.renderDiagram` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/mermaid-report.service.ts:139` |
| `ReportService.renderFrame` | 3 | `ReportService.renderSignature`, `ReportService.renderMarkers`, `ReportService.shortenSummary` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/report.service.ts:44` |
| `MarkdownReportService.renderCallableBreadths` | 3 | `MarkdownReportService.renderTable`, `MarkdownReportService.map(…)`, `MarkdownReportService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:69` |
| `AddressReportService.renderBreadth` | 3 | `AddressReportService.buildBreadthPayload`, `AddressReportService.renderBreadthDiagram`, `AddressReportService.renderReferenceTable` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:153` |
| `AddressReportService.renderDepth` | 3 | `AddressReportService.buildDepthPayload`, `MermaidReportService.renderStacks`, `AddressReportService.renderDepthStacks` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:208` |
| `OutputMarkdownService.spliceBlock` | 3 | `OutputMarkdownService.replace(…)`, `OutputMarkdownService.appendBlock`, `OutputMarkdownService.replaceOrphanedBlock` | `packages/ic-suite/callidescope/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:123` |
| `ProjectReportsService.build` | 3 | `ProjectReportsService.buildStacks`, `ProjectReportsService.buildCallableBreadths`, `ProjectReportsService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:229` |
| `ProjectReportsService.map(…)` | 3 | `ProjectReportsService.toSorted(…)`, `ProjectReportsService.toSorted(…)`, `ProjectReportsService.buildSummary` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:233` |
| `ProjectReportsService.findOwnedFindings` | 3 | `ProjectReportsService.filter(…)`, `ProjectReportsService.findDeepStacks`, `ProjectReportsService.findWideCallables` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:302` |
| `MermaidReportService.countNewCallables` | 2 | `MermaidReportService.filter(…)`, `MermaidReportService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/mermaid-report.service.ts:90` |
| `WorkspaceReportService.buildRows` | 2 | `WorkspaceReportService.map(…)`, `WorkspaceReportService.toSorted(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/workspace-report.service.ts:105` |
| `WorkspaceReportService.map(…)` | 2 | `WorkspaceReportService.limitsFor`, `WorkspaceReportService.widestBreadth` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/workspace-report.service.ts:106` |
| `WorkspaceReportService.renderHeadroom` | 2 | `WorkspaceReportService.map(…)`, `WorkspaceReportService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/workspace-report.service.ts:150` |
| `WorkspaceReportService.renderProjectIndex` | 2 | `WorkspaceReportService.buildRows`, `WorkspaceReportService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/workspace-report.service.ts:178` |
| `MarkdownReportService.renderStacksAs` | 2 | `MermaidReportService.renderStacks`, `MarkdownReportService.renderStacks` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:153` |
| `MarkdownReportService.renderFindings` | 2 | `MarkdownReportService.renderStacks`, `MarkdownReportService.renderWideCallableLines` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:239` |
| `AddressReportService.renderBreadthReports` | 2 | `AddressReportService.map(…)`, `AddressReportService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:193` |
| `AddressReportService.renderDepthReports` | 2 | `AddressReportService.map(…)`, `AddressReportService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:256` |
| `OutputJsonService.sync` | 2 | `OutputJsonService.buildReport`, `OutputJsonService.readExisting` | `packages/ic-suite/callidescope/callidescope-output/src/modules/output-json/output-json.service.ts:63` |
| `OutputMarkdownService.sync` | 2 | `OutputMarkdownService.syncAnchoredBlock`, `OutputMarkdownService.buildHelpers` | `packages/ic-suite/callidescope/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:177` |
| `ProjectReportsService.buildCallableBreadths` | 2 | `ProjectReportsService.flatMap(…)`, `SignaturesService.read` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:47` |
| `ProjectReportsService.buildStacks` | 2 | `ProjectReportsService.readDepth`, `PathsService.buildDeepestPath` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:87` |
| `ProjectReportsService.findProjectDeepStacks` | 2 | `ProjectReportsService.map(…)`, `ProjectReportsService.filter(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:169` |
| `ProjectReportsService.findProjectWideCallables` | 2 | `ProjectReportsService.map(…)`, `ProjectReportsService.filter(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:179` |
| `ProjectReportsService.findDeepStacks` | 2 | `ProjectReportsService.toSorted(…)`, `ProjectReportsService.flatMap(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:271` |
| `ProjectReportsService.flatMap(…)` | 2 | `ProjectReportsService.findProjectDeepStacks`, `ProjectReportsService.readProjectLimits` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:276` |
| `ProjectReportsService.findWideCallables` | 2 | `ProjectReportsService.toSorted(…)`, `ProjectReportsService.flatMap(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:364` |
| `ProjectReportsService.flatMap(…)` | 2 | `ProjectReportsService.findProjectWideCallables`, `ProjectReportsService.readProjectLimits` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:369` |
| `ReportFindingsService.reportDeepStacks` | 2 | `ReportFindingsService.map(…)`, `ReportFindingsService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report-findings/report-findings.service.ts:35` |
| `ReportFindingsService.reportWideCallables` | 2 | `ReportFindingsService.map(…)`, `ReportFindingsService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report-findings/report-findings.service.ts:92` |
| `WriteDestinationsService.syncProjectSections` | 2 | `OutputMarkdownService.sync`, `MarkdownReportService.renderProjectSection` | `packages/ic-suite/callidescope/callidescope-output/src/modules/write-destinations/write-destinations.service.ts:80` |
| `MermaidReportService.addFrame` | 1 | `MermaidReportService.renderLabel` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/mermaid-report.service.ts:39` |
| `MermaidReportService.addStack` | 1 | `MermaidReportService.addFrame` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/mermaid-report.service.ts:67` |
| `ReportService.shortenSummary` | 1 | `ReportService.readFirstSentence` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/report.service.ts:102` |
| `ReportService.renderStackTree` | 1 | `ReportService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/report.service.ts:130` |
| `ReportService.map(…)` | 1 | `ReportService.renderFrame` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/report.service.ts:132` |
| `WorkspaceReportService.widestBreadth` | 1 | `WorkspaceReportService.reduce(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/workspace-report.service.ts:88` |
| `WorkspaceReportService.map(…)` | 1 | `WorkspaceReportService.bucketFor` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/workspace-report.service.ts:151` |
| `WorkspaceReportService.map(…)` | 1 | `WorkspaceReportService.filter(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/workspace-report.service.ts:160` |
| `MarkdownReportService.toRow` | 1 | `MarkdownReportService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:73` |
| `MarkdownReportService.map(…)` | 1 | `MarkdownReportService.toRow` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:79` |
| `MarkdownReportService.map(…)` | 1 | `MarkdownReportService.toRow` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:94` |
| `MarkdownReportService.renderProjectLimits` | 1 | `MarkdownReportService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:126` |
| `MarkdownReportService.map(…)` | 1 | `MarkdownReportService.renderLimitCell` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:130` |
| `MarkdownReportService.renderStack` | 1 | `ReportService.renderStackTree` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:136` |
| `MarkdownReportService.renderWideCallableLines` | 1 | `MarkdownReportService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:199` |
| `MarkdownReportService.renderStacks` | 1 | `MarkdownReportService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:355` |
| `MarkdownReportService.map(…)` | 1 | `MarkdownReportService.renderStack` | `packages/ic-suite/callidescope/callidescope-output/src/modules/report/markdown-report.service.ts:360` |
| `AddressReportService.map(…)` | 1 | `AddressReportService.toFrame` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:72` |
| `AddressReportService.map(…)` | 1 | `AddressReportService.toFrame` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:75` |
| `AddressReportService.renderDepthStacks` | 1 | `AddressReportService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:84` |
| `AddressReportService.map(…)` | 1 | `ReportService.renderStackTree` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:95` |
| `AddressReportService.renderReferenceTable` | 1 | `AddressReportService.map(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:116` |
| `AddressReportService.map(…)` | 1 | `AddressReportService.buildBreadthPayload` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:196` |
| `AddressReportService.map(…)` | 1 | `AddressReportService.renderBreadth` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:203` |
| `AddressReportService.map(…)` | 1 | `AddressReportService.buildDepthPayload` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:259` |
| `AddressReportService.map(…)` | 1 | `AddressReportService.renderDepth` | `packages/ic-suite/callidescope/callidescope-output/src/modules/address-report/address-report.service.ts:266` |
| `OutputMarkdownService.buildBlockPattern` | 1 | `OutputMarkdownService.escapePattern` | `packages/ic-suite/callidescope/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:54` |
| `OutputMarkdownService.syncAnchoredBlock` | 1 | `OutputMarkdownService.syncAnchoredBlock` | `packages/ic-suite/callidescope/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:161` |
| `OutputMarkdownService.wrapInAnchors` | 1 | `OutputMarkdownService.wrapInAnchors` | `packages/ic-suite/callidescope/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:168` |
| `ProjectReportsService.filter(…)` | 1 | `ProjectReportsService.some(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:150` |
| `ProjectReportsService.findUnreadProjects` | 1 | `ProjectReportsService.filter(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:339` |
| `ProjectReportsService.filter(…)` | 1 | `ProjectReportsService.find(…)` | `packages/ic-suite/callidescope/callidescope-output/src/modules/project-reports/project-reports.service.ts:345` |
| `WriteDestinationsService.syncProjectDestinations` | 1 | `WriteDestinationsService.syncProjectSections` | `packages/ic-suite/callidescope/callidescope-output/src/modules/write-destinations/write-destinations.service.ts:53` |

</details>
<!-- callidescope:end -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  callidescope_cli["callidescope-cli"]
  callidescope_configuration["callidescope-configuration"]
  callidescope_core["callidescope-core"]
  callidescope_graph["callidescope-graph"]
  callidescope_nx["callidescope-nx"]
  callidescope_output["callidescope-output"]
  logging["logging"]
  callidescope_cli --> callidescope_output
  callidescope_nx --> callidescope_output
  callidescope_output --> callidescope_configuration
  callidescope_output --> callidescope_core
  callidescope_output --> callidescope_graph
  callidescope_output --> logging
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class callidescope_output subject
```
<!-- codependix:end name="codependix-nx-projects" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs-modules" -->
```mermaid
flowchart LR
  AddressReportModule
  CallablesModule
  ClassesModule
  DocumentationModule
  EdgesModule
  GraphModule
  LoggerModule([LoggerModule])
  OutputJsonModule
  OutputMarkdownModule
  ProgramModule
  ProjectReportsModule
  ReportFindingsModule
  ReportModule
  SignaturesModule
  WorkspaceModule
  WriteDestinationsModule
  AddressReportModule --> ReportModule
  CallablesModule --> ProgramModule
  CallablesModule --> WorkspaceModule
  EdgesModule --> CallablesModule
  EdgesModule --> ClassesModule
  EdgesModule --> ProgramModule
  EdgesModule --> WorkspaceModule
  GraphModule --> DocumentationModule
  GraphModule --> EdgesModule
  GraphModule --> SignaturesModule
  ProgramModule --> WorkspaceModule
  ProjectReportsModule --> GraphModule
  ProjectReportsModule --> SignaturesModule
  WriteDestinationsModule --> OutputJsonModule
  WriteDestinationsModule --> OutputMarkdownModule
  WriteDestinationsModule --> ReportModule
```

_Rounded modules are global: every module can inject them, so their edges are left out._
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
  file_src_modules_address_report_address_report_constants_ts["src/modules/address-report/address-report.constants.ts"]
  file_src_modules_address_report_address_report_module_ts["src/modules/address-report/address-report.module.ts"]
  file_src_modules_address_report_address_report_service_ts["src/modules/address-report/address-report.service.ts"]
  file_src_modules_address_report_address_report_service_unit_test_ts["src/modules/address-report/address-report.service.unit.test.ts"]
  file_src_modules_address_report_address_report_types_ts["src/modules/address-report/address-report.types.ts"]
  file_src_modules_output_json_output_json_constants_ts["src/modules/output-json/output-json.constants.ts"]
  file_src_modules_output_json_output_json_module_ts["src/modules/output-json/output-json.module.ts"]
  file_src_modules_output_json_output_json_service_ts["src/modules/output-json/output-json.service.ts"]
  file_src_modules_output_json_output_json_service_unit_test_ts["src/modules/output-json/output-json.service.unit.test.ts"]
  file_src_modules_output_json_output_json_types_ts["src/modules/output-json/output-json.types.ts"]
  file_src_modules_output_markdown_output_markdown_constants_ts["src/modules/output-markdown/output-markdown.constants.ts"]
  file_src_modules_output_markdown_output_markdown_module_ts["src/modules/output-markdown/output-markdown.module.ts"]
  file_src_modules_output_markdown_output_markdown_service_ts["src/modules/output-markdown/output-markdown.service.ts"]
  file_src_modules_output_markdown_output_markdown_service_unit_test_ts["src/modules/output-markdown/output-markdown.service.unit.test.ts"]
  file_src_modules_output_markdown_output_markdown_types_ts["src/modules/output-markdown/output-markdown.types.ts"]
  file_src_modules_project_reports_project_reports_constants_ts["src/modules/project-reports/project-reports.constants.ts"]
  file_src_modules_project_reports_project_reports_module_ts["src/modules/project-reports/project-reports.module.ts"]
  file_src_modules_project_reports_project_reports_service_ts["src/modules/project-reports/project-reports.service.ts"]
  file_src_modules_project_reports_project_reports_service_unit_test_ts["src/modules/project-reports/project-reports.service.unit.test.ts"]
  file_src_modules_project_reports_project_reports_types_ts["src/modules/project-reports/project-reports.types.ts"]
  file_src_modules_report_findings_report_findings_constants_ts["src/modules/report-findings/report-findings.constants.ts"]
  file_src_modules_report_findings_report_findings_module_ts["src/modules/report-findings/report-findings.module.ts"]
  file_src_modules_report_findings_report_findings_service_ts["src/modules/report-findings/report-findings.service.ts"]
  file_src_modules_report_findings_report_findings_service_unit_test_ts["src/modules/report-findings/report-findings.service.unit.test.ts"]
  file_src_modules_report_findings_report_findings_types_ts["src/modules/report-findings/report-findings.types.ts"]
  file_src_modules_report_markdown_report_service_ts["src/modules/report/markdown-report.service.ts"]
  file_src_modules_report_markdown_report_service_unit_test_ts["src/modules/report/markdown-report.service.unit.test.ts"]
  file_src_modules_report_mermaid_report_service_ts["src/modules/report/mermaid-report.service.ts"]
  file_src_modules_report_mermaid_report_service_unit_test_ts["src/modules/report/mermaid-report.service.unit.test.ts"]
  file_src_modules_report_report_constants_ts["src/modules/report/report.constants.ts"]
  file_src_modules_report_report_module_ts["src/modules/report/report.module.ts"]
  file_src_modules_report_report_service_ts["src/modules/report/report.service.ts"]
  file_src_modules_report_report_service_unit_test_ts["src/modules/report/report.service.unit.test.ts"]
  file_src_modules_report_report_types_ts["src/modules/report/report.types.ts"]
  file_src_modules_report_workspace_report_service_ts["src/modules/report/workspace-report.service.ts"]
  file_src_modules_report_workspace_report_service_unit_test_ts["src/modules/report/workspace-report.service.unit.test.ts"]
  file_src_modules_write_destinations_write_destinations_constants_ts["src/modules/write-destinations/write-destinations.constants.ts"]
  file_src_modules_write_destinations_write_destinations_module_ts["src/modules/write-destinations/write-destinations.module.ts"]
  file_src_modules_write_destinations_write_destinations_service_ts["src/modules/write-destinations/write-destinations.service.ts"]
  file_src_modules_write_destinations_write_destinations_service_unit_test_ts["src/modules/write-destinations/write-destinations.service.unit.test.ts"]
  file_src_modules_write_destinations_write_destinations_types_ts["src/modules/write-destinations/write-destinations.types.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_modules_ts["testing/modules.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vite_config_ts["vite.config.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_modules_address_report_address_report_module_ts --> file_src_modules_address_report_address_report_service_ts
  file_src_modules_address_report_address_report_module_ts --> file_src_modules_report_report_module_ts
  file_src_modules_address_report_address_report_service_ts --> file_src_modules_address_report_address_report_types_ts
  file_src_modules_address_report_address_report_service_ts --> file_src_modules_report_mermaid_report_service_ts
  file_src_modules_address_report_address_report_service_ts --> file_src_modules_report_report_service_ts
  file_src_modules_address_report_address_report_service_ts --> file_src_modules_report_report_types_ts
  file_src_modules_address_report_address_report_service_unit_test_ts --> file_src_modules_address_report_address_report_service_ts
  file_src_modules_address_report_address_report_service_unit_test_ts --> file_src_modules_report_mermaid_report_service_ts
  file_src_modules_address_report_address_report_service_unit_test_ts --> file_src_modules_report_report_service_ts
  file_src_modules_address_report_address_report_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_output_json_output_json_module_ts --> file_src_modules_output_json_output_json_service_ts
  file_src_modules_output_json_output_json_service_ts --> file_src_modules_output_json_output_json_types_ts
  file_src_modules_output_json_output_json_service_unit_test_ts --> file_src_modules_output_json_output_json_service_ts
  file_src_modules_output_json_output_json_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_output_json_output_json_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_output_markdown_output_markdown_module_ts --> file_src_modules_output_markdown_output_markdown_service_ts
  file_src_modules_output_markdown_output_markdown_service_ts --> file_src_modules_output_markdown_output_markdown_constants_ts
  file_src_modules_output_markdown_output_markdown_service_ts --> file_src_modules_output_markdown_output_markdown_types_ts
  file_src_modules_output_markdown_output_markdown_service_unit_test_ts --> file_src_modules_output_markdown_output_markdown_constants_ts
  file_src_modules_output_markdown_output_markdown_service_unit_test_ts --> file_src_modules_output_markdown_output_markdown_service_ts
  file_src_modules_output_markdown_output_markdown_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_output_markdown_output_markdown_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_project_reports_project_reports_module_ts --> file_src_modules_project_reports_project_reports_service_ts
  file_src_modules_project_reports_project_reports_service_ts --> file_src_modules_project_reports_project_reports_constants_ts
  file_src_modules_project_reports_project_reports_service_ts --> file_src_modules_project_reports_project_reports_types_ts
  file_src_modules_project_reports_project_reports_service_unit_test_ts --> file_src_modules_project_reports_project_reports_service_ts
  file_src_modules_project_reports_project_reports_service_unit_test_ts --> file_src_modules_project_reports_project_reports_types_ts
  file_src_modules_project_reports_project_reports_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_project_reports_project_reports_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_report_findings_report_findings_module_ts --> file_src_modules_report_findings_report_findings_service_ts
  file_src_modules_report_findings_report_findings_service_ts --> file_src_modules_report_findings_report_findings_types_ts
  file_src_modules_report_findings_report_findings_service_unit_test_ts --> file_src_modules_report_findings_report_findings_service_ts
  file_src_modules_report_findings_report_findings_service_unit_test_ts --> file_src_modules_report_findings_report_findings_types_ts
  file_src_modules_report_findings_report_findings_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_report_markdown_report_service_ts --> file_src_modules_report_mermaid_report_service_ts
  file_src_modules_report_markdown_report_service_ts --> file_src_modules_report_report_constants_ts
  file_src_modules_report_markdown_report_service_ts --> file_src_modules_report_report_service_ts
  file_src_modules_report_markdown_report_service_ts --> file_src_modules_report_report_types_ts
  file_src_modules_report_markdown_report_service_ts --> file_src_modules_report_workspace_report_service_ts
  file_src_modules_report_markdown_report_service_unit_test_ts --> file_src_modules_report_markdown_report_service_ts
  file_src_modules_report_markdown_report_service_unit_test_ts --> file_src_modules_report_report_constants_ts
  file_src_modules_report_markdown_report_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_report_markdown_report_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_report_mermaid_report_service_ts --> file_src_modules_report_report_constants_ts
  file_src_modules_report_mermaid_report_service_ts --> file_src_modules_report_report_types_ts
  file_src_modules_report_mermaid_report_service_unit_test_ts --> file_src_modules_report_mermaid_report_service_ts
  file_src_modules_report_mermaid_report_service_unit_test_ts --> file_src_modules_report_report_constants_ts
  file_src_modules_report_mermaid_report_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_report_mermaid_report_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_report_report_module_ts --> file_src_modules_report_markdown_report_service_ts
  file_src_modules_report_report_module_ts --> file_src_modules_report_mermaid_report_service_ts
  file_src_modules_report_report_module_ts --> file_src_modules_report_report_service_ts
  file_src_modules_report_report_module_ts --> file_src_modules_report_workspace_report_service_ts
  file_src_modules_report_report_service_ts --> file_src_modules_report_report_constants_ts
  file_src_modules_report_report_service_unit_test_ts --> file_src_modules_report_report_service_ts
  file_src_modules_report_report_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_report_report_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_report_report_types_ts --> file_src_modules_project_reports_project_reports_types_ts
  file_src_modules_report_workspace_report_service_ts --> file_src_modules_report_report_constants_ts
  file_src_modules_report_workspace_report_service_ts --> file_src_modules_report_report_types_ts
  file_src_modules_report_workspace_report_service_unit_test_ts --> file_src_modules_report_report_constants_ts
  file_src_modules_report_workspace_report_service_unit_test_ts --> file_src_modules_report_workspace_report_service_ts
  file_src_modules_report_workspace_report_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_report_workspace_report_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_write_destinations_write_destinations_module_ts --> file_src_modules_output_json_output_json_module_ts
  file_src_modules_write_destinations_write_destinations_module_ts --> file_src_modules_output_markdown_output_markdown_module_ts
  file_src_modules_write_destinations_write_destinations_module_ts --> file_src_modules_report_report_module_ts
  file_src_modules_write_destinations_write_destinations_module_ts --> file_src_modules_write_destinations_write_destinations_service_ts
  file_src_modules_write_destinations_write_destinations_service_ts --> file_src_modules_output_json_output_json_service_ts
  file_src_modules_write_destinations_write_destinations_service_ts --> file_src_modules_output_markdown_output_markdown_service_ts
  file_src_modules_write_destinations_write_destinations_service_ts --> file_src_modules_report_markdown_report_service_ts
  file_src_modules_write_destinations_write_destinations_service_ts --> file_src_modules_write_destinations_write_destinations_constants_ts
  file_src_modules_write_destinations_write_destinations_service_ts --> file_src_modules_write_destinations_write_destinations_types_ts
  file_src_modules_write_destinations_write_destinations_service_unit_test_ts --> file_src_modules_output_json_output_json_service_ts
  file_src_modules_write_destinations_write_destinations_service_unit_test_ts --> file_src_modules_output_markdown_output_markdown_service_ts
  file_src_modules_write_destinations_write_destinations_service_unit_test_ts --> file_src_modules_report_markdown_report_service_ts
  file_src_modules_write_destinations_write_destinations_service_unit_test_ts --> file_src_modules_report_mermaid_report_service_ts
  file_src_modules_write_destinations_write_destinations_service_unit_test_ts --> file_src_modules_report_report_service_ts
  file_src_modules_write_destinations_write_destinations_service_unit_test_ts --> file_src_modules_report_workspace_report_service_ts
  file_src_modules_write_destinations_write_destinations_service_unit_test_ts --> file_src_modules_write_destinations_write_destinations_service_ts
  file_src_modules_write_destinations_write_destinations_service_unit_test_ts --> file_src_modules_write_destinations_write_destinations_types_ts
  file_src_modules_write_destinations_write_destinations_service_unit_test_ts --> file_testing_mocks_ts
  file_testing_modules_ts --> file_src_modules_output_json_output_json_module_ts
  file_testing_modules_ts --> file_src_modules_output_markdown_output_markdown_module_ts
  file_testing_modules_ts --> file_src_modules_project_reports_project_reports_module_ts
  file_testing_modules_ts --> file_src_modules_report_report_module_ts
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-5009-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-164.94_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-7-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-34-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-23.35_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-34-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-16-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-11-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-107-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-7-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-11-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-12-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-232-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-96-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-289-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-39-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-300-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-131-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-72-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-187-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-495-475569?style=flat-square)
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
![JSON Lines](https://img.shields.io/badge/JSON_Lines-146-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-32-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-92-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-77-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-35-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-131-dc2626?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-4-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-7-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-4-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-4-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-7-ca8a04?style=flat-square)
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
