import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  DEFAULT_CONFIGURATION_PATHS,
  DEFAULT_VALIDATE_TARGET_NAME,
} from "./options.constants";
import { OptionsService } from "./options.service";

describe(OptionsService, () => {
  let service: OptionsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [OptionsService],
    }).compile();

    service = await module.resolve(OptionsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolvePluginOptions", () => {
    it("falls back to defaults when Nx passes nothing", () => {
      expect(service.resolvePluginOptions(undefined)).toStrictEqual({
        configurationPath: DEFAULT_CONFIGURATION_PATHS[0],
        validateTargetName: DEFAULT_VALIDATE_TARGET_NAME,
      });
    });

    it("reads the configured values", () => {
      expect(
        service.resolvePluginOptions({
          configurationPath: "conformetry.config.ts",
          validateTargetName: "conform",
        }),
      ).toStrictEqual({
        configurationPath: "conformetry.config.ts",
        validateTargetName: "conform",
      });
    });

    it("ignores values of the wrong type", () => {
      expect(
        service.resolvePluginOptions({ validateTargetName: 42 })
          .validateTargetName,
      ).toBe(DEFAULT_VALIDATE_TARGET_NAME);
    });
  });

  describe("resolveGeneratorInputs", () => {
    it("keeps the generator's own string options", () => {
      expect(
        service.resolveGeneratorInputs({ name: "my-widget", project: "app" }),
      ).toStrictEqual({ name: "my-widget", project: "app" });
    });

    it("drops the options that configure the plugin", () => {
      expect(
        service.resolveGeneratorInputs({
          configurationPath: "conformetry.config.ts",
          name: "my-widget",
        }),
      ).toStrictEqual({ name: "my-widget" });
    });

    it("drops values that are not text", () => {
      expect(
        service.resolveGeneratorInputs({ dryRun: true, name: "my-widget" }),
      ).toStrictEqual({ name: "my-widget" });
    });

    it("returns nothing for a non-object", () => {
      expect(service.resolveGeneratorInputs("nope")).toStrictEqual({});
    });
  });

  describe("resolveConfigurationPath", () => {
    /** Stands in for a workspace holding exactly the named files. */
    function existsIn(presentPaths: string[]): (candidate: string) => boolean {
      return (candidate) => presentPaths.includes(candidate);
    }

    it("reads the path out of this plugin's registration", () => {
      expect(
        service.resolveConfigurationPath({
          exists: existsIn(["conformetry.config.ts"]),
          nxConfiguration: {
            plugins: [
              {
                options: { targetName: "eslint" },
                plugin: "@nx/eslint/plugin",
              },
              {
                options: { configurationPath: "configuration/conformetry.ts" },
                plugin: "@conformetry/nx",
              },
            ],
          },
        }),
      ).toBe("configuration/conformetry.ts");
    });

    it.each([
      "conformetry.config.ts",
      "conformetry.config.js",
      "conformetry.config.json",
      "conformetry.json",
      ".conformetryrc.json",
      "conformetryrc.ts",
    ])("discovers %s at the workspace root", (presentPath) => {
      expect(
        service.resolveConfigurationPath({
          exists: existsIn([presentPath]),
          nxConfiguration: undefined,
        }),
      ).toBe(presentPath);
    });

    it("prefers the more conventional filename when several are present", () => {
      expect(
        service.resolveConfigurationPath({
          exists: existsIn(["conformetry.json", "conformetry.config.ts"]),
          nxConfiguration: undefined,
        }),
      ).toBe("conformetry.config.ts");
    });

    it("prefers the registration over anything on disk", () => {
      expect(
        service.resolveConfigurationPath({
          exists: existsIn(["conformetry.config.ts"]),
          nxConfiguration: {
            plugins: [
              {
                options: { configurationPath: "elsewhere/conformetry.json" },
                plugin: "@conformetry/nx",
              },
            ],
          },
        }),
      ).toBe("elsewhere/conformetry.json");
    });

    it.each([
      ["no configuration at all", undefined],
      ["a configuration that is not an object", "nx.json"],
      ["a configuration with no plugins", {}],
      ["plugins that are not a list", { plugins: "@nx/eslint/plugin" }],
      ["a list holding no entry for this plugin", { plugins: ["@nx/vite"] }],
      [
        "an entry for this plugin naming no path",
        { plugins: [{ plugin: "@conformetry/nx" }] },
      ],
      [
        "an entry for this plugin whose options are not an object",
        { plugins: [{ options: 7, plugin: "@conformetry/nx" }] },
      ],
    ])("discovers a path given %s", (_description, nxConfiguration) => {
      expect(
        service.resolveConfigurationPath({
          exists: existsIn(["conformetry.json"]),
          nxConfiguration,
        }),
      ).toBe("conformetry.json");
    });

    it("names the conventional path when the workspace holds none of them", () => {
      // Reported rather than thrown, so the failure names a path a reader can
      // go and create instead of listing sixteen alternatives.
      expect(
        service.resolveConfigurationPath({
          exists: existsIn([]),
          nxConfiguration: undefined,
        }),
      ).toBe(DEFAULT_CONFIGURATION_PATHS[0]);
    });
  });
});
