# ⏲️ Codometer Output

[![npm](https://img.shields.io/npm/v/@codometer/output?logo=npm&label=npm)](https://www.npmjs.com/package/@codometer/output)

**Markdown badge rendering and JSON report formatting for Codometer measurements.**

## Test

```bash
nx run codometer-output:vitest
```

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `packages/ic-suite/codometer/codometer-output`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 166 |
| Files | 46 |
| Calls traced | 346 |
| Call stacks | 2 |
| Deepest stack | 4 |
| Stacks through recursion | 0 |
| Unfollowable calls | 4 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 11 |
| `maximumBreadth` | 16 |

### Call stacks (depth)

**1. `MarkdownService.syncAnchoredBlock`** — depth ≥ 4 · orphan-root

```text
🚀 MarkdownService.syncAnchoredBlock(…): boolean [packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:80]
  └─> MarkdownService.syncAnchoredBlock(args: SyncAnchoredBlockArguments): boolean [packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:204]
     ↳ Splice the anchored block into a file, or report whether it is current.
    └─> MarkdownService.buildBlockRegex(args: { endMarker: string; startMarker: string; }): RegExp [packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:135]
       ↳ Build the matcher for a block delimited by the configured markers.
      └─> MarkdownService.escapeRegex(input: string): string [packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:147]
         ↳ Escape a configured marker so it can be searched for literally.
```

**2. `MarkdownService.wrapInAnchors`** — depth 2 · orphan-root

```text
🚀 MarkdownService.wrapInAnchors(content?: string | undefined): string [packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:87]
  └─> MarkdownService.wrapInAnchors(args: WrapInAnchorsArguments): string [packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:246]
     ↳ Wrap rendered markdown in the configured anchor markers.
```

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `MarkdownService.buildBadgeGroups` | 16 | `MarkdownService.filter(…)`, `buildRepositoryGroup`, `buildTargetsGroup`, `buildTypescriptGroup`, `buildJavascriptGroup`, `buildPythonGroup`, `buildJsonGroup`, `buildYamlGroup`, `buildTomlGroup`, `buildShellGroup`, `buildSqlGroup`, `buildHclGroup`, `buildCssGroup`, `buildCustomGroup`, `buildJupyterGroup`, `buildMarkdownGroup` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:108` |
| `ChangesService.collectProjectRows` | 7 | `ChangesService.readProjectName`, `ChangesService.readBaseline`, `ChangesService.readReport`, `ChangesService.map(…)`, `ChangesService.map(…)`, `ChangesService.buildBaselineRow`, `ChangesService.map(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/changes/changes.service.ts:110` |
| `MarkdownService.syncAnchoredBlock` | 6 | `MissingMarkdownPathError.constructor`, `MarkdownService.readExisting`, `MarkdownService.wrapInAnchors`, `MarkdownService.buildBlockRegex`, `MarkdownService.writeMarkdownFile`, `MarkdownService.replace(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:204` |

<details>
<summary>85 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `RenderService.renderSection` | 6 | `RenderService.groupByProject(…)`, `RenderService.groupByProject`, `RenderService.groupByProject(…)`, `RenderService.flatMap(…)`, `RenderService.readProjects`, `RenderService.renderComparison` | `packages/ic-suite/codometer/codometer-output/src/modules/render/render.service.ts:154` |
| `ChangesService.collect` | 4 | `ChangesService.map(…)`, `ChangesService.readReportPaths`, `ChangesService.flatMap(…)`, `ChangesService.flatMap(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/changes/changes.service.ts:292` |
| `ConfigurationListingService.findConfigurationFiles` | 4 | `ConfigurationListingService.resolveWalkExclusions`, `DiscoveryService.discoverFiles`, `ConfigurationListingService.toSorted(…)`, `ConfigurationListingService.filter(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/configuration-listing/configuration-listing.service.ts:188` |
| `buildRepositoryGroup` | 4 | `buildGroup`, `buildBadge`, `formatBytes`, `buildCustomBadges` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:263` |
| `RenderService.renderProject` | 4 | `RenderService.filter(…)`, `RenderService.readIsOpen`, `RenderService.renderFailures`, `RenderService.map(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/render/render.service.ts:106` |
| `ChangesService.map(…)` | 3 | `ChangesService.readBreach`, `ChangesService.readLabel`, `ChangesService.readGoverningLimit` | `packages/ic-suite/codometer/codometer-output/src/modules/changes/changes.service.ts:223` |
| `ChangesService.readReportPaths` | 3 | `ChangesService.flatMap(…)`, `ChangesService.map(…)`, `ChangesService.flatMap(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/changes/changes.service.ts:267` |
| `RenderConfigurationService.renderDirectory` | 3 | `RenderConfigurationService.renderNames`, `RenderConfigurationService.map(…)`, `RenderConfigurationService.map(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/configuration-listing/render-configuration.service.ts:36` |
| `RenderConfigurationService.renderLimitsTable` | 3 | `RenderConfigurationService.renderRow`, `RenderConfigurationService.map(…)`, `RenderConfigurationService.map(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/configuration-listing/render-configuration.service.ts:64` |
| `RenderConfigurationService.render` | 3 | `RenderConfigurationService.renderRootError`, `RenderConfigurationService.renderLimitsTable`, `RenderConfigurationService.map(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/configuration-listing/render-configuration.service.ts:117` |
| `buildCssGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:23` |
| `buildHclGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:116` |
| `buildJsonGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:156` |
| `buildJupyterGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:177` |
| `buildMarkdownGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:206` |
| `buildPythonGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:235` |
| `buildShellGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:281` |
| `buildSqlGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:301` |
| `buildTomlGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:352` |
| `buildTypescriptGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:368` |
| `buildYamlGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:383` |
| `MarkdownService.sync` | 3 | `MarkdownService.scopeCustomStatistics`, `MarkdownService.renderDocument`, `MarkdownService.buildAnchorHelpers` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:355` |
| `DeliveryService.deliverConsole` | 3 | `JsonService.render`, `MarkdownService.renderBlock`, `DeliveryService.readTargetSizes` | `packages/ic-suite/codometer/codometer-output/src/modules/delivery/delivery.service.ts:48` |
| `DeliveryService.deliverMarkdown` | 3 | `DeliveryService.touchesFiles`, `MarkdownService.sync`, `DeliveryService.readTargetSizes` | `packages/ic-suite/codometer/codometer-output/src/modules/delivery/delivery.service.ts:104` |
| `DeliveryService.deliver` | 3 | `DeliveryService.deliverConsole`, `DeliveryService.deliverJson`, `DeliveryService.deliverMarkdown` | `packages/ic-suite/codometer/codometer-output/src/modules/delivery/delivery.service.ts:166` |
| `DocumentsService.emit` | 3 | `DocumentsService.wrap`, `DocumentsService.readDocument`, `DocumentsService.splice` | `packages/ic-suite/codometer/codometer-output/src/modules/documents/documents.service.ts:51` |
| `RenderService.renderRow` | 3 | `RenderService.readStatus`, `formatValue`, `formatDelta` | `packages/ic-suite/codometer/codometer-output/src/modules/render/render.service.ts:134` |
| `ReportService.buildMetrics` | 3 | `ReportService.buildMetricName`, `ReportService.map(…)`, `ReportService.readUnit` | `packages/ic-suite/codometer/codometer-output/src/modules/report/report.service.ts:52` |
| `ChangesService.readBaseline` | 2 | `ChangesService.readReport`, `ChangesService.map(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/changes/changes.service.ts:154` |
| `ChangesService.readBreach` | 2 | `ChangesService.filter(…)`, `ChangesService.some(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/changes/changes.service.ts:175` |
| `ChangesService.readGoverningLimit` | 2 | `ChangesService.filter(…)`, `ChangesService.map(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/changes/changes.service.ts:195` |
| `ChangesService.readReport` | 2 | `ChangesService.parseReport`, `ChangesService.flatMap(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/changes/changes.service.ts:243` |
| `formatValue` | 2 | `formatBytes`, `formatCount` | `packages/ic-suite/codometer/codometer-output/src/modules/render/render.utilities.ts:34` |
| `ConfigurationListingService.formatLimitValue` | 2 | `formatBytes`, `formatCount` | `packages/ic-suite/codometer/codometer-output/src/modules/configuration-listing/configuration-listing.service.ts:101` |
| `ConfigurationListingService.describeConfigurations` | 2 | `ConfigurationListingService.findConfigurationFiles`, `ConfigurationListingService.describeConfiguration` | `packages/ic-suite/codometer/codometer-output/src/modules/configuration-listing/configuration-listing.service.ts:155` |
| `JsonService.sync` | 2 | `JsonService.render`, `JsonService.readExisting` | `packages/ic-suite/codometer/codometer-output/src/modules/json/json.service.ts:62` |
| `buildCustomBadges` | 2 | `map(…)`, `filter(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:47` |
| `buildCustomGroup` | 2 | `buildCustomBadges`, `buildGroup` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:64` |
| `buildCustomStatisticInstancesSection` | 2 | `map(…)`, `filter(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:85` |
| `map(…)` | 2 | `map(…)`, `buildGroup` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:90` |
| `buildJavascriptGroup` | 2 | `buildGroup`, `buildBadge` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:134` |
| `buildTargetsGroup` | 2 | `buildGroup`, `map(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:334` |
| `map(…)` | 2 | `buildBadge`, `formatTargetSize` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:345` |
| `MarkdownService.scopeCustomStatistics` | 2 | `MarkdownService.map(…)`, `MarkdownService.filter(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:173` |
| `MarkdownService.renderBadges` | 2 | `MarkdownService.renderDocument`, `MarkdownService.scopeCustomStatistics` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:283` |
| `MarkdownService.renderBlock` | 2 | `MarkdownService.wrapInAnchors`, `MarkdownService.renderBadges` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:298` |
| `MarkdownService.renderDocument` | 2 | `MarkdownService.buildBadgeGroups`, `buildCustomStatisticInstancesSection` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:322` |
| `DeliveryService.deliverJson` | 2 | `DeliveryService.touchesFiles`, `JsonService.sync` | `packages/ic-suite/codometer/codometer-output/src/modules/delivery/delivery.service.ts:75` |
| `DestinationsService.resolveMarkdown` | 2 | `DestinationsService.findConfiguredOutput`, `DestinationsService.resolvePath` | `packages/ic-suite/codometer/codometer-output/src/modules/destinations/destinations.service.ts:119` |
| `DestinationsService.listOutputPaths` | 2 | `DestinationsService.map(…)`, `DestinationsService.filter(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/destinations/destinations.service.ts:191` |
| `DestinationsService.resolveDestinations` | 2 | `DestinationsService.resolveJson`, `DestinationsService.resolveMarkdown` | `packages/ic-suite/codometer/codometer-output/src/modules/destinations/destinations.service.ts:234` |
| `RenderService.readProjects` | 2 | `RenderService.map(…)`, `RenderService.map(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/render/render.service.ts:55` |
| `ReportService.build` | 2 | `ReportService.indexLimits`, `ReportService.buildMetrics` | `packages/ic-suite/codometer/codometer-output/src/modules/report/report.service.ts:121` |
| `ChangesService.map(…)` | 1 | `ChangesService.buildMeasuredRow` | `packages/ic-suite/codometer/codometer-output/src/modules/changes/changes.service.ts:120` |
| `ChangesService.readLabel` | 1 | `ChangesService.find(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/changes/changes.service.ts:206` |
| `ChangesService.readMetrics` | 1 | `ChangesService.map(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/changes/changes.service.ts:222` |
| `ChangesService.flatMap(…)` | 1 | `ChangesService.readMetrics` | `packages/ic-suite/codometer/codometer-output/src/modules/changes/changes.service.ts:259` |
| `ChangesService.map(…)` | 1 | `ChangesService.collectProjectRows` | `packages/ic-suite/codometer/codometer-output/src/modules/changes/changes.service.ts:293` |
| `formatDelta` | 1 | `formatValue` | `packages/ic-suite/codometer/codometer-output/src/modules/render/render.utilities.ts:24` |
| `ConfigurationListingService.describeConfiguration` | 1 | `ConfigurationService.loadConfigurationFile` | `packages/ic-suite/codometer/codometer-output/src/modules/configuration-listing/configuration-listing.service.ts:66` |
| `ConfigurationListingService.resolveWalkExclusions` | 1 | `ConfigurationService.loadConfigurationFile` | `packages/ic-suite/codometer/codometer-output/src/modules/configuration-listing/configuration-listing.service.ts:120` |
| `ConfigurationListingService.toLimitRows` | 1 | `ConfigurationListingService.flatMap(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/configuration-listing/configuration-listing.service.ts:207` |
| `ConfigurationListingService.flatMap(…)` | 1 | `ConfigurationListingService.map(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/configuration-listing/configuration-listing.service.ts:210` |
| `ConfigurationListingService.map(…)` | 1 | `ConfigurationListingService.formatLimitValue` | `packages/ic-suite/codometer/codometer-output/src/modules/configuration-listing/configuration-listing.service.ts:211` |
| `RenderConfigurationService.map(…)` | 1 | `RenderConfigurationService.renderRow` | `packages/ic-suite/codometer/codometer-output/src/modules/configuration-listing/render-configuration.service.ts:72` |
| `RenderConfigurationService.map(…)` | 1 | `RenderConfigurationService.renderDirectory` | `packages/ic-suite/codometer/codometer-output/src/modules/configuration-listing/render-configuration.service.ts:144` |
| `buildBadge` | 1 | `encodeValue` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:14` |
| `map(…)` | 1 | `buildBadge` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:53` |
| `formatTargetSize` | 1 | `formatBytes` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.utilities.ts:420` |
| `MarkdownService.syncAnchoredBlock` | 1 | `MarkdownService.syncAnchoredBlock` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:80` |
| `MarkdownService.wrapInAnchors` | 1 | `MarkdownService.wrapInAnchors` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:87` |
| `MarkdownService.buildBlockRegex` | 1 | `MarkdownService.escapeRegex` | `packages/ic-suite/codometer/codometer-output/src/modules/markdown/markdown.service.ts:135` |
| `DeliveryService.readTargetSizes` | 1 | `DeliveryService.flatMap(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/delivery/delivery.service.ts:139` |
| `DestinationsService.findConfiguredOutput` | 1 | `DestinationsService.find(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/destinations/destinations.service.ts:50` |
| `DestinationsService.resolveJson` | 1 | `DestinationsService.findConfiguredOutput` | `packages/ic-suite/codometer/codometer-output/src/modules/destinations/destinations.service.ts:61` |
| `DestinationsService.resolveConsoleMarkdown` | 1 | `DestinationsService.resolveMarkdown` | `packages/ic-suite/codometer/codometer-output/src/modules/destinations/destinations.service.ts:219` |
| `DestinationsService.selectScope` | 1 | `DestinationsService.some(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/destinations/destinations.service.ts:258` |
| `DocumentsService.splice` | 1 | `DocumentsService.filter(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/documents/documents.service.ts:88` |
| `RenderService.readIsOpen` | 1 | `RenderService.some(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/render/render.service.ts:47` |
| `RenderService.renderFailures` | 1 | `RenderService.map(…)` | `packages/ic-suite/codometer/codometer-output/src/modules/render/render.service.ts:89` |
| `RenderService.filter(…)` | 1 | `hasChanged` | `packages/ic-suite/codometer/codometer-output/src/modules/render/render.service.ts:111` |
| `RenderService.map(…)` | 1 | `RenderService.renderRow` | `packages/ic-suite/codometer/codometer-output/src/modules/render/render.service.ts:127` |
| `RenderService.flatMap(…)` | 1 | `RenderService.renderProject` | `packages/ic-suite/codometer/codometer-output/src/modules/render/render.service.ts:161` |
| `ReportService.map(…)` | 1 | `ReportService.buildLimit` | `packages/ic-suite/codometer/codometer-output/src/modules/report/report.service.ts:64` |
| `ReportService.indexLimits` | 1 | `ReportService.buildMetricName` | `packages/ic-suite/codometer/codometer-output/src/modules/report/report.service.ts:88` |

</details>
<!-- callidescope:end -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  codometer_cli["codometer-cli"]
  codometer_configuration["codometer-configuration"]
  codometer_core["codometer-core"]
  codometer_measurement["codometer-measurement"]
  codometer_output["codometer-output"]
  logger["logger"]
  codometer_cli --> codometer_output
  codometer_output --> codometer_configuration
  codometer_output --> codometer_core
  codometer_output --> codometer_measurement
  codometer_output --> logger
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class codometer_output subject
```
<!-- codependix:end name="codependix-nx-projects" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs-modules" -->
```mermaid
flowchart LR
  ChangesModule
  ConfigurationListingModule
  ConfigurationModule
  DeliveryModule
  DestinationsModule
  DiscoveryModule
  DocumentsModule
  JsonModule
  LoggerModule([LoggerModule])
  MarkdownModule
  RenderModule
  ReportModule
  ConfigurationListingModule --> ConfigurationModule
  ConfigurationListingModule --> DiscoveryModule
  DeliveryModule --> JsonModule
  DeliveryModule --> MarkdownModule
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
  file_src_modules_changes_changes_constants_ts["src/modules/changes/changes.constants.ts"]
  file_src_modules_changes_changes_module_ts["src/modules/changes/changes.module.ts"]
  file_src_modules_changes_changes_module_unit_test_ts["src/modules/changes/changes.module.unit.test.ts"]
  file_src_modules_changes_changes_service_ts["src/modules/changes/changes.service.ts"]
  file_src_modules_changes_changes_service_unit_test_ts["src/modules/changes/changes.service.unit.test.ts"]
  file_src_modules_changes_changes_types_ts["src/modules/changes/changes.types.ts"]
  file_src_modules_configuration_listing_configuration_listing_constants_ts["src/modules/configuration-listing/configuration-listing.constants.ts"]
  file_src_modules_configuration_listing_configuration_listing_module_ts["src/modules/configuration-listing/configuration-listing.module.ts"]
  file_src_modules_configuration_listing_configuration_listing_service_ts["src/modules/configuration-listing/configuration-listing.service.ts"]
  file_src_modules_configuration_listing_configuration_listing_service_unit_test_ts["src/modules/configuration-listing/configuration-listing.service.unit.test.ts"]
  file_src_modules_configuration_listing_configuration_listing_types_ts["src/modules/configuration-listing/configuration-listing.types.ts"]
  file_src_modules_configuration_listing_render_configuration_service_ts["src/modules/configuration-listing/render-configuration.service.ts"]
  file_src_modules_configuration_listing_render_configuration_service_unit_test_ts["src/modules/configuration-listing/render-configuration.service.unit.test.ts"]
  file_src_modules_delivery_delivery_constants_ts["src/modules/delivery/delivery.constants.ts"]
  file_src_modules_delivery_delivery_module_ts["src/modules/delivery/delivery.module.ts"]
  file_src_modules_delivery_delivery_service_ts["src/modules/delivery/delivery.service.ts"]
  file_src_modules_delivery_delivery_service_unit_test_ts["src/modules/delivery/delivery.service.unit.test.ts"]
  file_src_modules_delivery_delivery_types_ts["src/modules/delivery/delivery.types.ts"]
  file_src_modules_destinations_destinations_constants_ts["src/modules/destinations/destinations.constants.ts"]
  file_src_modules_destinations_destinations_module_ts["src/modules/destinations/destinations.module.ts"]
  file_src_modules_destinations_destinations_service_ts["src/modules/destinations/destinations.service.ts"]
  file_src_modules_destinations_destinations_service_unit_test_ts["src/modules/destinations/destinations.service.unit.test.ts"]
  file_src_modules_destinations_destinations_types_ts["src/modules/destinations/destinations.types.ts"]
  file_src_modules_documents_documents_constants_ts["src/modules/documents/documents.constants.ts"]
  file_src_modules_documents_documents_module_ts["src/modules/documents/documents.module.ts"]
  file_src_modules_documents_documents_module_unit_test_ts["src/modules/documents/documents.module.unit.test.ts"]
  file_src_modules_documents_documents_service_ts["src/modules/documents/documents.service.ts"]
  file_src_modules_documents_documents_service_unit_test_ts["src/modules/documents/documents.service.unit.test.ts"]
  file_src_modules_documents_documents_types_ts["src/modules/documents/documents.types.ts"]
  file_src_modules_json_json_constants_ts["src/modules/json/json.constants.ts"]
  file_src_modules_json_json_module_ts["src/modules/json/json.module.ts"]
  file_src_modules_json_json_module_unit_test_ts["src/modules/json/json.module.unit.test.ts"]
  file_src_modules_json_json_service_ts["src/modules/json/json.service.ts"]
  file_src_modules_json_json_service_unit_test_ts["src/modules/json/json.service.unit.test.ts"]
  file_src_modules_json_json_types_ts["src/modules/json/json.types.ts"]
  file_src_modules_markdown_markdown_constants_ts["src/modules/markdown/markdown.constants.ts"]
  file_src_modules_markdown_markdown_module_ts["src/modules/markdown/markdown.module.ts"]
  file_src_modules_markdown_markdown_module_unit_test_ts["src/modules/markdown/markdown.module.unit.test.ts"]
  file_src_modules_markdown_markdown_service_ts["src/modules/markdown/markdown.service.ts"]
  file_src_modules_markdown_markdown_service_unit_test_ts["src/modules/markdown/markdown.service.unit.test.ts"]
  file_src_modules_markdown_markdown_types_ts["src/modules/markdown/markdown.types.ts"]
  file_src_modules_markdown_markdown_utilities_ts["src/modules/markdown/markdown.utilities.ts"]
  file_src_modules_markdown_markdown_utilities_unit_test_ts["src/modules/markdown/markdown.utilities.unit.test.ts"]
  file_src_modules_render_render_constants_ts["src/modules/render/render.constants.ts"]
  file_src_modules_render_render_module_ts["src/modules/render/render.module.ts"]
  file_src_modules_render_render_module_unit_test_ts["src/modules/render/render.module.unit.test.ts"]
  file_src_modules_render_render_service_ts["src/modules/render/render.service.ts"]
  file_src_modules_render_render_service_unit_test_ts["src/modules/render/render.service.unit.test.ts"]
  file_src_modules_render_render_types_ts["src/modules/render/render.types.ts"]
  file_src_modules_render_render_utilities_ts["src/modules/render/render.utilities.ts"]
  file_src_modules_render_render_utilities_unit_test_ts["src/modules/render/render.utilities.unit.test.ts"]
  file_src_modules_report_report_constants_ts["src/modules/report/report.constants.ts"]
  file_src_modules_report_report_module_ts["src/modules/report/report.module.ts"]
  file_src_modules_report_report_service_ts["src/modules/report/report.service.ts"]
  file_src_modules_report_report_service_unit_test_ts["src/modules/report/report.service.unit.test.ts"]
  file_src_modules_report_report_types_ts["src/modules/report/report.types.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vite_config_ts["vite.config.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_modules_changes_changes_module_ts --> file_src_modules_changes_changes_service_ts
  file_src_modules_changes_changes_module_unit_test_ts --> file_src_modules_changes_changes_module_ts
  file_src_modules_changes_changes_module_unit_test_ts --> file_src_modules_changes_changes_service_ts
  file_src_modules_changes_changes_service_ts --> file_src_modules_changes_changes_constants_ts
  file_src_modules_changes_changes_service_ts --> file_src_modules_changes_changes_types_ts
  file_src_modules_changes_changes_service_unit_test_ts --> file_src_modules_changes_changes_service_ts
  file_src_modules_changes_changes_service_unit_test_ts --> file_src_modules_changes_changes_types_ts
  file_src_modules_changes_changes_types_ts --> file_src_modules_changes_changes_constants_ts
  file_src_modules_configuration_listing_configuration_listing_module_ts --> file_src_modules_configuration_listing_configuration_listing_service_ts
  file_src_modules_configuration_listing_configuration_listing_module_ts --> file_src_modules_configuration_listing_render_configuration_service_ts
  file_src_modules_configuration_listing_configuration_listing_service_ts --> file_src_modules_configuration_listing_configuration_listing_constants_ts
  file_src_modules_configuration_listing_configuration_listing_service_ts --> file_src_modules_configuration_listing_configuration_listing_types_ts
  file_src_modules_configuration_listing_configuration_listing_service_ts --> file_src_modules_render_render_utilities_ts
  file_src_modules_configuration_listing_configuration_listing_service_unit_test_ts --> file_src_modules_configuration_listing_configuration_listing_service_ts
  file_src_modules_configuration_listing_render_configuration_service_ts --> file_src_modules_configuration_listing_configuration_listing_constants_ts
  file_src_modules_configuration_listing_render_configuration_service_ts --> file_src_modules_configuration_listing_configuration_listing_types_ts
  file_src_modules_configuration_listing_render_configuration_service_unit_test_ts --> file_src_modules_configuration_listing_configuration_listing_types_ts
  file_src_modules_configuration_listing_render_configuration_service_unit_test_ts --> file_src_modules_configuration_listing_render_configuration_service_ts
  file_src_modules_delivery_delivery_constants_ts --> file_src_modules_destinations_destinations_types_ts
  file_src_modules_delivery_delivery_module_ts --> file_src_modules_delivery_delivery_service_ts
  file_src_modules_delivery_delivery_module_ts --> file_src_modules_json_json_module_ts
  file_src_modules_delivery_delivery_module_ts --> file_src_modules_markdown_markdown_module_ts
  file_src_modules_delivery_delivery_service_ts --> file_src_modules_delivery_delivery_constants_ts
  file_src_modules_delivery_delivery_service_ts --> file_src_modules_delivery_delivery_types_ts
  file_src_modules_delivery_delivery_service_ts --> file_src_modules_json_json_service_ts
  file_src_modules_delivery_delivery_service_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_delivery_delivery_service_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_delivery_delivery_service_unit_test_ts --> file_src_modules_delivery_delivery_service_ts
  file_src_modules_delivery_delivery_service_unit_test_ts --> file_src_modules_destinations_destinations_types_ts
  file_src_modules_delivery_delivery_service_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_delivery_delivery_service_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_delivery_delivery_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_delivery_delivery_types_ts --> file_src_modules_destinations_destinations_types_ts
  file_src_modules_delivery_delivery_types_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_destinations_destinations_constants_ts --> file_src_modules_destinations_destinations_types_ts
  file_src_modules_destinations_destinations_module_ts --> file_src_modules_destinations_destinations_service_ts
  file_src_modules_destinations_destinations_service_ts --> file_src_modules_destinations_destinations_types_ts
  file_src_modules_destinations_destinations_service_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_destinations_destinations_service_unit_test_ts --> file_src_modules_destinations_destinations_service_ts
  file_src_modules_destinations_destinations_service_unit_test_ts --> file_src_modules_destinations_destinations_types_ts
  file_src_modules_documents_documents_module_ts --> file_src_modules_documents_documents_service_ts
  file_src_modules_documents_documents_module_unit_test_ts --> file_src_modules_documents_documents_module_ts
  file_src_modules_documents_documents_module_unit_test_ts --> file_src_modules_documents_documents_service_ts
  file_src_modules_documents_documents_service_ts --> file_src_modules_documents_documents_types_ts
  file_src_modules_documents_documents_service_unit_test_ts --> file_src_modules_documents_documents_service_ts
  file_src_modules_documents_documents_service_unit_test_ts --> file_src_modules_documents_documents_types_ts
  file_src_modules_json_json_module_ts --> file_src_modules_json_json_service_ts
  file_src_modules_json_json_module_unit_test_ts --> file_src_modules_json_json_module_ts
  file_src_modules_json_json_module_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_json_json_service_ts --> file_src_modules_json_json_types_ts
  file_src_modules_json_json_service_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_markdown_markdown_module_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_markdown_markdown_module_unit_test_ts --> file_src_modules_markdown_markdown_module_ts
  file_src_modules_markdown_markdown_module_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_constants_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_utilities_ts
  file_src_modules_markdown_markdown_service_unit_test_ts --> file_src_modules_markdown_markdown_constants_ts
  file_src_modules_markdown_markdown_service_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_markdown_markdown_utilities_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_markdown_markdown_utilities_ts --> file_src_modules_render_render_utilities_ts
  file_src_modules_markdown_markdown_utilities_unit_test_ts --> file_src_modules_markdown_markdown_utilities_ts
  file_src_modules_render_render_module_ts --> file_src_modules_render_render_service_ts
  file_src_modules_render_render_module_unit_test_ts --> file_src_modules_render_render_module_ts
  file_src_modules_render_render_module_unit_test_ts --> file_src_modules_render_render_service_ts
  file_src_modules_render_render_service_ts --> file_src_modules_changes_changes_types_ts
  file_src_modules_render_render_service_ts --> file_src_modules_render_render_constants_ts
  file_src_modules_render_render_service_ts --> file_src_modules_render_render_types_ts
  file_src_modules_render_render_service_ts --> file_src_modules_render_render_utilities_ts
  file_src_modules_render_render_service_unit_test_ts --> file_src_modules_changes_changes_types_ts
  file_src_modules_render_render_service_unit_test_ts --> file_src_modules_render_render_service_ts
  file_src_modules_render_render_types_ts --> file_src_modules_changes_changes_types_ts
  file_src_modules_render_render_utilities_ts --> file_src_modules_changes_changes_types_ts
  file_src_modules_render_render_utilities_unit_test_ts --> file_src_modules_changes_changes_types_ts
  file_src_modules_render_render_utilities_unit_test_ts --> file_src_modules_render_render_utilities_ts
  file_src_modules_report_report_module_ts --> file_src_modules_report_report_service_ts
  file_src_modules_report_report_service_ts --> file_src_modules_report_report_constants_ts
  file_src_modules_report_report_service_ts --> file_src_modules_report_report_types_ts
  file_src_modules_report_report_service_unit_test_ts --> file_src_modules_report_report_service_ts
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-3761-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-129.96_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-7-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-35-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-17.70_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-35-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-13-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-2-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-8-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-64-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-10-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-11-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-9-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-185-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-46-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-219-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-12-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-205-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-102-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-57-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-139-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-289-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-1-ca8a04?style=flat-square)

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
![JSON Lines](https://img.shields.io/badge/JSON_Lines-134-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-29-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-83-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-72-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-7-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-35-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-122-dc2626?style=flat-square)
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
![Service Files](https://img.shields.io/badge/Service_Files-4-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-4-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-4-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-2-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-10-ca8a04?style=flat-square)
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
