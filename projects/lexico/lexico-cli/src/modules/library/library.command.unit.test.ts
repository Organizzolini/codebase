import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import {
  resetCommandTestHarness,
  runCommandLine,
} from "../../../testing/command-harness";
import {
  mockStandardInputTerminal,
  setPromptsMockResponse,
} from "../../../testing/mocks";

import { LibraryCommand } from "./library.command";
import { LIBRARY_PROVIDERS_TOKEN } from "./library.constants";

import type { LibrarySourceProvider } from "./library.types";
import type { Author } from "@codebase/lexico-entities";

const { appendFileMock, mkdirMock, readdirMock } = vi.hoisted(() => ({
  appendFileMock: vi.fn<() => Promise<void>>(),
  mkdirMock: vi.fn<() => Promise<string | undefined>>(),
  readdirMock: vi.fn<() => Promise<unknown[]>>(),
}));

const { promptsMock } = vi.hoisted(() => ({
  promptsMock: vi.fn<() => Promise<Record<string, unknown>>>(),
}));

vi.mock("node:fs/promises", () => ({
  appendFile: appendFileMock,
  mkdir: mkdirMock,
  readdir: readdirMock,
}));

vi.mock("prompts", () => ({
  default: promptsMock,
}));

function createProviders(): LibrarySourceProvider[] {
  return [
    {
      ingest: vi.fn<
        (options?: { author?: string; text?: string }) => Promise<Author[]>
      >(async () => await Promise.resolve([])),
      name: "perseus",
    },
    {
      ingest: vi.fn<
        (options?: { author?: string; text?: string }) => Promise<Author[]>
      >(async () => await Promise.resolve([])),
      name: "thelatinlibrary",
    },
  ];
}

describe(LibraryCommand, () => {
  let command: LibraryCommand;
  let logger: DeepMocked<LoggerService>;
  let providerPerseus: LibrarySourceProvider;
  let providers: LibrarySourceProvider[];

  beforeAll(async () => {
    providers = createProviders();
    const perseusProvider = providers.find(
      (provider) => provider.name === "perseus",
    );
    if (!perseusProvider) {
      throw new Error("Expected perseus provider");
    }

    providerPerseus = perseusProvider;

    const module = await Test.createTestingModule({
      providers: [
        LibraryCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: LIBRARY_PROVIDERS_TOKEN,
          useValue: providers,
        },
      ],
    }).compile();

    command = await module.resolve(LibraryCommand);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    resetCommandTestHarness({ unstubGlobals: false });
    mkdirMock.mockResolvedValue(undefined);
    appendFileMock.mockResolvedValue(undefined);
    setPromptsMockResponse(promptsMock, { provider: "ALL" });

    logger.buildErrorLogEntry.mockImplementation((context, error) => {
      const errorMessage =
        error instanceof Error ? error.stack || error.message : String(error);
      return {
        errorMessage,
        logLine: `[${new Date().toISOString()}] ${context}: ${errorMessage}\n`,
      };
    });
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        LibraryCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: LIBRARY_PROVIDERS_TOKEN,
          useValue: [],
        },
      ],
    }).compile();

    await module.resolve(LibraryCommand);
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("LibraryCommand");
  });

  it("should build ingest parameters with filtering", () => {
    const result = (
      command as unknown as {
        buildIngestParameters: (
          author: string | undefined,
          providerName: string | undefined,
          text: string | undefined,
        ) => {
          filteredProviders: LibrarySourceProvider[];
          ingestOptions: { author?: string; text?: string };
        };
      }
    ).buildIngestParameters("vergil", "perseus", "vergil/aeneid");

    expect(result.filteredProviders).toHaveLength(1);
    expect(result.filteredProviders[0]?.name).toBe("perseus");
    expect(result.ingestOptions).toStrictEqual({
      author: "vergil",
      text: "vergil/aeneid",
    });
  });

  it("should build ingest parameters without optional filters", () => {
    const result = (
      command as unknown as {
        buildIngestParameters: (
          author: string | undefined,
          providerName: string | undefined,
          text: string | undefined,
        ) => {
          filteredProviders: LibrarySourceProvider[];
          ingestOptions: { author?: string; text?: string };
        };
      }
    ).buildIngestParameters(undefined, undefined, undefined);

    expect(result.filteredProviders).toHaveLength(2);
    expect(result.ingestOptions).toStrictEqual({});
  });

  it("should build provider choices sorted by provider name", () => {
    const choices = (
      command as unknown as {
        getProviderChoices: () => { title: string; value: string }[];
      }
    ).getProviderChoices();

    expect(choices).toStrictEqual([
      { title: "perseus", value: "perseus" },
      { title: "thelatinlibrary", value: "thelatinlibrary" },
    ]);
  });

  it("should derive unique sorted author choices with provider filter", async () => {
    vi.spyOn(
      command as unknown as {
        scanLibrary: () => Promise<
          {
            authorSlug: string;
            fullPath: string;
            pathParts: string[];
            provider: string;
            textSlug: string;
            title: string;
          }[]
        >;
      },
      "scanLibrary",
    ).mockResolvedValue([
      {
        authorSlug: "vergil",
        fullPath: "a",
        pathParts: [],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "cicero",
        fullPath: "b",
        pathParts: [],
        provider: "perseus",
        textSlug: "de-oratore",
        title: "De Oratore",
      },
      {
        authorSlug: "vergil",
        fullPath: "c",
        pathParts: [],
        provider: "thelatinlibrary",
        textSlug: "eclogues",
        title: "Eclogues",
      },
    ]);

    const choices = await (
      command as unknown as {
        getAuthorChoices: (
          provider?: string,
        ) => Promise<{ title: string; value: string }[]>;
      }
    ).getAuthorChoices("perseus");

    expect(choices).toStrictEqual([
      { title: "cicero", value: "cicero" },
      { title: "vergil", value: "vergil" },
    ]);
  });

  it("should derive unique sorted author choices without provider filter", async () => {
    vi.spyOn(
      command as unknown as {
        scanLibrary: () => Promise<
          {
            authorSlug: string;
            fullPath: string;
            pathParts: string[];
            provider: string;
            textSlug: string;
            title: string;
          }[]
        >;
      },
      "scanLibrary",
    ).mockResolvedValue([
      {
        authorSlug: "vergil",
        fullPath: "a",
        pathParts: [],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "vergil",
        fullPath: "b",
        pathParts: [],
        provider: "thelatinlibrary",
        textSlug: "eclogues",
        title: "Eclogues",
      },
      {
        authorSlug: "cicero",
        fullPath: "c",
        pathParts: [],
        provider: "perseus",
        textSlug: "de-oratore",
        title: "De Oratore",
      },
    ]);

    const choices = await (
      command as unknown as {
        getAuthorChoices: (
          provider?: string,
        ) => Promise<{ title: string; value: string }[]>;
      }
    ).getAuthorChoices();

    expect(choices).toStrictEqual([
      { title: "cicero", value: "cicero" },
      { title: "vergil", value: "vergil" },
    ]);
  });

  it("should derive text choices filtered by provider and author", async () => {
    vi.spyOn(
      command as unknown as {
        scanLibrary: () => Promise<
          {
            authorSlug: string;
            fullPath: string;
            pathParts: string[];
            provider: string;
            textSlug: string;
            title: string;
          }[]
        >;
      },
      "scanLibrary",
    ).mockResolvedValue([
      {
        authorSlug: "vergil",
        fullPath: "a",
        pathParts: ["epic"],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "vergil",
        fullPath: "b",
        pathParts: ["minor"],
        provider: "perseus",
        textSlug: "culex",
        title: "Culex",
      },
      {
        authorSlug: "cicero",
        fullPath: "c",
        pathParts: ["oratory"],
        provider: "perseus",
        textSlug: "de-oratore",
        title: "De Oratore",
      },
    ]);

    const choices = await (
      command as unknown as {
        getTextChoices: (
          provider?: string,
          authorSlug?: string,
        ) => Promise<{ title: string; value: string }[]>;
      }
    ).getTextChoices("perseus", "vergil");

    expect(choices).toStrictEqual([
      { title: "vergil/epic/aeneid", value: "vergil/epic/aeneid" },
      { title: "vergil/minor/culex", value: "vergil/minor/culex" },
    ]);
  });

  it("should derive text choices without provider or author filters", async () => {
    vi.spyOn(
      command as unknown as {
        scanLibrary: () => Promise<
          {
            authorSlug: string;
            fullPath: string;
            pathParts: string[];
            provider: string;
            textSlug: string;
            title: string;
          }[]
        >;
      },
      "scanLibrary",
    ).mockResolvedValue([
      {
        authorSlug: "vergil",
        fullPath: "a",
        pathParts: ["epic"],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "cicero",
        fullPath: "b",
        pathParts: ["oratory"],
        provider: "thelatinlibrary",
        textSlug: "de-oratore",
        title: "De Oratore",
      },
    ]);

    const choices = await (
      command as unknown as {
        getTextChoices: (
          provider?: string,
          authorSlug?: string,
        ) => Promise<{ title: string; value: string }[]>;
      }
    ).getTextChoices();

    expect(choices).toStrictEqual([
      {
        title: "cicero/oratory/de-oratore",
        value: "cicero/oratory/de-oratore",
      },
      { title: "vergil/epic/aeneid", value: "vergil/epic/aeneid" },
    ]);
  });

  it("should process provider and log completion on success", async () => {
    await (
      command as unknown as {
        processProvider: (args: {
          current: number;
          ingestOptions: { author?: string; text?: string };
          provider: LibrarySourceProvider;
          total: number;
        }) => Promise<void>;
      }
    ).processProvider({
      current: 1,
      ingestOptions: { author: "vergil" },
      provider: providerPerseus,
      total: 2,
    });

    expect(providerPerseus.ingest).toHaveBeenCalledWith({ author: "vergil" });
    expect(logger.info).toHaveBeenCalledWith(
      "🏛️ Completed ingestion for provider",
      undefined,
      { current: 1, percent: 50, providerName: "perseus", total: 2 },
    );
  });

  it("should process provider and append log on failure", async () => {
    const failingProvider = {
      ingest: vi
        .fn<
          (options?: { author?: string; text?: string }) => Promise<Author[]>
        >()
        .mockImplementation(async () => {
          await Promise.resolve();
          throw new Error("provider failed");
        }),
      name: "failing-provider",
    } satisfies LibrarySourceProvider;

    await (
      command as unknown as {
        processProvider: (args: {
          current: number;
          ingestOptions: { author?: string; text?: string };
          provider: LibrarySourceProvider;
          total: number;
        }) => Promise<void>;
      }
    ).processProvider({
      current: 1,
      ingestOptions: {},
      provider: failingProvider,
      total: 1,
    });

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(appendFileMock).toHaveBeenCalledTimes(1);
  });

  it("should use provider error message when stack is empty", async () => {
    const failingProvider = {
      ingest: vi
        .fn<
          (options?: { author?: string; text?: string }) => Promise<Author[]>
        >()
        .mockImplementation(async () => {
          await Promise.resolve();
          const providerError = new Error("provider message fallback");
          providerError.stack = "";
          throw providerError;
        }),
      name: "message-provider",
    } satisfies LibrarySourceProvider;

    await (
      command as unknown as {
        processProvider: (args: {
          current: number;
          ingestOptions: { author?: string; text?: string };
          provider: LibrarySourceProvider;
          total: number;
        }) => Promise<void>;
      }
    ).processProvider({
      current: 1,
      ingestOptions: {},
      provider: failingProvider,
      total: 1,
    });

    expect(appendFileMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("provider message fallback"),
    );
  });

  it("should process provider failures and append error logs", async () => {
    const failingProvider = {
      ingest: vi
        .fn<
          (options?: { author?: string; text?: string }) => Promise<Author[]>
        >()
        .mockRejectedValue("provider failed"),
      name: "string-provider",
    } satisfies LibrarySourceProvider;

    await (
      command as unknown as {
        processProvider: (args: {
          current: number;
          ingestOptions: { author?: string; text?: string };
          provider: LibrarySourceProvider;
          total: number;
        }) => Promise<void>;
      }
    ).processProvider({
      current: 1,
      ingestOptions: {},
      provider: failingProvider,
      total: 1,
    });

    expect(logger.error).toHaveBeenCalledWith(
      "🔌 Failed running provider",
      undefined,
      { providerName: "string-provider" },
    );
    expect(appendFileMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("provider failed"),
    );
  });

  it("should push text entries with derived slug and title", () => {
    const texts: {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[] = [];

    (
      command as unknown as {
        pushTextEntry: (args: {
          authorSlug: string;
          currentPathParts: string[];
          directory: string;
          entry: {
            isDirectory: () => boolean;
            isFile: () => boolean;
            name: string;
          };
          providerName: string;
          texts: {
            fullPath: string;
            pathParts: string[];
            provider: string;
            textSlug: string;
            title: string;
          }[];
        }) => void;
      }
    ).pushTextEntry({
      authorSlug: "vergil",
      currentPathParts: ["epic"],
      directory: "/tmp/perseus/vergil/epic",
      entry: {
        isDirectory: () => false,
        isFile: () => true,
        name: "aeneid-book-1.md",
      },
      providerName: "perseus",
      texts,
    });

    expect(texts).toStrictEqual([
      expect.objectContaining({
        authorSlug: "vergil",
        pathParts: ["epic"],
        provider: "perseus",
        textSlug: "aeneid-book-1",
        title: "Aeneid Book 1",
      }),
    ]);
  });

  it("should run with parsed options and process filtered providers", async () => {
    vi.spyOn(
      command as unknown as {
        parseIngestOptions: (options: {
          author?: null | string;
          provider?: null | string;
          text?: null | string;
        }) => Promise<{
          author: string | undefined;
          providerName: string | undefined;
          text: string | undefined;
        }>;
      },
      "parseIngestOptions",
    ).mockResolvedValue({
      author: "vergil",
      providerName: "perseus",
      text: undefined,
    });

    const processProviderSpy = vi
      .spyOn(
        command as unknown as {
          processProvider: (args: {
            current: number;
            ingestOptions: { author?: string; text?: string };
            provider: LibrarySourceProvider;
            total: number;
          }) => Promise<void>;
        },
        "processProvider",
      )
      .mockResolvedValue(undefined);

    await command.run([], {});

    expect(mkdirMock).toHaveBeenCalledTimes(1);
    expect(processProviderSpy).toHaveBeenCalledTimes(1);
    expect(processProviderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        current: 1,
        total: 1,
      }),
    );
  });

  it("should skip undefined provider entries in run iteration", async () => {
    vi.spyOn(
      command as unknown as {
        parseIngestOptions: (options: {
          author?: null | string;
          provider?: null | string;
          text?: null | string;
        }) => Promise<{
          author: string | undefined;
          providerName: string | undefined;
          text: string | undefined;
        }>;
      },
      "parseIngestOptions",
    ).mockResolvedValue({
      author: undefined,
      providerName: undefined,
      text: undefined,
    });

    vi.spyOn(
      command as unknown as {
        buildIngestParameters: (
          author: string | undefined,
          providerName: string | undefined,
          text: string | undefined,
        ) => {
          filteredProviders: (LibrarySourceProvider | undefined)[];
          ingestOptions: { author?: string; text?: string };
        };
      },
      "buildIngestParameters",
    ).mockReturnValue({
      filteredProviders: [providerPerseus, undefined],
      ingestOptions: {},
    });

    const processProviderSpy = vi
      .spyOn(
        command as unknown as {
          processProvider: (args: {
            current: number;
            ingestOptions: { author?: string; text?: string };
            provider: LibrarySourceProvider;
            total: number;
          }) => Promise<void>;
        },
        "processProvider",
      )
      .mockResolvedValue(undefined);

    await command.run([], {});

    expect(processProviderSpy).toHaveBeenCalledTimes(1);
    expect(processProviderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        current: 1,
        provider: providerPerseus,
        total: 2,
      }),
    );
  });

  it("should scan library recursively and collect markdown files", async () => {
    const createDirent = (args: {
      isDirectory: boolean;
      name: string;
    }): {
      isDirectory: () => boolean;
      isFile: () => boolean;
      name: string;
    } => ({
      isDirectory: () => args.isDirectory,
      isFile: () => !args.isDirectory,
      name: args.name,
    });

    readdirMock
      .mockResolvedValueOnce([
        createDirent({ isDirectory: true, name: "perseus" }),
      ] as unknown[])
      .mockResolvedValueOnce([
        createDirent({ isDirectory: true, name: "vergil" }),
      ] as unknown[])
      .mockResolvedValueOnce([
        createDirent({ isDirectory: true, name: "epic" }),
        createDirent({ isDirectory: false, name: "ignored.txt" }),
      ] as unknown[])
      .mockResolvedValueOnce([
        createDirent({ isDirectory: false, name: "aeneid.md" }),
        createDirent({ isDirectory: false, name: "notes.txt" }),
      ] as unknown[]);

    const result = await (
      command as unknown as {
        scanLibrary: () => Promise<
          {
            authorSlug: string;
            fullPath: string;
            pathParts: string[];
            provider: string;
            textSlug: string;
            title: string;
          }[]
        >;
      }
    ).scanLibrary();

    expect(result).toHaveLength(1);
    expect(result[0]).toStrictEqual(
      expect.objectContaining({
        authorSlug: "vergil",
        pathParts: ["epic"],
        provider: "perseus",
        textSlug: "aeneid",
      }),
    );
  });

  it("should ignore non-directory providers when scanning library root", async () => {
    const createDirent = (args: {
      isDirectory: boolean;
      name: string;
    }): {
      isDirectory: () => boolean;
      isFile: () => boolean;
      name: string;
    } => ({
      isDirectory: () => args.isDirectory,
      isFile: () => !args.isDirectory,
      name: args.name,
    });

    readdirMock
      .mockResolvedValueOnce([
        createDirent({ isDirectory: false, name: "README.md" }),
      ] as unknown[])
      .mockResolvedValueOnce([] as unknown[]);

    const scanLibraryProviderSpy = vi
      .spyOn(
        command as unknown as {
          scanLibraryProvider: (
            dataDirectory: string,
            providerName: string,
            texts: unknown[],
          ) => Promise<void>;
        },
        "scanLibraryProvider",
      )
      .mockResolvedValue(undefined);

    await (
      command as unknown as {
        scanLibrary: () => Promise<unknown[]>;
      }
    ).scanLibrary();

    expect(scanLibraryProviderSpy).not.toHaveBeenCalled();
  });

  it("should silently return empty list when the library directory does not exist yet", async () => {
    const missingDirectoryError = Object.assign(new Error("missing"), {
      code: "ENOENT",
    });
    readdirMock.mockReset();
    readdirMock.mockRejectedValueOnce(missingDirectoryError);

    const result = await (
      command as unknown as {
        scanLibrary: () => Promise<unknown[]>;
      }
    ).scanLibrary();

    expect(result).toStrictEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("should warn when the root library directory cannot be read for another reason", async () => {
    readdirMock.mockReset();
    readdirMock.mockRejectedValueOnce(new Error("permission denied"));

    const result = await (
      command as unknown as {
        scanLibrary: () => Promise<unknown[]>;
      }
    ).scanLibrary();

    expect(result).toStrictEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      "⚠️ Failed reading the library directory",
      undefined,
      expect.objectContaining({ reason: "permission denied" }),
    );
  });

  it("should stringify non-Error rejections when the library directory cannot be read", async () => {
    readdirMock.mockReset();
    readdirMock.mockRejectedValueOnce("permission denied string");

    const result = await (
      command as unknown as {
        scanLibrary: () => Promise<unknown[]>;
      }
    ).scanLibrary();

    expect(result).toStrictEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      "⚠️ Failed reading the library directory",
      undefined,
      expect.objectContaining({ reason: "permission denied string" }),
    );
  });

  it("should skip non-directory authors when scanning provider directory", async () => {
    const createDirent = (args: {
      isDirectory: boolean;
      name: string;
    }): {
      isDirectory: () => boolean;
      isFile: () => boolean;
      name: string;
    } => ({
      isDirectory: () => args.isDirectory,
      isFile: () => !args.isDirectory,
      name: args.name,
    });

    readdirMock.mockReset();
    readdirMock.mockResolvedValueOnce([
      createDirent({ isDirectory: false, name: "README.md" }),
      createDirent({ isDirectory: true, name: "vergil" }),
    ] as unknown[]);

    const scanLibraryAuthorSpy = vi
      .spyOn(
        command as unknown as {
          scanLibraryAuthor: (args: {
            authorSlug: string;
            dataDirectory: string;
            providerName: string;
            texts: unknown[];
          }) => Promise<void>;
        },
        "scanLibraryAuthor",
      )
      .mockResolvedValue(undefined);

    await (
      command as unknown as {
        scanLibraryProvider: (
          dataDirectory: string,
          providerName: string,
          texts: unknown[],
        ) => Promise<void>;
      }
    ).scanLibraryProvider("/tmp/data", "perseus", []);

    expect(scanLibraryAuthorSpy).toHaveBeenCalledTimes(1);
    expect(scanLibraryAuthorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        authorSlug: "vergil",
        providerName: "perseus",
      }),
    );
  });

  it("creates output directory when missing", () => {
    const previousWorkingDirectory = process.cwd();
    const temporaryDirectory = mkdtempSync(
      path.join(os.tmpdir(), "library-command-"),
    );

    try {
      process.chdir(temporaryDirectory);

      const logger: DeepMocked<LoggerService> = createMock<LoggerService>();
      const command = new LibraryCommand(logger, []);

      expect(command).toBeDefined();
      expect(existsSync(path.join(temporaryDirectory, "output"))).toBe(true);
    } finally {
      process.chdir(previousWorkingDirectory);
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("initializes when output directory already exists", () => {
    const previousWorkingDirectory = process.cwd();
    const temporaryDirectory = mkdtempSync(
      path.join(os.tmpdir(), "library-command-"),
    );
    const outputDirectory = path.join(temporaryDirectory, "output");

    try {
      mkdirSync(outputDirectory, { recursive: true });
      process.chdir(temporaryDirectory);

      const logger: DeepMocked<LoggerService> = createMock<LoggerService>();
      const command = new LibraryCommand(logger, []);

      expect(command).toBeDefined();
      expect(existsSync(outputDirectory)).toBe(true);
    } finally {
      process.chdir(previousWorkingDirectory);
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  describe("command line", () => {
    const setStandardInputTerminal = mockStandardInputTerminal();

    beforeEach(() => {
      promptsMock.mockReset();
      readdirMock.mockResolvedValue([]);
      setStandardInputTerminal(false);
    });

    /** Runs `library` with `flags` exactly as the CLI would. */
    async function runLibrary(...flags: string[]): Promise<void> {
      await runCommandLine({
        argv: ["library", ...flags],
        providers: [
          LibraryCommand,
          { provide: LoggerService, useValue: createMock<LoggerService>() },
          { provide: LIBRARY_PROVIDERS_TOKEN, useValue: providers },
        ],
      });
    }

    /** The ingest options each provider was run with, keyed by provider name. */
    function ingestCalls(): Record<string, unknown[]> {
      return Object.fromEntries(
        providers.map((provider) => [
          provider.name,
          vi.mocked(provider.ingest).mock.calls.map(([options]) => options),
        ]),
      );
    }

    it("runs only --provider with the given --author and --text without prompting", async () => {
      await runLibrary(
        "--provider=perseus",
        "--author=not-downloaded-yet",
        "--text=not-downloaded-yet/text",
      );

      expect(ingestCalls()).toStrictEqual({
        perseus: [
          { author: "not-downloaded-yet", text: "not-downloaded-yet/text" },
        ],
        thelatinlibrary: [],
      });
      expect(promptsMock).not.toHaveBeenCalled();
    });

    it("rejects an unknown --provider before running any provider", async () => {
      await expect(runLibrary("--provider=invalid")).rejects.toThrow(
        'Provider "invalid" not found.',
      );

      expect(ingestCalls()).toStrictEqual({ perseus: [], thelatinlibrary: [] });
    });

    it("runs every provider without prompting when standard input is not a terminal", async () => {
      await runLibrary();

      expect(ingestCalls()).toStrictEqual({
        perseus: [{}],
        thelatinlibrary: [{}],
      });
      expect(promptsMock).not.toHaveBeenCalled();
    });

    it("prompts for the provider, author and text a terminal run leaves out", async () => {
      setStandardInputTerminal(true);
      promptsMock
        .mockResolvedValueOnce({ choice: "thelatinlibrary" })
        .mockResolvedValueOnce({ choice: "cicero" })
        .mockResolvedValueOnce({ choice: "cicero/de-oratore" });

      await runLibrary();

      expect(promptsMock).toHaveBeenCalledTimes(3);
      expect(ingestCalls()).toStrictEqual({
        perseus: [],
        thelatinlibrary: [{ author: "cicero", text: "cicero/de-oratore" }],
      });
    });

    it("fails instead of running providers when a prompt is cancelled", async () => {
      setStandardInputTerminal(true);
      promptsMock.mockResolvedValueOnce({});

      await expect(runLibrary()).rejects.toThrow(
        "Prompt cancelled: Select the provider",
      );

      expect(ingestCalls()).toStrictEqual({ perseus: [], thelatinlibrary: [] });
    });
  });
});
