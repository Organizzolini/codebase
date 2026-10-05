import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import {
  createCommandTestHarness,
  resetCommandTestHarness,
} from "../../../testing/command-harness";

import { CorpusScriptorumEcclesiasticorumLatinorumCommand } from "./corpus-scriptorum-ecclesiasticorum-latinorum.command";

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

describe(CorpusScriptorumEcclesiasticorumLatinorumCommand, () => {
  let command: CorpusScriptorumEcclesiasticorumLatinorumCommand;
  let logger: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CorpusScriptorumEcclesiasticorumLatinorumCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(
      CorpusScriptorumEcclesiasticorumLatinorumCommand,
    );
    logger = module.get(LoggerService);
  });

  beforeEach(() => {
    resetCommandTestHarness();

    accessMock.mockClear();
    appendFileMock.mockClear();
    existsSyncMock.mockClear();
    mkdirMock.mockClear();
    mkdirSyncMock.mockClear();
    writeFileMock.mockClear();
    logger.log.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
    logger.createTimestampedOutputLogFilePath.mockReturnValue(
      "/tmp/csel-errors.log",
    );
    logger.buildErrorLogEntry.mockImplementation((context, error) => {
      const errorMessage =
        error instanceof Error ? error.stack || error.message : String(error);
      return {
        errorMessage,
        logLine: `[${new Date().toISOString()}] ${context}: ${errorMessage}\n`,
      };
    });

    existsSyncMock.mockReturnValue(true);
    mkdirMock.mockResolvedValue(undefined);
    appendFileMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    (command as unknown as { errorLogFilePath: string }).errorLogFilePath =
      "/tmp/csel-errors.log";
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        CorpusScriptorumEcclesiasticorumLatinorumCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith(
      "CorpusScriptorumEcclesiasticorumLatinorumCommand",
    );
  });

  it("should create output directory when it does not exist", async () => {
    const bootstrapLogger = createMock<LoggerService>();
    bootstrapLogger.createTimestampedOutputLogFilePath.mockReturnValue(
      "/tmp/csel-errors.log",
    );

    const commandHarness = await createCommandTestHarness({
      additionalProviders: [
        {
          provide: LoggerService,
          useValue: bootstrapLogger,
        },
      ],
      commandType: CorpusScriptorumEcclesiasticorumLatinorumCommand,
    });

    await commandHarness.testingModule.resolve(
      CorpusScriptorumEcclesiasticorumLatinorumCommand,
    );

    expect(
      bootstrapLogger.createTimestampedOutputLogFilePath,
    ).toHaveBeenCalledWith("csel");
  });

  it("should fetch tree and return null on response failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({
            ok: false,
            statusText: "Bad Request",
          }),
      ),
    );

    const result = await (
      command as unknown as {
        fetchTree: (
          treeUrl: string,
        ) => Promise<null | { path: string; type: string }[]>;
      }
    ).fetchTree("https://example.com/tree");

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      "🌳 Failed fetching the CSEL tree",
    );
  });

  it("should fetch tree and return nodes on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({
            json: async () =>
              await Promise.resolve({
                tree: [
                  { path: "data/foo.xml", type: "blob" },
                  { path: "README.md", type: "blob" },
                ],
              }),
            ok: true,
          }),
      ),
    );

    const result = await (
      command as unknown as {
        fetchTree: (
          treeUrl: string,
        ) => Promise<null | { path: string; type: string }[]>;
      }
    ).fetchTree("https://example.com/tree");

    expect(result).toStrictEqual([
      { path: "data/foo.xml", type: "blob" },
      { path: "README.md", type: "blob" },
    ]);
  });

  it("should return null when tree payload parsing fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({
            json: async () => await Promise.resolve({ tree: [{ path: 1 }] }),
            ok: true,
          }),
      ),
    );

    const result = await (
      command as unknown as {
        fetchTree: (
          treeUrl: string,
        ) => Promise<null | { path: string; type: string }[]>;
      }
    ).fetchTree("https://example.com/tree");

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      "🌳 Failed parsing the CSEL tree response",
    );
  });

  it("should fetch and write xml file on successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({
            ok: true,
            text: async () => await Promise.resolve("<xml>ok</xml>"),
          }),
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

    expect(writeFileMock).toHaveBeenCalledWith(
      "/tmp/file.xml",
      "<xml>ok</xml>",
      "utf8",
    );
  });

  it("should warn and skip write on failed xml response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () =>
          await Promise.resolve({
            ok: false,
            statusText: "Not Found",
          }),
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

  it("should skip download when xml file already exists", async () => {
    accessMock.mockResolvedValueOnce(undefined);

    await (
      command as unknown as {
        downloadSourceXmlFileIfMissing: (xmlPath: string) => Promise<void>;
      }
    ).downloadSourceXmlFileIfMissing("data/author/work.xml");

    expect(logger.info).toHaveBeenCalledWith(
      "⏭️ Skipping already downloaded",
      undefined,
      { xmlPath: "data/author/work.xml" },
    );
  });

  it("should download missing xml file and log errors on failure", async () => {
    accessMock.mockRejectedValueOnce(new Error("missing"));

    const fetchAndWriteXmlFileSpy = vi
      .spyOn(
        command as unknown as {
          fetchAndWriteXmlFile: (
            fileUrl: string,
            targetPath: string,
          ) => Promise<void>;
        },
        "fetchAndWriteXmlFile",
      )
      .mockRejectedValueOnce(new Error("network"));

    await (
      command as unknown as {
        downloadSourceXmlFileIfMissing: (xmlPath: string) => Promise<void>;
      }
    ).downloadSourceXmlFileIfMissing("data/author/work.xml");

    expect(mkdirMock).toHaveBeenCalledTimes(1);
    expect(fetchAndWriteXmlFileSpy).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(appendFileMock).toHaveBeenCalledTimes(1);
  });

  it("should stringify non-Error failures when download throws", async () => {
    accessMock.mockRejectedValueOnce(new Error("missing"));

    vi.spyOn(
      command as unknown as {
        fetchAndWriteXmlFile: (
          fileUrl: string,
          targetPath: string,
        ) => Promise<void>;
      },
      "fetchAndWriteXmlFile",
    ).mockRejectedValueOnce("network-failure");

    await (
      command as unknown as {
        downloadSourceXmlFileIfMissing: (xmlPath: string) => Promise<void>;
      }
    ).downloadSourceXmlFileIfMissing("data/author/work.xml");

    expect(logger.error).toHaveBeenCalledWith(
      "📥 Failed downloading",
      expect.any(String),
      { xmlPath: "data/author/work.xml" },
    );
    expect(appendFileMock).toHaveBeenCalledTimes(1);
  });

  it("should run and download only eligible xml tree entries", async () => {
    vi.spyOn(
      command as unknown as {
        fetchTree: (
          treeUrl: string,
        ) => Promise<null | { path: string; type: string }[]>;
      },
      "fetchTree",
    ).mockResolvedValueOnce([
      { path: "data/author/work.xml", type: "blob" },
      { path: "data/author/__cts__.xml", type: "blob" },
      { path: "docs/readme.txt", type: "blob" },
      { path: "data/author/subfolder", type: "tree" },
    ]);

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
    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(downloadSpy).toHaveBeenCalledWith("data/author/work.xml");
    expect(logger.info).toHaveBeenCalledWith("📥 Downloaded CSEL source files");
  });

  it("should return early when tree fetch fails in run", async () => {
    vi.spyOn(
      command as unknown as {
        fetchTree: (
          treeUrl: string,
        ) => Promise<null | { path: string; type: string }[]>;
      },
      "fetchTree",
    ).mockResolvedValueOnce(null);

    const downloadSpy = vi.spyOn(
      command as unknown as {
        downloadSourceXmlFileIfMissing: (xmlPath: string) => Promise<void>;
      },
      "downloadSourceXmlFileIfMissing",
    );

    await command.run();

    expect(downloadSpy).not.toHaveBeenCalled();
  });
});
