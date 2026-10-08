// ♟️ Constants

import { InputError } from "@conformetry/configuration";

/** Directory generated output lands in when the caller names no target. */
export const DEFAULT_GENERATED_DIRECTORY = "generated";

/**
 * No template was supplied and none could be chosen.
 *
 * The names go in the message because looking one up is exactly what the
 * picker exists to save, and a caller who cannot be shown the picker — a CI
 * job, or one who cancelled it — still has to type a name from somewhere.
 */
export const missingTemplateError = (
  availableTemplateNames: readonly string[],
): InputError =>
  new InputError(
    `No template was selected. Pass --template. Available: ${availableTemplateNames.join(", ")}`,
  );
