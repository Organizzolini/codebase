import { existsSync } from "node:fs";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PluginService } from "./plugin.service";

vi.mock("node:fs", () => ({
  existsSync: vi.fn<() => boolean>(() => false),
}));

/** A filesystem holding exactly the given workspace-relative paths. */
function existsOnly(...paths: string[]): (candidatePath: string) => boolean {
  return (candidatePath) => paths.includes(candidatePath);
}

describe(PluginService, () => {
  let service: PluginService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PluginService],
    }).compile();

    service = await module.resolve(PluginService);
  });

  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(false);
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("inferTargets", () => {
    it("infers a cached gate delegating to this plugin's executor", () => {
      expect.hasAssertions();

      const targets = service.inferTargets({
        options: { configurationPath: "configuration/codependix.config.ts" },
        projectConfigurationFiles: ["packages/alpha/project.json"],
        toolInputs: ["{workspaceRoot}/tool/src/**/*"],
        workspaceRoot: "/workspace",
      });

      // Pinned exactly: the inputs are what make `nx affected` and the cache
      // correct — the command line's own sources last, since no judged project
      // depends on them — and `configurations` is absent so an aggregator's
      // own configuration falls through to the defaults.
      expect(targets).toStrictEqual(
        new Map([
          [
            "packages/alpha",
            {
              "codependix-gate": {
                cache: true,
                executor: "@codependix/nx:gate",
                inputs: [
                  "default",
                  "^default",
                  "{workspaceRoot}/configuration/codependix.config.ts",
                  "{projectRoot}/codependix.config.*",
                  "{workspaceRoot}/tool/src/**/*",
                ],
                options: {},
              },
            },
          ],
        ]),
      );
    });

    it("skips the workspace root, whose closure is the whole workspace", () => {
      expect.hasAssertions();

      const targets = service.inferTargets({
        options: {},
        projectConfigurationFiles: [
          "project.json",
          "packages/alpha/project.json",
        ],
        toolInputs: ["{workspaceRoot}/tool/src/**/*"],
        workspaceRoot: "/workspace",
      });

      expect([...targets.keys()]).toStrictEqual(["packages/alpha"]);
    });

    it("infers nothing from a matched codependix configuration file", () => {
      expect.hasAssertions();

      // The glob matches it only so that editing it re-runs inference.
      expect(
        service.inferTargets({
          options: {},
          projectConfigurationFiles: ["packages/alpha/codependix.config.ts"],
          toolInputs: ["{workspaceRoot}/tool/src/**/*"],
          workspaceRoot: "/workspace",
        }).size,
      ).toBe(0);
    });

    it("names the gate and its configuration input after the registration", () => {
      expect.hasAssertions();

      const targets = service.inferTargets({
        options: { gateTargetName: "boundaries" },
        projectConfigurationFiles: ["packages/alpha/project.json"],
        toolInputs: ["{workspaceRoot}/tool/src/**/*"],
        workspaceRoot: "/workspace",
      });

      expect(Object.keys(targets.get("packages/alpha") ?? {})).toStrictEqual([
        "boundaries",
      ]);
      expect(targets.get("packages/alpha")?.["boundaries"]?.inputs).toContain(
        "{workspaceRoot}/codependix.config.ts",
      );
    });

    it("searches the workspace for a configuration the registration did not name", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockImplementation(
        (candidatePath) =>
          candidatePath === "/workspace/configuration/codependix.config.ts",
      );

      const targets = service.inferTargets({
        options: {},
        projectConfigurationFiles: ["packages/alpha/project.json"],
        toolInputs: ["{workspaceRoot}/tool/src/**/*"],
        workspaceRoot: "/workspace",
      });

      expect(
        targets.get("packages/alpha")?.["codependix-gate"]?.inputs,
      ).toContain("{workspaceRoot}/configuration/codependix.config.ts");
    });
  });

  describe("resolvePluginOptions", () => {
    it("reads the target name and configuration path a registration gives", () => {
      expect.hasAssertions();

      expect(
        service.resolvePluginOptions({
          exists: existsOnly(),
          options: {
            configurationPath: "configuration/codependix.config.ts",
            gateTargetName: "boundaries",
          },
        }),
      ).toStrictEqual({
        configurationPath: "configuration/codependix.config.ts",
        gateTargetName: "boundaries",
      });
    });

    it.each([
      ["nothing registered", undefined],
      ["a null registration", null],
      ["a string registration", "@codependix/nx"],
      ["an empty registration", {}],
      ["non-string values", { configurationPath: 7, gateTargetName: false }],
      ["empty strings", { configurationPath: "", gateTargetName: "" }],
    ])("falls back to the defaults given %s", (_description, options) => {
      expect.hasAssertions();

      // A typo in nx.json must not stop the project graph from being built.
      expect(
        service.resolvePluginOptions({ exists: existsOnly(), options }),
      ).toStrictEqual({
        configurationPath: "codependix.config.ts",
        gateTargetName: "codependix-gate",
      });
    });

    it("searches the conventional paths for a configuration nobody named", () => {
      expect.hasAssertions();

      expect(
        service.resolvePluginOptions({
          exists: existsOnly("configuration/codependix.config.ts"),
          options: {},
        }).configurationPath,
      ).toBe("configuration/codependix.config.ts");
    });

    it("prefers the workspace root's configuration when both exist", () => {
      expect.hasAssertions();

      expect(
        service.resolvePluginOptions({
          exists: existsOnly(
            "codependix.config.ts",
            "configuration/codependix.config.ts",
          ),
          options: {},
        }).configurationPath,
      ).toBe("codependix.config.ts");
    });
  });

  describe("readRegisteredOptions", () => {
    it("returns the options this plugin is registered with", () => {
      expect.hasAssertions();

      expect(
        service.readRegisteredOptions({
          plugins: [
            "@nx/js",
            { options: { gateTargetName: "other" }, plugin: "@other/nx" },
            {
              options: { configurationPath: "registered.config.ts" },
              plugin: "@codependix/nx",
            },
          ],
        }),
      ).toStrictEqual({ configurationPath: "registered.config.ts" });
    });

    it.each([
      ["no nx.json", undefined],
      ["a null nx.json", null],
      ["no plugins", {}],
      ["plugins that are not a list", { plugins: "@codependix/nx" }],
      ["a registration without options", { plugins: ["@codependix/nx"] }],
      ["a null plugin entry", { plugins: [null] }],
      ["only other plugins", { plugins: [{ plugin: "@other/nx" }] }],
    ])("returns nothing given %s", (_description, nxConfiguration) => {
      expect.hasAssertions();
      expect(service.readRegisteredOptions(nxConfiguration)).toBeUndefined();
    });
  });
});
