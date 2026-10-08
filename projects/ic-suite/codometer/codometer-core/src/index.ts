// 📤 Exports

export {
  CODOMETER_SEVERITIES,
  CODOMETER_STATISTIC_GROUPS,
  CODOMETER_SYMBOL_KINDS,
  CODOMETER_SYMBOL_MODIFIERS,
  ConfigurationFileNotFoundError,
  InvalidConfigurationError,
  InvalidLimitValueError,
  UnknownConfigurationFileTypeError,
} from "./modules/codometer-core/codometer-core.constants";

export { CodometerCoreModule } from "./modules/codometer-core/codometer-core.module";

export { CodometerCoreService } from "./modules/codometer-core/codometer-core.service";
export type {
  CodeStatisticsResult,
  CodometerReport,
  CodometerSeverity,
  CodometerStatisticGroup,
  CodometerSymbolKind,
  CodometerSymbolModifier,
  CssStatistics,
  CustomStatisticResult,
  CustomStatisticResultInstance,
  HclStatistics,
  JavascriptStatistics,
  JsonStatistics,
  JupyterStatistics,
  MarkdownStatistics,
  MetricUnit,
  PythonStatistics,
  ReportFailure,
  ReportFailureKind,
  ReportLimit,
  ReportMetric,
  ReportTarget,
  ShellStatistics,
  SqlStatistics,
  TomlStatistics,
  TypescriptStatistics,
  YamlStatistics,
} from "./modules/codometer-core/codometer-core.types";
