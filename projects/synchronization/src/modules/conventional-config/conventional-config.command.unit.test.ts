import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import { expectProcessExitOne } from "../../../testing/mocks";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { ConventionalConfigCommand } from "./conventional-config.command";
import { ConventionalConfigService } from "./conventional-config.service";

describe(ConventionalConfigCommand, () => {
  let command: ConventionalConfigCommand;
  let logger: LoggerService;

  const conventionalConfigService = createMock<ConventionalConfigService>();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConventionalConfigCommand,
        SynchronizationService,
        {
          provide: ConventionalConfigService,
          useValue: conventionalConfigService,
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(ConventionalConfigCommand);
    logger = await module.resolve(LoggerService);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConventionalConfigCommand,
        SynchronizationService,
        {
          provide: ConventionalConfigService,
          useValue: createMock<ConventionalConfigService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ConventionalConfigCommand");
  });

  it.each([
    {
      expectedMode: "check",
      modeArguments: [],
      scenarioName: "runs synchronization in check mode by default",
    },
    {
      expectedMode: "write",
      modeArguments: ["write"],
      scenarioName: "runs synchronization with the provided mode",
    },
  ])("$scenarioName", async ({ expectedMode, modeArguments }) => {
    await command.run(modeArguments);

    expect(conventionalConfigService.runSynchronization).toHaveBeenCalledWith(
      expectedMode,
    );
  });

  it("exits for invalid mode", async () => {
    await expectProcessExitOne(async () => command.run(["invalid-mode"]));

    expect(logger.error).toHaveBeenCalledWith(
      "🚦 Rejected an unusable mode",
      undefined,
      expect.any(Object),
    );
  });

  it("exits non-zero when synchronization reports drift", async () => {
    conventionalConfigService.runSynchronization.mockReturnValueOnce(false);

    await expectProcessExitOne(async () => command.run(["check"]));

    expect(conventionalConfigService.runSynchronization).toHaveBeenCalledWith(
      "check",
    );
  });

  it("does not exit when synchronization is already current", async () => {
    conventionalConfigService.runSynchronization.mockReturnValueOnce(true);

    await expect(command.run(["check"])).resolves.toBeUndefined();
  });
});
