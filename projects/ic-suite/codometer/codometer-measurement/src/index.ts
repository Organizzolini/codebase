// 📤 Exports

export { CustomizationModule } from "./modules/customization/customization.module";
export { CustomizationService } from "./modules/customization/customization.service";
export type { CustomizationInput } from "./modules/customization/customization.types";
export { DiscoveryModule } from "./modules/discovery/discovery.module";
export { DiscoveryService } from "./modules/discovery/discovery.service";
export type {
  DiscoverFilesArguments,
  DiscoveryResult,
  WalkDirectoryArguments,
  WalkSubdirectoryArguments,
} from "./modules/discovery/discovery.types";
export { InputOutsideRepositoryError } from "./modules/inputs/inputs.constants";
export { InputsModule } from "./modules/inputs/inputs.module";
export { InputsService } from "./modules/inputs/inputs.service";
export type {
  InputEntryKind,
  MatchInputFilesArguments,
  WalkInputArguments,
} from "./modules/inputs/inputs.types";
export {
  EmptyTargetError,
  UnboundMetricError,
} from "./modules/limits/limits.constants";
export { LimitsModule } from "./modules/limits/limits.module";
export { LimitsService } from "./modules/limits/limits.service";
export type {
  EvaluatedLimit,
  TargetMetricIndex,
} from "./modules/limits/limits.types";
export { MetricIndexService } from "./modules/limits/metric-index.service";
export { MeasureModule } from "./modules/measure/measure.module";
export { MeasureService } from "./modules/measure/measure.service";
export type {
  InputMeasurement,
  MeasureArguments,
  MeasurementResult,
} from "./modules/measure/measure.types";
export { UnreadableTargetFileError } from "./modules/size/size.constants";
export { SizeModule } from "./modules/size/size.module";
export { SizeService } from "./modules/size/size.service";
export type {
  AnalyzeSizeArguments,
  SizeResult,
} from "./modules/size/size.types";
