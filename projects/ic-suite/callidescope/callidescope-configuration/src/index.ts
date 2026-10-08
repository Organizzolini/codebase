// 📤 Exports
export {
  CALLIDESCOPE_OUTPUT_FORMATS,
  callidescopeConfigurationSchema,
  CONFIGURATION_FILE_NAMES,
  ConfigurationFileNotFoundError,
  DEFAULT_ENTRY_POINT_DECORATORS,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
  DEFAULT_MAXIMUM_DEPTH,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_PREVIEW_COUNT,
  DEFAULT_PROJECT_README_HEADING,
  DEFAULT_RUN_HEADING,
  ProjectConfigurationError,
  ProjectConfigurationFieldNotPermittedError,
  ProjectConfigurationIncompleteError,
  ProjectConfigurationMissingError,
  REPOSITORY_ROOT_MARKERS,
  SUPPORTED_CONFIGURATION_EXTENSIONS,
  UnknownConfigurationFileTypeError,
} from "./modules/configuration/configuration.constants";
export { ConfigurationModule } from "./modules/configuration/configuration.module";
export { ConfigurationService } from "./modules/configuration/configuration.service";
export type {
  CallidescopeConfiguration,
  CallidescopeEntryPoints,
  CallidescopeJsonOutputConfiguration,
  CallidescopeLimitOverrides,
  CallidescopeLimits,
  CallidescopeMarkdownOutputConfiguration,
  CallidescopeOutputFormat,
  CallidescopeProjectConfiguration,
  CallidescopeProjectEntryPoints,
  CallidescopeProjectLimits,
  CallidescopeProjectWriteConfiguration,
  CallidescopeWriteConfiguration,
  LoadConfigurationArguments,
  LoadedCallidescopeConfiguration,
  LoadedCallidescopeConfigurationFile,
  LoadedProjectConfiguration,
  LoadProjectConfigurationsArguments,
  MarkdownAnchorHelpers,
  ProjectFieldPermission,
  ProjectLimits,
  ProjectLimitsLookup,
  RenderMarkdownArguments,
  RenderMarkdownOutput,
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeEntryPoints,
  ResolvedCallidescopeJsonOutputConfiguration,
  ResolvedCallidescopeLimits,
  ResolvedCallidescopeMarkdownOutputConfiguration,
  ResolvedCallidescopeWriteConfiguration,
  ResolveProjectLimitsArguments,
  WriteMarkdownArguments,
  WriteMarkdownOutput,
} from "./modules/configuration/configuration.types";
export { flagResolutionError } from "./modules/flag-resolution/flag-resolution.constants";
export type {
  CallidescopeRunFlags,
  ResolvedRunFlags,
} from "./modules/flag-resolution/flag-resolution.types";
export {
  InputError,
  missingInputError,
  promptCancelledError,
} from "./modules/input/input.constants";
export type { CallidescopeFormatOptions } from "./modules/input/input.types";
export {
  CHECK_BREADTH,
  CHECK_DEPTH,
  CHECK_NAMES,
  CHECK_REPORTS,
  CHECK_SEPARATOR,
  DESTINATION_FLAG_NAMES,
} from "./modules/run-plan/run-plan.constants";
export type {
  AddressCommandOptions,
  CallidescopeCommandOptions,
  PreparedLookup,
  PreparedRun,
  RunMode,
  RunPreparation,
} from "./modules/run-plan/run-plan.types";
