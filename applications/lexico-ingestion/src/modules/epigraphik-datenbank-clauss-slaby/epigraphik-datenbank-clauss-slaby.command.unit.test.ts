import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import {
  createCommandTestHarness,
  resetCommandTestHarness,
} from "../../../testing/command-harness";

import { EpigraphikDatenbankClaussSlabyCommand } from "./epigraphik-datenbank-clauss-slaby.command";

const {
  accessMock,
  appendFileMock,
  existsSyncMock,
  mkdirMock,
  mkdirSyncMock,
  writeFileMock,
} = vi.hoisted(() => ({
  accessMock: vi.fn<() => Promise<void>>(),
  appendFileMock: vi.fn<() => Promise<void>>(),
  existsSyncMock: vi.fn<() => boolean>(),
  mkdirMock: vi.fn<() => Promise<string | undefined>>(),
  mkdirSyncMock: vi.fn<(...parameters: unknown[]) => void>(),
  writeFileMock: vi.fn<() => Promise<void>>(),
}));

vi.mock("node:fs", () => ({
  existsSync: existsSyncMock,
  mkdirSync: mkdirSyncMock,
}));

vi.mock("node:fs/promises", () => ({
  access: accessMock,
  appendFile: appendFileMock,
  mkdir: mkdirMock,
  writeFile: writeFileMock,
}));

describe(EpigraphikDatenbankClaussSlabyCommand, () => {
  let command: EpigraphikDatenbankClaussSlabyCommand;
  let logger: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EpigraphikDatenbankClaussSlabyCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(EpigraphikDatenbankClaussSlabyCommand);
    logger = module.get(LoggerService);
  });

  beforeEach(() => {
    resetCommandTestHarness();
    existsSyncMock.mockReturnValue(true);
    mkdirMock.mockResolvedValue(undefined);
    appendFileMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    logger.createTimestampedOutputLogFilePath.mockReturnValue(
      "/tmp/edcs-errors.log",
    );
    logger.buildErrorLogEntry.mockImplementation((context, error) => {
      const errorMessage =
        error instanceof Error ? error.stack || error.message : String(error);
      return {
        errorMessage,
        logLine: `[${new Date().toISOString()}] ${context}: ${errorMessage}\n`,
      };
    });
    (command as unknown as { errorLogFilePath: string }).errorLogFilePath =
      "/tmp/edcs-errors.log";
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        EpigraphikDatenbankClaussSlabyCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith(
      "EpigraphikDatenbankClaussSlabyCommand",
    );
  });

  it("should create output directory when it does not exist", async () => {
    const bootstrapLogger = createMock<LoggerService>();
    bootstrapLogger.createTimestampedOutputLogFilePath.mockReturnValue(
      "/tmp/edcs-errors.log",
    );

    const commandHarness = await createCommandTestHarness({
      additionalProviders: [
        {
          provide: LoggerService,
          useValue: bootstrapLogger,
        },
      ],
      commandType: EpigraphikDatenbankClaussSlabyCommand,
    });

    await commandHarness.testingModule.resolve(
      EpigraphikDatenbankClaussSlabyCommand,
    );

    expect(
      bootstrapLogger.createTimestampedOutputLogFilePath,
    ).toHaveBeenCalledWith("edcs");
  });

  it("should save chunk data and stop when payload has no records", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({
            json: async () => await Promise.resolve({ data: [] }),
            ok: true,
          }),
      ),
    );

    const shouldContinue = await (
      command as unknown as {
        saveChunkData: (start: number, chunkFile: string) => Promise<boolean>;
      }
    ).saveChunkData(0, "/tmp/chunk-0.json");

    expect(shouldContinue).toBe(false);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("should save chunk data and continue when fetch is successful", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({
            json: async () => await Promise.resolve({ data: [{ id: 1 }] }),
            ok: true,
          }),
      ),
    );

    const shouldContinue = await (
      command as unknown as {
        saveChunkData: (start: number, chunkFile: string) => Promise<boolean>;
      }
    ).saveChunkData(1000, "/tmp/chunk-1000.json");

    expect(shouldContinue).toBe(true);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });

  it("should warn and continue when save chunk response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({
            ok: false,
            statusText: "Too Many Requests",
          }),
      ),
    );

    const shouldContinue = await (
      command as unknown as {
        saveChunkData: (start: number, chunkFile: string) => Promise<boolean>;
      }
    ).saveChunkData(2000, "/tmp/chunk-2000.json");

    expect(shouldContinue).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith("🌐 Failed fetching records");
  });

  it("should warn and continue when chunk payload parsing fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({
            json: async () => await Promise.resolve({ records: [{ id: 1 }] }),
            ok: true,
          }),
      ),
    );

    const shouldContinue = await (
      command as unknown as {
        saveChunkData: (start: number, chunkFile: string) => Promise<boolean>;
      }
    ).saveChunkData(3000, "/tmp/chunk-3000.json");

    expect(shouldContinue).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(
      "🌐 Received an unexpected EDCS payload shape",
    );
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("should skip chunk download when chunk file already exists", async () => {
    accessMock.mockResolvedValueOnce(undefined);

    const result = await (
      command as unknown as {
        downloadChunkIfMissing: (start: number) => Promise<boolean>;
      }
    ).downloadChunkIfMissing(0);

    expect(result).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      "⏭️ Skipping chunk that already exists",
      undefined,
      expect.any(Object),
    );
  });

  it("should download missing chunk through chunk-data workflow", async () => {
    accessMock.mockRejectedValueOnce(new Error("missing"));

    vi.spyOn(
      command as unknown as {
        downloadChunkData: (
          start: number,
          chunkFile: string,
        ) => Promise<boolean>;
      },
      "downloadChunkData",
    ).mockResolvedValueOnce(false);

    const result = await (
      command as unknown as {
        downloadChunkIfMissing: (start: number) => Promise<boolean>;
      }
    ).downloadChunkIfMissing(1000);

    expect(result).toBe(false);
  });

  it("should handle chunk download errors and append error log", async () => {
    vi.spyOn(
      command as unknown as {
        saveChunkData: (start: number, chunkFile: string) => Promise<boolean>;
      },
      "saveChunkData",
    ).mockRejectedValueOnce(new Error("network"));

    const result = await (
      command as unknown as {
        downloadChunkData: (
          start: number,
          chunkFile: string,
        ) => Promise<boolean>;
      }
    ).downloadChunkData(0, "/tmp/chunk-0.json");

    expect(result).toBe(true);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(appendFileMock).toHaveBeenCalledTimes(1);
  });

  it("should stringify non-Error failures when chunk download throws", async () => {
    vi.spyOn(
      command as unknown as {
        saveChunkData: (start: number, chunkFile: string) => Promise<boolean>;
      },
      "saveChunkData",
    ).mockRejectedValueOnce("network-failure");

    const result = await (
      command as unknown as {
        downloadChunkData: (
          start: number,
          chunkFile: string,
        ) => Promise<boolean>;
      }
    ).downloadChunkData(0, "/tmp/chunk-0.json");

    expect(result).toBe(true);
    expect(logger.error).toHaveBeenCalledWith(
      "🌐 Failed fetching chunk",
      expect.any(String),
      expect.any(Object),
    );
    expect(appendFileMock).toHaveBeenCalledTimes(1);
  });

  it("should run and stop when a chunk signals no further data", async () => {
    const downloadSpy = vi
      .spyOn(
        command as unknown as {
          downloadChunkIfMissing: (start: number) => Promise<boolean>;
        },
        "downloadChunkIfMissing",
      )
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await command.run();

    expect(mkdirMock).toHaveBeenCalledTimes(1);
    expect(downloadSpy).toHaveBeenCalledTimes(2);
    expect(downloadSpy).toHaveBeenNthCalledWith(1, 0);
    expect(downloadSpy).toHaveBeenNthCalledWith(2, 1000);
    expect(logger.info).toHaveBeenCalledWith("📥 Downloaded chunks");
  });
});
