import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { expectProcessExitOne } from "../../../testing/mocks";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { PackageManifestsCommand } from "./package-manifests.command";
import { PackageManifestsService } from "./package-manifests.service";

import type { PackageManifestsSummary } from "./package-manifests.types";

describe(PackageManifestsCommand, () => {
  let command: PackageManifestsCommand;
  let logger: LoggerService;

  const packageManifestsService = createMock<PackageManifestsService>();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PackageManifestsCommand,
        SynchronizationService,
        {
          provide: PackageManifestsService,
          useValue: packageManifestsService,
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(PackageManifestsCommand);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    command = new PackageManifestsCommand(
      logger,
      packageManifestsService,
      new SynchronizationService(),
    );
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        PackageManifestsCommand,
        SynchronizationService,
        {
          provide: PackageManifestsService,
          useValue: createMock<PackageManifestsService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("PackageManifestsCommand");
  });

  it("should have correct synchronizationLabel", () => {
    expect(command.synchronizationLabel).toBe("package-manifests");
  });

  describe("run", () => {
    it("runs synchronize with resolved mode", async () => {
      const syncSpy = vi.spyOn(command, "synchronize").mockResolvedValue(true);
      await command.run(["check"]);

      expect(syncSpy).toHaveBeenCalledWith("check");
    });

    it("exits process with 1 when synchronize returns false", async () => {
      vi.spyOn(command, "synchronize").mockResolvedValue(false);

      await expect(
        expectProcessExitOne(async () => {
          await command.run(["check"]);
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe("synchronize", () => {
    it("returns true in check mode when all packages are synchronized", async () => {
      const summary: PackageManifestsSummary = {
        checkedCount: 28,
        failedProjects: [],
        isSynchronized: true,
        succeededProjects: [],
      };
      vi.mocked(packageManifestsService.checkAll).mockReturnValue(summary);

      const result = await command.synchronize("check");

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Verified"),
        undefined,
        expect.objectContaining({ checkedCount: 28 }),
      );
    });

    it("returns false in check mode when packages are out of sync", async () => {
      const summary: PackageManifestsSummary = {
        checkedCount: 28,
        failedProjects: [
          {
            differences: ['license: expected "MIT", received "undefined"'],
            isSynchronized: false,
            packageName: "@conformetry/core",
            projectPath: "packages/ic-suite/conformetry/conformetry-core",
          },
        ],
        isSynchronized: false,
        succeededProjects: [],
      };
      vi.mocked(packageManifestsService.checkAll).mockReturnValue(summary);

      const result = await command.synchronize("check");

      expect(result).toBe(false);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Detected"),
        undefined,
        expect.objectContaining({ failedCount: 1 }),
      );
    });

    it("returns true in write mode and invokes writeAll", async () => {
      const result = await command.synchronize("write");

      expect(result).toBe(true);
      expect(packageManifestsService.writeAll).toHaveBeenCalledWith(
        process.cwd(),
      );
    });

    it("catches errors and returns false", async () => {
      vi.mocked(packageManifestsService.checkAll).mockImplementation(() => {
        throw new Error("File read error");
      });

      const result = await command.synchronize("check");

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed"),
        expect.stringContaining("File read error"),
      );
    });
  });
});
