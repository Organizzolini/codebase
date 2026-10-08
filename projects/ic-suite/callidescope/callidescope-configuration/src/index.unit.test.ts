import { describe, expect, it } from "vitest";

import * as surface from "./index.js";
import {
  callidescopeConfigurationSchema,
  ConfigurationFileNotFoundError,
  ConfigurationModule,
  ConfigurationService,
  DEFAULT_ENTRY_POINT_DECORATORS,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_MAXIMUM_DEPTH,
  UnknownConfigurationFileTypeError,
} from "./index.js";

describe("callidescope-configuration index", () => {
  it("exports the configuration surface", () => {
    expect(ConfigurationModule).toBeDefined();
    expect(ConfigurationService).toBeDefined();
    expect(ConfigurationFileNotFoundError).toBeDefined();
    expect(UnknownConfigurationFileTypeError).toBeDefined();
    expect(callidescopeConfigurationSchema).toBeDefined();
    expect(DEFAULT_EXCLUDE_GLOBS).toBeDefined();
    expect(DEFAULT_ENTRY_POINT_DECORATORS).toBeDefined();
    expect(DEFAULT_MAXIMUM_DEPTH).toBeDefined();
  });

  it("publishes one service and one module, and no other collaborator", () => {
    // The layer's whole contract. `ConfigurationFileService`,
    // `ProjectConfigurationService`, `RunPlanService`, `FlagResolutionService`
    // and `InputService` are all still here, each its own class in its own
    // file; they are simply reached through the facade, so a consumer injects
    // one thing from this package rather than five.
    expect(
      Object.entries(surface)
        .filter(([name]) => name.endsWith("Service") || name.endsWith("Module"))
        .map(([name]) => name),
    ).toStrictEqual(["ConfigurationModule", "ConfigurationService"]);
  });
});
