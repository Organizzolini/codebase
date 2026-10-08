// ♟️ Constants

import type { LanguageValidatorDescriptor } from "@conformetry/core";

/** Extensions the JSON validator claims. */
export const JSON_VALIDATOR_FILE_EXTENSIONS = [".json", ".jsonc"];

/** Identifies the JSON language to the orchestrator and the `--languages` filter. */
export const JSON_VALIDATOR_DESCRIPTOR: LanguageValidatorDescriptor = {
  description: "Checks JSON and JSONC structural conformance",
  fileExtensions: JSON_VALIDATOR_FILE_EXTENSIONS,
  name: "json",
};
