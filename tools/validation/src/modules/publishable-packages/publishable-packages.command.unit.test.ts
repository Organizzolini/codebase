import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { mockProcessExit } from "../../../testing/mocks";

import { PublishablePackagesCommand } from "./publishable-packages.command";
import { formatPublishablePackagesSuccessMessage } from "./publishable-packages.constants";
import { PublishablePackagesService } from "./publishable-packages.service";

describe(PublishablePackagesCommand, () => {
  let command: PublishablePackagesCommand;
  let service: PublishablePackagesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PublishablePackagesCommand,
        {
          provide: PublishablePackagesService,
          useValue: createMock<PublishablePackagesService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(PublishablePackagesCommand);
    service = await module.resolve(PublishablePackagesService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        PublishablePackagesCommand,
        {
          provide: PublishablePackagesService,
          useValue: createMock<PublishablePackagesService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith(
      "PublishablePackagesCommand",
    );
  });

  it("logs success message when verification succeeds", async () => {
    expect.hasAssertions();

    vi.mocked(service.verifyPublishablePackages).mockReturnValue({
      binaryCount: 4,
      messages: [],
      packageCount: 28,
      succeeded: true,
    });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await command.run();

    expect(infoSpy).toHaveBeenCalledWith(
      formatPublishablePackagesSuccessMessage(28, 4),
    );
  });

  it("logs error messages and exits with code 1 when verification fails", async () => {
    expect.hasAssertions();

    vi.mocked(service.verifyPublishablePackages).mockReturnValue({
      binaryCount: 0,
      messages: ["Error 1"],
      packageCount: 0,
      succeeded: false,
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const processExitSpy = mockProcessExit();

    await expect(command.run()).rejects.toThrow("process.exit:1");

    processExitSpy.mockRestore();

    expect(errorSpy).toHaveBeenCalledWith("Error 1");
  });

  it("exits with code 1 when verification throws", async () => {
    expect.hasAssertions();

    vi.mocked(service.verifyPublishablePackages).mockImplementation(() => {
      throw new Error("Refusing to run publish");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const processExitSpy = mockProcessExit();

    await expect(command.run()).rejects.toThrow("process.exit:1");

    processExitSpy.mockRestore();

    expect(errorSpy).toHaveBeenCalledWith("Error: Refusing to run publish");
  });
});
