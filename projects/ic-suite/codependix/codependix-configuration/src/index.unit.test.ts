import { describe, expect, it } from "vitest";

import {
  CODEPENDIX_EXPORT_TARGETS,
  CODEPENDIX_GRAPH_TYPES,
  codependixConfigurationSchema,
  ConfigurationFileNotFoundError,
  ConfigurationModule,
  ConfigurationService,
  DEFAULT_EXPORT_TARGET,
  DEFAULT_MARKDOWN_PATH,
  InputError,
  missingInputError,
  promptCancelledError,
  UnknownConfigurationFileTypeError,
} from "./index.js";

describe("codependix-configuration index", () => {
  it("exports the configuration surface", () => {
    expect(ConfigurationModule).toBeDefined();
    expect(ConfigurationService).toBeDefined();
    expect(ConfigurationFileNotFoundError).toBeDefined();
    expect(UnknownConfigurationFileTypeError).toBeDefined();
    expect(codependixConfigurationSchema).toBeDefined();
    expect(CODEPENDIX_GRAPH_TYPES).toBeDefined();
    expect(CODEPENDIX_EXPORT_TARGETS).toBeDefined();
    expect(DEFAULT_EXPORT_TARGET).toBeDefined();
    expect(DEFAULT_MARKDOWN_PATH).toBeDefined();
    expect(InputError).toBeDefined();
    expect(promptCancelledError).toBeDefined();
    expect(missingInputError).toBeDefined();
  });
});
