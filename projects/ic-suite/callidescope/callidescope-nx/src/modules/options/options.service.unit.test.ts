import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

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
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("resolvePluginOptions", () => {
    it("reads every target name and the configuration path a registration gives", () => {
      expect.hasAssertions();

      expect(
        service.resolvePluginOptions({
          breadthTargetName: "callidescope-breadth",
          configurationPath: "configuration/callidescope.config.ts",
          depthTargetName: "callidescope-depth",
          gateTargetName: "callidescope-gate",
          traceTargetName: "callidescope-trace",
        }),
      ).toStrictEqual({
        breadthTargetName: "callidescope-breadth",
        configurationPath: "configuration/callidescope.config.ts",
        depthTargetName: "callidescope-depth",
        gateTargetName: "callidescope-gate",
        traceTargetName: "callidescope-trace",
      });
    });

    it.each([
      ["nothing registered", undefined],
      ["a null registration", null],
      ["an empty registration", {}],
      ["a non-string target name", { traceTargetName: 7 }],
      ["an empty target name", { traceTargetName: "" }],
    ])("falls back to the defaults given %s", (_description, options) => {
      expect.hasAssertions();

      // A typo in a target name must not stop the project graph being built.
      expect(service.resolvePluginOptions(options)).toStrictEqual({
        breadthTargetName: "breadth",
        configurationPath: "callidescope.config.ts",
        depthTargetName: "depth",
        gateTargetName: "gate",
        traceTargetName: "trace",
      });
    });

    it("overrides one target name without disturbing the others", () => {
      expect.hasAssertions();

      expect(
        service.resolvePluginOptions({ depthTargetName: "callidescope-depth" }),
      ).toMatchObject({
        breadthTargetName: "breadth",
        depthTargetName: "callidescope-depth",
        gateTargetName: "gate",
        traceTargetName: "trace",
      });
    });
  });

  describe("resolveConfigurationPath", () => {
    it("prefers the path this plugin's registration names", () => {
      expect.hasAssertions();

      expect(
        service.resolveConfigurationPath({
          exists: () => true,
          nxConfiguration: {
            plugins: [
              {
                options: { configurationPath: "elsewhere.ts" },
                plugin: "@callidescope/nx",
              },
            ],
          },
        }),
      ).toBe("elsewhere.ts");
    });

    it("ignores another plugin's registration", () => {
      expect.hasAssertions();

      expect(
        service.resolveConfigurationPath({
          exists: (candidatePath) =>
            candidatePath === "configuration/callidescope.config.ts",
          nxConfiguration: {
            plugins: [
              {
                options: { configurationPath: "elsewhere.ts" },
                plugin: "@conformetry/nx",
              },
            ],
          },
        }),
      ).toBe("configuration/callidescope.config.ts");
    });

    it.each([
      ["an unreadable nx.json", undefined],
      ["a null nx.json", null],
      ["a non-object nx.json", "nx.json"],
      ["an nx.json with no plugins array", { plugins: "not an array" }],
      ["a plugins array holding a non-entry", { plugins: [null, 7] }],
      [
        "a registration with non-object options",
        {
          plugins: [{ options: 7, plugin: "@callidescope/nx" }],
        },
      ],
    ])("ignores %s", (_description, nxConfiguration) => {
      expect.hasAssertions();

      expect(
        service.resolveConfigurationPath({
          exists: (candidatePath) =>
            candidatePath === "configuration/callidescope.config.ts",
          nxConfiguration,
        }),
      ).toBe("configuration/callidescope.config.ts");
    });

    it("falls back to the first conventional path when none exists", () => {
      expect.hasAssertions();

      expect(
        service.resolveConfigurationPath({
          exists: () => false,
          nxConfiguration: { plugins: "not an array" },
        }),
      ).toBe("callidescope.config.ts");
    });
  });

  describe("readStringList", () => {
    it.each([
      ["an array", ["alpha", "beta"], ["alpha", "beta"]],
      ["a comma-separated entry", ["alpha,beta"], ["alpha", "beta"]],
      ["a bare string", "alpha,beta", ["alpha", "beta"]],
      [
        "blank and untrimmed entries",
        [" alpha ", "", " , beta"],
        ["alpha", "beta"],
      ],
      ["non-string entries", ["alpha", 7, null], ["alpha"]],
      ["a non-list", 7, []],
      ["nothing", undefined, []],
    ])("reads %s", (_description, value, expected) => {
      expect.hasAssertions();
      expect(service.readStringList(value)).toStrictEqual(expected);
    });
  });

  describe("readFormat", () => {
    it.each(["json", "markdown", "mermaid"])("accepts %s", (format) => {
      expect.hasAssertions();
      expect(service.readFormat(format)).toBe(format);
    });

    it.each([
      ["an unknown format", "yaml"],
      ["a non-string", 7],
      ["nothing", undefined],
    ])("refuses %s, leaving the configured format alone", (_d, value) => {
      expect.hasAssertions();
      expect(service.readFormat(value)).toBeUndefined();
    });
  });
});
