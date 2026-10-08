import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { resetCommandTestHarness } from "../../../testing/command-harness";

import { PerseusCommand } from "./perseus.command";

const { accessMock, appendFileMock, mkdirMock, writeFileMock } = vi.hoisted(
  () => ({
    accessMock: vi.fn<(...parameters: unknown[]) => unknown>(),
    appendFileMock: vi.fn<(...parameters: unknown[]) => unknown>(),
    mkdirMock: vi.fn<(...parameters: unknown[]) => unknown>(),
    writeFileMock: vi.fn<(...parameters: unknown[]) => unknown>(),
  }),
);

vi.mock("node:fs/promises", () => ({
  access: accessMock,
  appendFile: appendFileMock,
  mkdir: mkdirMock,
  writeFile: writeFileMock,
}));

interface FetchJsonResponse {
  tree: { path: string; type: string }[];
}

describe(PerseusCommand, () => {
  let command: PerseusCommand;
  let logger: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PerseusCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(PerseusCommand);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    resetCommandTestHarness({ useRealTimers: true });
    accessMock.mockResolvedValue(undefined);
    appendFileMock.mockResolvedValue(undefined);
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);

    logger.buildErrorLogEntry.mockImplementation((context, error) => {
      const errorMessage =
        error instanceof Error ? error.stack || error.message : String(error);
      return {
        errorMessage,
        logLine: `[${new Date().toISOString()}] ${context}: ${errorMessage}\n`,
      };
    });
    (command as unknown as { errorLogFilePath: string }).errorLogFilePath =
      "/tmp/perseus-errors.log";
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        PerseusCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    await module.resolve(PerseusCommand);
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("PerseusCommand");
  });

  it("should return null and log error when tree fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({ ok: false, statusText: "Not Found" }),
      ),
    );

    const result = await (
      command as unknown as {
        fetchSourceXmlPaths: () => Promise<null | string[]>;
      }
    ).fetchSourceXmlPaths();

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      "🌳 Failed fetching the Perseus tree",
    );
  });

  it("should filter and return only latin xml blob paths", async () => {
    const jsonResponse: FetchJsonResponse = {
      tree: [
        { path: "a/file-lat.xml", type: "blob" },
        { path: "a/file-greek.xml", type: "blob" },
        { path: "a/file-lat.txt", type: "blob" },
        { path: "a/dir", type: "tree" },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({
            json: async () => await Promise.resolve(jsonResponse),
            ok: true,
          }),
      ),
    );

    const result = await (
      command as unknown as {
        fetchSourceXmlPaths: () => Promise<null | string[]>;
      }
    ).fetchSourceXmlPaths();

    expect(result).toStrictEqual(["a/file-lat.xml"]);
  });

  it("should return null when tree payload parsing fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({
            json: async () =>
              await Promise.resolve({ tree: [{ path: 1, type: "blob" }] }),
            ok: true,
          }),
      ),
    );

    const result = await (
      command as unknown as {
        fetchSourceXmlPaths: () => Promise<null | string[]>;
      }
    ).fetchSourceXmlPaths();

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      "🌳 Failed parsing the Perseus tree response",
    );
  });

  it("should append error log details", async () => {
    await (
      command as unknown as {
        appendSourceDownloadErrorLog: (
          xmlPath: string,
          error: unknown,
        ) => Promise<void>;
      }
    ).appendSourceDownloadErrorLog("a/file-lat.xml", new Error("boom"));

    expect(logger.error).toHaveBeenCalledWith(
      "📥 Failed downloading",
      expect.any(String),
      { xmlPath: "a/file-lat.xml" },
    );
    expect(appendFileMock).toHaveBeenCalledTimes(1);
  });

  it("should skip existing xml files", async () => {
    accessMock.mockResolvedValue(undefined);

    await (
      command as unknown as {
        downloadSourceXmlFileIfMissing: (xmlPath: string) => Promise<void>;
      }
    ).downloadSourceXmlFileIfMissing("a/file-lat.xml");

    expect(logger.info).toHaveBeenCalledWith(
      "⏭️ Skipping already downloaded",
      undefined,
      { xmlPath: "a/file-lat.xml" },
    );
  });

  it("should call fetch writer for missing xml files", async () => {
    accessMock.mockRejectedValue(new Error("missing"));

    const fetchAndWriteSpy = vi
      .spyOn(
        command as unknown as {
          fetchAndWriteXmlFile: (
            fileUrl: string,
            targetPath: string,
          ) => Promise<void>;
        },
        "fetchAndWriteXmlFile",
      )
      .mockResolvedValue(undefined);

    await (
      command as unknown as {
        downloadSourceXmlFileIfMissing: (xmlPath: string) => Promise<void>;
      }
    ).downloadSourceXmlFileIfMissing("a/file-lat.xml");

    expect(mkdirMock).toHaveBeenCalledTimes(1);
    expect(fetchAndWriteSpy).toHaveBeenCalledTimes(1);
  });

  it("should append download error log when xml fetch/write fails", async () => {
    accessMock.mockRejectedValue(new Error("missing"));

    vi.spyOn(
      command as unknown as {
        fetchAndWriteXmlFile: (
          fileUrl: string,
          targetPath: string,
        ) => Promise<void>;
      },
      "fetchAndWriteXmlFile",
    ).mockRejectedValue(new Error("network failure"));

    const appendErrorSpy = vi
      .spyOn(
        command as unknown as {
          appendSourceDownloadErrorLog: (
            xmlPath: string,
            error: unknown,
          ) => Promise<void>;
        },
        "appendSourceDownloadErrorLog",
      )
      .mockResolvedValue(undefined);

    await (
      command as unknown as {
        downloadSourceXmlFileIfMissing: (xmlPath: string) => Promise<void>;
      }
    ).downloadSourceXmlFileIfMissing("a/file-lat.xml");

    expect(appendErrorSpy).toHaveBeenCalledWith(
      "a/file-lat.xml",
      expect.any(Error),
    );
  });

  it("should warn and return on non-ok xml fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({ ok: false, statusText: "Forbidden" }),
      ),
    );

    await (
      command as unknown as {
        fetchAndWriteXmlFile: (
          fileUrl: string,
          targetPath: string,
        ) => Promise<void>;
      }
    ).fetchAndWriteXmlFile("https://example.com/file.xml", "/tmp/file.xml");

    expect(logger.warn).toHaveBeenCalledWith("📥 Failed fetching", undefined, {
      fileUrl: "https://example.com/file.xml",
    });
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("should write xml content on successful fetch", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({
            ok: true,
            text: async () => await Promise.resolve("<xml/>"),
          }),
      ),
    );

    const writePromise = (
      command as unknown as {
        fetchAndWriteXmlFile: (
          fileUrl: string,
          targetPath: string,
        ) => Promise<void>;
      }
    ).fetchAndWriteXmlFile("https://example.com/file.xml", "/tmp/file.xml");

    await vi.advanceTimersByTimeAsync(101);
    await writePromise;

    expect(writeFileMock).toHaveBeenCalledWith(
      "/tmp/file.xml",
      "<xml/>",
      "utf8",
    );

    vi.useRealTimers();
  });

  it("should return early from run when xml paths are null", async () => {
    vi.spyOn(
      command as unknown as {
        fetchSourceXmlPaths: () => Promise<null | string[]>;
      },
      "fetchSourceXmlPaths",
    ).mockResolvedValue(null);

    const downloadSpy = vi.spyOn(
      command as unknown as {
        downloadSourceXmlFileIfMissing: (xmlPath: string) => Promise<void>;
      },
      "downloadSourceXmlFileIfMissing",
    );

    await command.run();

    expect(downloadSpy).not.toHaveBeenCalled();
  });

  it("should process every discovered xml path in run", async () => {
    vi.spyOn(
      command as unknown as {
        fetchSourceXmlPaths: () => Promise<null | string[]>;
      },
      "fetchSourceXmlPaths",
    ).mockResolvedValue(["a/file-lat.xml", "b/other-lat.xml"]);

    const downloadSpy = vi
      .spyOn(
        command as unknown as {
          downloadSourceXmlFileIfMissing: (xmlPath: string) => Promise<void>;
        },
        "downloadSourceXmlFileIfMissing",
      )
      .mockResolvedValue(undefined);

    await command.run();

    expect(mkdirMock).toHaveBeenCalledTimes(1);
    expect(downloadSpy).toHaveBeenCalledTimes(2);
    expect(downloadSpy).toHaveBeenNthCalledWith(1, "a/file-lat.xml");
    expect(downloadSpy).toHaveBeenNthCalledWith(2, "b/other-lat.xml");
  });

  it("creates output directory when constructor detects it is missing", () => {
    const previousWorkingDirectory = process.cwd();
    const temporaryDirectory = mkdtempSync(
      path.join(os.tmpdir(), "perseus-command-"),
    );

    try {
      process.chdir(temporaryDirectory);

      const logger: DeepMocked<LoggerService> = createMock<LoggerService>();
      logger.createTimestampedOutputLogFilePath.mockReturnValue(
        "/tmp/perseus-errors.log",
      );
      const newCommand = new PerseusCommand(logger);

      expect(newCommand).toBeDefined();
      expect(logger.createTimestampedOutputLogFilePath).toHaveBeenCalledWith(
        "perseus",
      );
    } finally {
      process.chdir(previousWorkingDirectory);
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("stringifies non-Error values in download error logging", async () => {
    await (
      command as unknown as {
        appendSourceDownloadErrorLog: (
          xmlPath: string,
          error: unknown,
        ) => Promise<void>;
      }
    ).appendSourceDownloadErrorLog("a/file-lat.xml", "text failure");

    expect(logger.error).toHaveBeenCalledWith(
      "📥 Failed downloading",
      expect.any(String),
      { xmlPath: "a/file-lat.xml" },
    );
    expect(appendFileMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("text failure"),
    );
  });
});
