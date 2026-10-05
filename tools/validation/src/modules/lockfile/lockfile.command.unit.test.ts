import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { mockProcessExit } from "../../../testing/mocks";

import { LockfileCommand } from "./lockfile.command";
import { LockfileService } from "./lockfile.service";

describe(LockfileCommand, () => {
  let command: LockfileCommand;
  let lockfileService: LockfileService;
  let reportLines: string[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LockfileCommand,
        { provide: LockfileService, useValue: createMock<LockfileService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(LockfileCommand);
    lockfileService = await module.resolve(LockfileService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    reportLines = [];
    vi.spyOn(console, "info").mockImplementation((line: unknown): void => {
      reportLines.push(String(line));
    });
    vi.spyOn(console, "warn").mockImplementation((line: unknown): void => {
      reportLines.push(String(line));
    });
    vi.spyOn(console, "error").mockImplementation((line: unknown): void => {
      reportLines.push(String(line));
    });
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        LockfileCommand,
        { provide: LockfileService, useValue: createMock<LockfileService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("LockfileCommand");
  });

  it("reports a lockfile that is in sync", async () => {
    expect.hasAssertions();

    vi.mocked(lockfileService.checkLockfile).mockReturnValue({
      available: true,
      output: "Already up to date",
      succeeded: true,
    });

    await command.run();

    expect(reportLines).toStrictEqual(["🔒 pnpm-lock.yaml is in sync"]);
  });

  it("reports a lockfile that is out of sync, with pnpm's own output", async () => {
    expect.hasAssertions();

    vi.mocked(lockfileService.checkLockfile).mockReturnValue({
      available: true,
      output: "specifiers in the lockfile don't match",
      succeeded: false,
    });

    const processExitSpy = mockProcessExit();

    await expect(command.run()).rejects.toThrow("process.exit:1");

    processExitSpy.mockRestore();

    expect(reportLines).toStrictEqual([
      "❌ pnpm-lock.yaml is out of sync with package.json files",
      "💡 Run 'pnpm install' to update the lockfile and try committing again",
      "",
      "pnpm output:",
      "specifiers in the lockfile don't match",
    ]);
  });

  it("passes, with a warning, when pnpm cannot be found", async () => {
    expect.hasAssertions();

    vi.mocked(lockfileService.checkLockfile).mockReturnValue({
      available: false,
      output: "",
      succeeded: false,
    });

    await command.run();

    expect(reportLines).toStrictEqual([
      "⚠️  pnpm not found in PATH; skipping lockfile check",
    ]);
  });
});
