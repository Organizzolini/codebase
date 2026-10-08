// ♟️ Constants

// 🚨 Errors

/** Raised when an explicitly named configuration file does not exist. */
export class ConfigurationFileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`Configuration file not found: ${filePath}`);
    this.name = "ConfigurationFileNotFoundError";
  }
}

/**
 * Raised when a configuration does not satisfy the schema.
 *
 * Written out rather than letting a `ZodError` reach a caller, whose own
 * message is the JSON dump of its issue list — a wall of `invalid_value`
 * objects where a sentence saying what to write would do.
 */
export class InvalidConfigurationError extends Error {
  constructor(issues: string) {
    super(`Cannot read the codometer configuration.\n${issues}`);
    this.name = "InvalidConfigurationError";
  }
}

/**
 * Raised when a limit's value cannot be read as a number of anything.
 *
 * Loud rather than lenient. A value nobody can read has no defensible reading:
 * taken as zero it gates every metric at nothing, and ignored it gates
 * nothing at all. Both look like a working limit from the outside.
 */
export class InvalidLimitValueError extends Error {
  constructor(metric: string, value: string) {
    super(
      `Cannot read the limit on "${metric}" from "${value}". Write a number, or a string carrying a decimal unit — "8 KB" is 8000 bytes and "1 MB" is 1000000. The trailing "b" is required, so "8 K" is not a size.`,
    );
    this.name = "InvalidLimitValueError";
  }
}
import type {
  CodometerSeverity,
  CodometerStatisticGroup,
  CodometerSymbolKind,
  CodometerSymbolModifier,
} from "./codometer-core.types";

/** Raised when the configuration path points to an unsupported file type. */
export class UnknownConfigurationFileTypeError extends Error {
  constructor(filePath: string) {
    super(`Unsupported configuration file type: ${filePath}`);
    this.name = "UnknownConfigurationFileTypeError";
  }
}
// ♟️ Constants

/**
 * Badge groups a configured counter may be rendered into.
 *
 * Accepted by name rather than as free text so a misspelled group fails the
 * configuration instead of silently rendering the badge nowhere.
 */
export const CODOMETER_STATISTIC_GROUPS = [
  "conventions",
  "css",
  "hcl",
  "json",
  "jupyter",
  "markdown",
  "python",
  "repository",
  "shell",
  "sql",
  "toml",
  "typescript",
  "yaml",
] as const satisfies readonly CodometerStatisticGroup[];

/** Severities a limit may declare for the breach it would report. */
export const CODOMETER_SEVERITIES = [
  "fail",
  "warn",
] as const satisfies readonly CodometerSeverity[];

/** Declaration kinds a symbol counter, or a `comment` selector, may ask for. */
export const CODOMETER_SYMBOL_KINDS = [
  "class",
  "enum",
  "function",
  "getter",
  "interface",
  "method",
  "property",
  "setter",
] as const satisfies readonly CodometerSymbolKind[];

/** Modifiers a symbol counter may require of a declaration. */
export const CODOMETER_SYMBOL_MODIFIERS = [
  "abstract",
  "async",
  "export",
  "override",
  "private",
  "protected",
  "public",
  "readonly",
  "static",
] as const satisfies readonly CodometerSymbolModifier[];
