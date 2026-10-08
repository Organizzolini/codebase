import { describe, expect, it } from "vitest";

import * as surface from "./index.js";
import {
  ALL_TEMPLATES_SELECTION,
  ConfigurationModule,
  ConfigurationService,
  InputError,
  missingInputError,
  MissingSubstitutionError,
  UnknownConfigurationFileTypeError,
} from "./index.js";

describe("conformetry-configuration index", () => {
  it("exports the configuration surface", () => {
    expect(ConfigurationModule).toBeDefined();
    expect(ConfigurationService).toBeDefined();
    expect(UnknownConfigurationFileTypeError).toBeDefined();
    expect(MissingSubstitutionError).toBeDefined();
    expect(InputError).toBeDefined();
    expect(missingInputError).toBeDefined();
    expect(ALL_TEMPLATES_SELECTION).toBeDefined();
  });

  it("publishes one service and one module, and no other collaborator", () => {
    // The layer's whole contract, and the shape the three sibling ic-suite
    // toolchains already publish. `InputService`, `InputPromptingService`,
    // `InstanceDiscoveryService`, `TemplateDiscoveryService`,
    // `RenderingService` and `InstanceGroupService` are all still here, each
    // its own class in its own file; they are simply reached through the
    // facade, so a consumer injects one thing from this package rather than
    // fourteen.
    expect(
      Object.entries(surface)
        .filter(([name]) => name.endsWith("Service") || name.endsWith("Module"))
        .map(([name]) => name),
    ).toStrictEqual(["ConfigurationModule", "ConfigurationService"]);
  });
});
