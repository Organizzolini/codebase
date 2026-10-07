// 📤 Exports
export { UnknownConfigurationFileTypeError } from "./modules/configuration/configuration.constants";
export { ConfigurationModule } from "./modules/configuration/configuration.module";
export { ConfigurationService } from "./modules/configuration/configuration.service";
export type {
  ConformetryConfiguration,
  ConformetryGeneratorDefinition,
  ConformetryGeneratorInputDefinition,
  JsonSchemaDefinition,
} from "./modules/configuration/configuration.types";
export {
  ALL_TEMPLATES_SELECTION,
  InputError,
  missingInputError,
} from "./modules/input/input.constants";
export type {
  ResolveGeneratorInputsArguments,
  TemplateChoice,
} from "./modules/input/input.types";
export type {
  FindInstancesArguments,
  Instance,
  InstanceFile,
  MatchedInstance,
  PreparedInstanceDocuments,
  PrepareDocumentsArguments,
  ResolvedInstances,
  ResolveInventoryArguments,
  TemplateMatch,
  UnmatchedInstance,
  UnmatchedReason,
} from "./modules/instance-discovery/instance-discovery.types";
export type { ConformetryInstanceGroup } from "./modules/instance-group/instance-group.types";
export { MissingSubstitutionError } from "./modules/rendering/rendering.constants";
export type { Substitutions } from "./modules/rendering/rendering.types";
export {
  capturePlaceholderValues,
  createPlaceholderValue,
} from "./modules/rendering/rendering.utilities";
export type { TemplateDefinition } from "./modules/template-discovery/template-discovery.types";
