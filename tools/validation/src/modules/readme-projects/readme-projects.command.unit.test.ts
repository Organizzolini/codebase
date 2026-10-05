import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { mockProcessExit } from "../../../testing/mocks";

import { ReadmeProjectsCommand } from "./readme-projects.command";
import { ReadmeProjectsService } from "./readme-projects.service";

describe(ReadmeProjectsCommand, () => {
  let command: ReadmeProjectsCommand;
  let readmeProjectsService: ReadmeProjectsService;
  let reportLines: string[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReadmeProjectsCommand,
        {
          provide: ReadmeProjectsService,
          useValue: createMock<ReadmeProjectsService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(ReadmeProjectsCommand);
    readmeProjectsService = await module.resolve(ReadmeProjectsService);
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
      readmeProjectsService.resolveWorkspaceProjectPaths,
    ).mockReturnValue(["packages/logging", "tools/validation"]);
    vi.mocked(readmeProjectsService.readRootReadme).mockReturnValue(
      "- **[logger](packages/logging)** - Shared logger\n- **[validation](tools/validation)** - Checks",
    );
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        ReadmeProjectsCommand,
        {
          provide: ReadmeProjectsService,
          useValue: createMock<ReadmeProjectsService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ReadmeProjectsCommand");
  });

  it("reports how many projects the README documents", async () => {
    expect.hasAssertions();

    vi.mocked(
      readmeProjectsService.findUndocumentedProjectPaths,
    ).mockReturnValue([]);

    await command.run();

    expect(reportLines).toStrictEqual([
      "Root README documents all 2 workspace projects.",
    ]);
  });

  it("reports every undocumented project together and exits non-zero", async () => {
    expect.hasAssertions();

    vi.mocked(
      readmeProjectsService.findUndocumentedProjectPaths,
    ).mockReturnValue(["packages/orphan", "tools/stray"]);

    const processExitSpy = mockProcessExit();

    await expect(command.run()).rejects.toThrow("process.exit:1");

    processExitSpy.mockRestore();

    expect(reportLines).toStrictEqual([
      "Root README is missing these workspace projects:",
      "- packages/orphan",
      "- tools/stray",
    ]);
  });
});
