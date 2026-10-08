import { describe, expect, it } from "vitest";

import * as core from "./index";
import {
  ConfigurationFileNotFoundError,
  InvalidConfigurationError,
  InvalidLimitValueError,
  UnknownConfigurationFileTypeError,
} from "./index";

describe("codometer-core index", () => {
  it("exports the expected components and errors", () => {
    expect(Object.keys(core).toSorted()).toStrictEqual(
      [
        "CODOMETER_SEVERITIES",
        "CODOMETER_STATISTIC_GROUPS",
        "CODOMETER_SYMBOL_KINDS",
        "CODOMETER_SYMBOL_MODIFIERS",
        "CodometerCoreModule",
        "CodometerCoreService",
        "ConfigurationFileNotFoundError",
        "InvalidConfigurationError",
        "InvalidLimitValueError",
        "UnknownConfigurationFileTypeError",
      ].toSorted(),
    );
  });

  it("names the file a configuration was looked for in", () => {
    const error = new ConfigurationFileNotFoundError(
      "/repo/codometer.config.ts",
    );

    expect(error.name).toBe("ConfigurationFileNotFoundError");
    expect(error.message).toContain("/repo/codometer.config.ts");
  });

  it("names the extension a configuration cannot be read from", () => {
    const error = new UnknownConfigurationFileTypeError(
      "/repo/codometer.config.yaml",
    );

    expect(error.name).toBe("UnknownConfigurationFileTypeError");
    expect(error.message).toContain("/repo/codometer.config.yaml");
  });

  it("carries the schema issues a configuration was refused for", () => {
    const error = new InvalidConfigurationError("format: required");

    expect(error.name).toBe("InvalidConfigurationError");
    expect(error.message).toContain("format: required");
  });

  it("names the limit whose value could not be read", () => {
    const error = new InvalidLimitValueError("repository.size", "8 K");

    expect(error.name).toBe("InvalidLimitValueError");
    expect(error.message).toContain("repository.size");
    expect(error.message).toContain("8 K");
  });
});
