import { describe, expect, it } from "vitest";

import {
  codometerConfigurationSchema,
  ConfigurationModule,
  ConfigurationService,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_PYTHON_COMMAND,
} from "./index.js";

describe("codometer-configuration index", () => {
  it("exports the configuration surface", () => {
    expect(ConfigurationModule).toBeDefined();
    expect(ConfigurationService).toBeDefined();
    expect(codometerConfigurationSchema).toBeDefined();
    expect(DEFAULT_EXCLUDE_GLOBS).toBeDefined();
    expect(DEFAULT_PYTHON_COMMAND).toBeDefined();
  });
});
