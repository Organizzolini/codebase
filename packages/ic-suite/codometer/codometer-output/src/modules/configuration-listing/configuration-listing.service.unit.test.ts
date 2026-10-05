import {
  ConfigurationService as CodometerConfigurationService,
  DEFAULT_EXCLUDE_GLOBS,
} from "@codometer/configuration";
import { DiscoveryService } from "@codometer/measurement";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ConfigurationListingService } from "./configuration-listing.service";

import type {
  LoadedConfiguration,
  ResolvedCodometerConfiguration,
} from "@codometer/configuration";
import type { DiscoveryResult } from "@codometer/measurement";

/** A resolved configuration with only the fields these tests read filled in. */
function buildConfiguration(
  overrides: Partial<ResolvedCodometerConfiguration> = {},
): ResolvedCodometerConfiguration {
  return {
    custom: [],
    defaultInput: undefined,
    exclude: [],
    excludeFrom: [],
    format: "json",
    inputs: [],
    limits: [],
    outputs: [],
    python: { command: "python" },
    ...overrides,
  };
}

/** A discovery result holding the given files and nothing categorized. */
function buildDiscovery(files: string[]): DiscoveryResult {
  return {
    cssFiles: [],
    files,
    hclFiles: [],
    jsFiles: [],
    jsonFiles: [],
    markdownFiles: [],
    notebookFiles: [],
    pyFiles: [],
    shellFiles: [],
    sourceFiles: [],
    sqlFiles: [],
    testFiles: [],
    tomlFiles: [],
    tsFiles: [],
    yamlFiles: [],
  };
}

describe(ConfigurationListingService, () => {
  let service: ConfigurationListingService;
  let codometerConfigurationService: CodometerConfigurationService;
  let discoveryService: DiscoveryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConfigurationListingService,
        {
          provide: CodometerConfigurationService,
          useValue: createMock<CodometerConfigurationService>(),
        },
        {
          provide: DiscoveryService,
          useValue: createMock<DiscoveryService>(),
        },
      ],
    }).compile();

    service = await module.resolve(ConfigurationListingService);
    codometerConfigurationService = module.get(CodometerConfigurationService);
    discoveryService = module.get(DiscoveryService);
  });

  beforeEach(() => {
    vi.mocked(codometerConfigurationService.loadConfigurationFile).mockReset();
    vi.mocked(discoveryService.discoverFiles).mockReset();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("findConfigurationFiles", () => {
    it("keeps only files named like a configuration, in every supported format", async () => {
      vi.mocked(
        codometerConfigurationService.loadConfigurationFile,
      ).mockResolvedValue({
        configuration: buildConfiguration(),
        path: undefined,
      });
      vi.mocked(discoveryService.discoverFiles).mockReturnValue(
        buildDiscovery([
          "packages/one/codometer.config.ts",
          "packages/two/codometer.config.cjs",
          "packages/three/codometer.config.json",
          "packages/four/codometer.config.txt",
          "packages/five/index.ts",
        ]),
      );

      await expect(
        service
          .findConfigurationFiles({
            configurationPath: undefined,
            workingDirectory: "/repository",
          })
          .then((discovered) => discovered.files),
      ).resolves.toStrictEqual([
        "packages/one/codometer.config.ts",
        "packages/three/codometer.config.json",
        "packages/two/codometer.config.cjs",
      ]);
    });

    it("walks with the exclusions the root configuration declares", async () => {
      vi.mocked(
        codometerConfigurationService.loadConfigurationFile,
      ).mockResolvedValue({
        configuration: buildConfiguration({
          exclude: ["templates/**"],
          excludeFrom: [".codometerignore"],
        }),
        path: undefined,
      });
      vi.mocked(discoveryService.discoverFiles).mockReturnValue(
        buildDiscovery([]),
      );

      await service.findConfigurationFiles({
        configurationPath: undefined,
        workingDirectory: "/repository",
      });

      expect(discoveryService.discoverFiles).toHaveBeenCalledWith({
        exclude: ["templates/**"],
        excludeFrom: [".codometerignore"],
        workingDirectory: "/repository",
      });
    });

    it("takes the walk root's exclusions from the configuration it was pointed at", async () => {
      vi.mocked(
        codometerConfigurationService.loadConfigurationFile,
      ).mockResolvedValue({
        configuration: buildConfiguration(),
        path: undefined,
      });
      vi.mocked(discoveryService.discoverFiles).mockReturnValue(
        buildDiscovery([]),
      );

      // A workspace whose root carries no configuration file names the shared
      // one instead of falling back to the built-in exclusions.
      await service.findConfigurationFiles({
        configurationPath: "configuration/codometer.config.ts",
        workingDirectory: "/repository",
      });

      expect(
        codometerConfigurationService.loadConfigurationFile,
      ).toHaveBeenCalledWith({
        configurationPath: "configuration/codometer.config.ts",
        searchDirectory: "/repository",
      });
    });
  });

  describe("describeConfigurations", () => {
    it("keeps listing, and says so, when no configuration answers for the walk root", async () => {
      vi.mocked(discoveryService.discoverFiles).mockReturnValue(
        buildDiscovery(["packages/one/codometer.config.ts"]),
      );
      vi.mocked(codometerConfigurationService.loadConfigurationFile)
        .mockRejectedValueOnce(new Error("needs a format"))
        .mockResolvedValueOnce({
          configuration: buildConfiguration(),
          path: undefined,
        } satisfies LoadedConfiguration);

      const { described, rootError } = await service.describeConfigurations({
        configurationPath: undefined,
        workingDirectory: "/repository",
      });

      // The walk still happened, with the built-in exclusions standing in for
      // the ones the unreadable root would have declared.
      expect(discoveryService.discoverFiles).toHaveBeenCalledWith({
        exclude: [...DEFAULT_EXCLUDE_GLOBS],
        excludeFrom: [],
        workingDirectory: "/repository",
      });
      expect(described.map((entry) => entry.directory)).toStrictEqual([
        "packages/one",
      ]);
      expect(rootError).toBe("needs a format");
    });

    it("reports a file that cannot be loaded rather than failing the listing", async () => {
      vi.mocked(discoveryService.discoverFiles).mockReturnValue(
        buildDiscovery(["packages/broken/codometer.config.ts"]),
      );
      vi.mocked(codometerConfigurationService.loadConfigurationFile)
        .mockResolvedValueOnce({
          configuration: buildConfiguration(),
          path: undefined,
        } satisfies LoadedConfiguration)
        .mockRejectedValueOnce(new Error("Cannot find module"));

      const { described, rootError } = await service.describeConfigurations({
        configurationPath: undefined,
        workingDirectory: "/repository",
      });

      expect(rootError).toBeUndefined();
      expect(described).toStrictEqual([
        {
          configuration: undefined,
          directory: "packages/broken",
          error: "Cannot find module",
          path: "packages/broken/codometer.config.ts",
        },
      ]);
    });

    // A loader reached through `jiti` can reject with whatever the
    // configuration file itself threw, which need not be an `Error` at all.
    it("reads a thrown value that is not an Error as its own text", async () => {
      vi.mocked(discoveryService.discoverFiles).mockReturnValue(
        buildDiscovery(["packages/broken/codometer.config.ts"]),
      );
      vi.mocked(codometerConfigurationService.loadConfigurationFile)
        .mockResolvedValueOnce({
          configuration: buildConfiguration(),
          path: undefined,
        } satisfies LoadedConfiguration)
        .mockRejectedValueOnce("exploded");

      const { described } = await service.describeConfigurations({
        configurationPath: undefined,
        workingDirectory: "/repository",
      });

      expect(described.map((entry) => entry.error)).toStrictEqual(["exploded"]);
    });

    it("reads a non-Error thrown for the walk root as its own text", async () => {
      vi.mocked(discoveryService.discoverFiles).mockReturnValue(
        buildDiscovery([]),
      );
      vi.mocked(
        codometerConfigurationService.loadConfigurationFile,
      ).mockRejectedValueOnce("exploded");

      const { rootError } = await service.describeConfigurations({
        configurationPath: undefined,
        workingDirectory: "/repository",
      });

      expect(rootError).toBe("exploded");
    });
  });

  describe("toLimitRows", () => {
    it("renders a size limit as bytes and a count limit as a count", () => {
      const rows = service.toLimitRows([
        {
          configuration: buildConfiguration({
            limits: [
              {
                label: undefined,
                metric: "Compiled JavaScript.size",
                severity: "fail",
                value: 6000,
              },
              {
                label: "Lines",
                metric: "codebase.linesOfCode",
                severity: "warn",
                value: 20,
              },
            ],
          }),
          directory: "packages/logging",
          error: undefined,
          path: "packages/logging/codometer.config.ts",
        },
      ]);

      expect(rows.map((row) => [row.label, row.value])).toStrictEqual([
        ["—", "6.00 kB"],
        ["Lines", "20"],
      ]);
    });

    it("contributes no rows for a configuration that failed to load", () => {
      expect(
        service.toLimitRows([
          {
            configuration: undefined,
            directory: "packages/broken",
            error: "Cannot find module",
            path: "packages/broken/codometer.config.ts",
          },
        ]),
      ).toStrictEqual([]);
    });
  });
});
