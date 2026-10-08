import { existsSync, readFileSync } from "node:fs";

import { ConfigurationService } from "@callidescope/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { OptionsService } from "../options/options.service";

import { RunConfigurationService } from "./run-configuration.service";

import type { ResolvedCallidescopeConfiguration } from "@callidescope/configuration";

vi.mock("node:fs", () => ({
  existsSync: vi.fn<() => boolean>(() => true),
  readFileSync: vi.fn<() => string>(() => "{}"),
}));

describe(RunConfigurationService, () => {
  let configurationService: ReturnType<typeof createMock<ConfigurationService>>;
  let service: RunConfigurationService;

  beforeAll(async () => {
    configurationService = createMock<ConfigurationService>();

    const module = await Test.createTestingModule({
      providers: [
        RunConfigurationService,
        { provide: ConfigurationService, useValue: configurationService },
        OptionsService,
      ],
    }).compile();

    service = await module.resolve(RunConfigurationService);
  });

  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue("{}");
    configurationService.loadConfigurationFile.mockResolvedValue({
      authored: {},
      configuration: createMock<ResolvedCallidescopeConfiguration>(),
      path: "configuration/callidescope.config.ts",
    });
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("load", () => {
    it("hands back the path the loader settled on, never the one it was given", async () => {
      expect.hasAssertions();

      // A run resolves a project's own configuration relative to this, so the
      // searched-for answer is the one that has to travel onward.
      await expect(
        service
          .load({ configurationPath: "elsewhere.ts", workspaceRoot: "/w" })
          .then((loaded) => loaded.path),
      ).resolves.toBe("configuration/callidescope.config.ts");
      expect(configurationService.loadConfigurationFile).toHaveBeenCalledWith({
        configurationPath: "elsewhere.ts",
        searchDirectory: "/w",
      });
    });

    it("reads the path out of this plugin's own nx.json registration", async () => {
      expect.hasAssertions();

      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          plugins: [
            {
              options: { configurationPath: "registered.config.ts" },
              plugin: "@callidescope/nx",
            },
          ],
        }),
      );

      await service.load({ workspaceRoot: "/w" });

      expect(configurationService.loadConfigurationFile).toHaveBeenCalledWith({
        configurationPath: "registered.config.ts",
        searchDirectory: "/w",
      });
    });

    it("falls back to a conventional path when nx.json cannot be read", async () => {
      expect.hasAssertions();

      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });

      // An unreadable nx.json is what a workspace with no registration looks
      // like, so it resolves the same way rather than failing the run.
      await service.load({ workspaceRoot: "/w" });

      expect(configurationService.loadConfigurationFile).toHaveBeenCalledWith({
        configurationPath: "callidescope.config.ts",
        searchDirectory: "/w",
      });
    });
  });
});
