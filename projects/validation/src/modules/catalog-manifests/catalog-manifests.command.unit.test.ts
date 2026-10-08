import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { mockProcessExit } from "../../../testing/mocks";

import { CatalogManifestsCommand } from "./catalog-manifests.command";
import { CatalogManifestsService } from "./catalog-manifests.service";

describe(CatalogManifestsCommand, () => {
  let command: CatalogManifestsCommand;
  let catalogManifestsService: CatalogManifestsService;
  let reportLines: string[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CatalogManifestsCommand,
        {
          provide: CatalogManifestsService,
          useValue: createMock<CatalogManifestsService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(CatalogManifestsCommand);
    catalogManifestsService = await module.resolve(CatalogManifestsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    reportLines = [];
    vi.spyOn(console, "info").mockImplementation((line: unknown): void => {
      reportLines.push(String(line));
    });
    vi.spyOn(console, "error").mockImplementation((line: unknown): void => {
      reportLines.push(String(line));
    });
    vi.mocked(
      catalogManifestsService.resolveWorkspaceManifestPaths,
    ).mockReturnValue(["package.json", "projects/logging/package.json"]);
    vi.mocked(catalogManifestsService.readManifest).mockReturnValue({});
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        CatalogManifestsCommand,
        {
          provide: CatalogManifestsService,
          useValue: createMock<CatalogManifestsService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("CatalogManifestsCommand");
  });

  it("reports how many manifests passed", async () => {
    expect.hasAssertions();

    vi.mocked(
      catalogManifestsService.validateManifestDependencies,
    ).mockReturnValue([]);

    await command.run();

    expect(reportLines).toStrictEqual([
      "Catalog policy passed for 2 workspace manifests.",
    ]);
  });

  it("reports every violation together and exits non-zero", async () => {
    expect.hasAssertions();

    vi.mocked(
      catalogManifestsService.validateManifestDependencies,
    ).mockImplementation((manifestPath: string) =>
      manifestPath === "package.json"
        ? ["package.json -> dependencies.zod must use catalog: (found ^3.0.0)"]
        : [
            "projects/logging/package.json -> dependencies.pino must use catalog: (found ^9.0.0)",
          ],
    );

    const processExitSpy = mockProcessExit();

    await expect(command.run()).rejects.toThrow("process.exit:1");

    processExitSpy.mockRestore();

    expect(reportLines).toStrictEqual([
      "Catalog policy violations found:",
      "- package.json -> dependencies.zod must use catalog: (found ^3.0.0)",
      "- projects/logging/package.json -> dependencies.pino must use catalog: (found ^9.0.0)",
    ]);
  });
});
