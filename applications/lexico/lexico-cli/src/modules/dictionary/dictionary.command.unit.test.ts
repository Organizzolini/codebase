import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { Lexeme, Translation } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import {
  createCommandTestHarness,
  resetCommandTestHarness,
  runCommandLine,
} from "../../../testing/command-harness";
import {
  mockStandardInputTerminal,
  setPromptsMockResponse,
} from "../../../testing/mocks";
import { LexemesService } from "../lexemes/lexemes.service";
import { ManualService } from "../manual/manual.service";
import { TranslationsService } from "../translations/translations.service";

import { DictionaryCommand } from "./dictionary.command";

import type { WiktionaryPage } from "../lexico-ingestion/lexico-ingestion.types";
import type { DeepMocked } from "@golevelup/ts-vitest";

const { promptsMock } = vi.hoisted(() => ({
  promptsMock: vi.fn<() => Promise<Record<string, null | string>>>(),
}));

const {
  appendFileSyncMock,
  existsSyncMock,
  mkdirSyncMock,
  readdirSyncMock,
  readFileSyncMock,
} = vi.hoisted(() => ({
  appendFileSyncMock: vi.fn<(...parameters: unknown[]) => void>(),
  existsSyncMock: vi.fn<() => boolean>(),
  mkdirSyncMock: vi.fn<(...parameters: unknown[]) => void>(),
  readdirSyncMock: vi.fn<() => string[]>(),
  readFileSyncMock: vi.fn<(filePath?: unknown) => string>(),
}));

vi.mock("prompts", () => ({
  default: promptsMock,
}));

vi.mock("node:fs", () => ({
  default: {
    appendFileSync: appendFileSyncMock,
    existsSync: existsSyncMock,
    mkdirSync: mkdirSyncMock,
    readdirSync: readdirSyncMock,
    readFileSync: readFileSyncMock,
  },
}));

describe(DictionaryCommand, () => {
  let command: DictionaryCommand;

  const lexemesService = {
    existsByLemma: vi.fn<(lemma: string) => Promise<boolean>>(),
    findLexemesByLemmaWithTranslations:
      vi.fn<(lemma: string) => Promise<Lexeme[]>>(),
    parseLexemes: vi.fn<(page: WiktionaryPage) => Promise<Lexeme[]>>(),
    saveParsedLexeme: vi.fn<(lexeme: Lexeme) => Promise<Lexeme | null>>(),
  };

  const translationsService = {
    extractTranslationReferences: vi.fn<(data: unknown) => string[]>(),
    findTranslationsWithReferences: vi.fn<() => Promise<Translation[]>>(),
    saveTranslations: vi.fn<() => Promise<void>>(),
  };

  const manualService = {
    ingestManual: vi.fn<() => Promise<void>>(),
  };
  let logger: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DictionaryCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: LexemesService,
          useValue: lexemesService,
        },
        {
          provide: TranslationsService,
          useValue: translationsService,
        },
        {
          provide: ManualService,
          useValue: manualService,
        },
      ],
    }).compile();

    command = await module.resolve(DictionaryCommand);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    resetCommandTestHarness({ unstubGlobals: false });

    (
      command as unknown as {
        fileIndex: Map<string, string> | null;
      }
    ).fileIndex = null;

    existsSyncMock.mockReturnValue(true);
    readdirSyncMock.mockReturnValue([]);
    readFileSyncMock.mockReturnValue(
      JSON.stringify({
        category: "Latin",
        href: "/wiki/amo",
        html: "<html>amo</html>",
        word: "amo",
      }),
    );

    setPromptsMockResponse(promptsMock, { startLemma: null });

    lexemesService.existsByLemma.mockResolvedValue(true);
    lexemesService.findLexemesByLemmaWithTranslations.mockResolvedValue([]);
    lexemesService.parseLexemes.mockResolvedValue([]);
    lexemesService.saveParsedLexeme.mockResolvedValue(null);

    translationsService.extractTranslationReferences.mockReturnValue([]);
    translationsService.findTranslationsWithReferences.mockResolvedValue([]);
    translationsService.saveTranslations.mockResolvedValue(undefined);

    manualService.ingestManual.mockResolvedValue(undefined);

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
        DictionaryCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: LexemesService,
          useValue: createMock<LexemesService>(),
        },
        {
          provide: TranslationsService,
          useValue: createMock<TranslationsService>(),
        },
        {
          provide: ManualService,
          useValue: createMock<ManualService>(),
        },
      ],
    }).compile();

    await module.resolve(DictionaryCommand);
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("DictionaryCommand");
  });

  it("should create output directory when it does not exist", async () => {
    existsSyncMock.mockImplementation((inputPath?: unknown) => {
      if (typeof inputPath === "string" && inputPath.endsWith("/output")) {
        return false;
      }
      return true;
    });

    const commandHarness = await createCommandTestHarness({
      additionalProviders: [
        {
          provide: LexemesService,
          useValue: lexemesService,
        },
        {
          provide: TranslationsService,
          useValue: translationsService,
        },
        {
          provide: ManualService,
          useValue: manualService,
        },
      ],
      commandType: DictionaryCommand,
    });

    await commandHarness.testingModule.resolve(DictionaryCommand);

    expect(mkdirSyncMock).toHaveBeenCalledWith(
      expect.stringContaining("output"),
      { recursive: true },
    );
  });

  it("should return empty lemma choices when data directory does not exist", () => {
    existsSyncMock.mockImplementation((inputPath?: unknown) => {
      if (
        typeof inputPath === "string" &&
        inputPath.endsWith("data/wiktionary")
      ) {
        return false;
      }
      return true;
    });

    const choices = (
      command as unknown as {
        getLemmaChoices: () => { title: string; value: string }[];
      }
    ).getLemmaChoices();

    expect(choices).toStrictEqual([]);
  });

  it("should build lemma choices from json files only", () => {
    readdirSyncMock.mockReturnValue(["amo.json", "bellum.txt", "cano.json"]);

    const choices = (
      command as unknown as {
        getLemmaChoices: () => { title: string; value: string }[];
      }
    ).getLemmaChoices();

    expect(choices).toStrictEqual([
      { title: "amo", value: "amo" },
      { title: "cano", value: "cano" },
    ]);
  });

  it("should clamp lemma range when start or end lemma are missing", () => {
    const files = ["amo.json", "bellum.json", "cano.json"];

    const selected = (
      command as unknown as {
        getLemmaFileRange: (
          values: string[],
          startLemma?: string,
          endLemma?: string,
        ) => string[];
      }
    ).getLemmaFileRange(files, "missing", "missing");

    expect(selected).toStrictEqual(files);
  });

  it("should resolve lemma range when only start lemma is provided", () => {
    const files = ["amo.json", "bellum.json", "cano.json"];

    const selected = (
      command as unknown as {
        getLemmaFileRange: (
          values: string[],
          startLemma?: string,
          endLemma?: string,
        ) => string[];
      }
    ).getLemmaFileRange(files, "bellum");

    expect(selected).toStrictEqual(["bellum.json", "cano.json"]);
  });

  it("should resolve lemma range when only end lemma is provided", () => {
    const files = ["amo.json", "bellum.json", "cano.json"];

    const selected = (
      command as unknown as {
        getLemmaFileRange: (
          values: string[],
          startLemma?: string,
          endLemma?: string,
        ) => string[];
      }
    ).getLemmaFileRange(files, undefined, "bellum");

    expect(selected).toStrictEqual(["amo.json", "bellum.json"]);
  });

  it("should resolve wiktionary file path using case-insensitive fallback index", () => {
    existsSyncMock.mockImplementation((inputPath?: unknown) => {
      if (typeof inputPath !== "string") {
        return false;
      }

      if (inputPath.endsWith("_Amo.json")) {
        return false;
      }

      if (inputPath.endsWith("data/wiktionary")) {
        return true;
      }

      return true;
    });
    readdirSyncMock.mockReturnValue(["_amo.json", "notes.txt"]);

    const filePath = (
      command as unknown as {
        getWiktionaryFilePathForWord: (word: string) => null | string;
      }
    ).getWiktionaryFilePathForWord("Amo");

    expect(filePath).toStrictEqual(expect.stringContaining("_amo.json"));
  });

  it("should build the fallback index once, skipping non-json files", () => {
    existsSyncMock.mockImplementation(
      (inputPath?: unknown) =>
        typeof inputPath === "string" && !/\/_\w+\.json$/.test(inputPath),
    );
    readdirSyncMock.mockReturnValue(["notes.txt", "amo.json", "bellum.json"]);

    const getWiktionaryFilePathForWord = (
      command as unknown as {
        getWiktionaryFilePathForWord: (word: string) => null | string;
      }
    ).getWiktionaryFilePathForWord.bind(command);

    expect(getWiktionaryFilePathForWord("Amo")).toStrictEqual(
      expect.stringMatching(/\/amo\.json$/),
    );
    expect(getWiktionaryFilePathForWord("Bellum")).toStrictEqual(
      expect.stringMatching(/\/bellum\.json$/),
    );
    expect(getWiktionaryFilePathForWord("Notes")).toBeNull();
    expect(readdirSyncMock).toHaveBeenCalledTimes(1);
  });

  it("should return null wiktionary file path when index cannot be built", () => {
    existsSyncMock.mockImplementation((inputPath?: unknown) => {
      if (typeof inputPath !== "string") {
        return false;
      }

      if (inputPath.endsWith("data/wiktionary")) {
        return false;
      }

      return false;
    });

    const filePath = (
      command as unknown as {
        getWiktionaryFilePathForWord: (word: string) => null | string;
      }
    ).getWiktionaryFilePathForWord("Amo");

    expect(filePath).toBeNull();
  });

  it("should ingest all files in configured lemma range", async () => {
    readdirSyncMock.mockReturnValue([
      "amo.json",
      "bellum.json",
      "cano.json",
      "ignore.txt",
    ]);

    const processFileSpy = vi
      .spyOn(
        command as unknown as {
          processFile: (
            file: string,
            current: number,
            total: number,
          ) => Promise<void>;
        },
        "processFile",
      )
      .mockResolvedValue(undefined);

    await command.ingestAll("bellum", "cano");

    expect(processFileSpy).toHaveBeenCalledTimes(2);
    expect(processFileSpy).toHaveBeenNthCalledWith(1, "bellum.json", 1, 2);
    expect(processFileSpy).toHaveBeenNthCalledWith(2, "cano.json", 2, 2);
  });

  it("should warn when data directory is missing in ingestAll", async () => {
    existsSyncMock.mockReturnValue(false);

    await command.ingestAll();

    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("should process file and append error log on read failure", async () => {
    const readWiktionaryPageFromFileSpy = vi
      .spyOn(
        command as unknown as {
          readWiktionaryPageFromFile: (filePath: string) => null | {
            category: string;
            href: string;
            html: string;
            word: string;
          };
        },
        "readWiktionaryPageFromFile",
      )
      .mockReturnValueOnce(null);

    await (
      command as unknown as {
        processFile: (
          file: string,
          current: number,
          total: number,
        ) => Promise<void>;
      }
    ).processFile("amo.json", 1, 1);

    expect(readWiktionaryPageFromFileSpy).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(appendFileSyncMock).toHaveBeenCalledTimes(1);
  });

  it("should process file and ingest page on success", async () => {
    const ingestLexemeSpy = vi
      .spyOn(command, "ingestLexeme")
      .mockResolvedValue(undefined);

    await (
      command as unknown as {
        processFile: (
          file: string,
          current: number,
          total: number,
        ) => Promise<void>;
      }
    ).processFile("amo.json", 1, 2);

    expect(ingestLexemeSpy).toHaveBeenCalledWith(
      "amo",
      expect.objectContaining({ word: "amo" }),
      { current: 1, total: 2 },
    );
  });

  it("should resolve wiktionary file path by exact and indexed fallback", () => {
    existsSyncMock.mockImplementation((inputPath?: unknown) => {
      if (typeof inputPath === "string" && inputPath.endsWith("_amo.json")) {
        return false;
      }
      if (
        typeof inputPath === "string" &&
        inputPath.includes("data/wiktionary")
      ) {
        return true;
      }
      return false;
    });

    readdirSyncMock.mockReturnValueOnce(["_a_m_o.json"]);

    const filePath = (
      command as unknown as {
        getWiktionaryFilePathForWord: (word: string) => null | string;
      }
    ).getWiktionaryFilePathForWord("Amo");

    expect(filePath).toContain("_a_m_o.json");
  });

  it("should return null wiktionary file path when no index match exists", () => {
    existsSyncMock.mockImplementation((inputPath?: unknown) => {
      if (typeof inputPath === "string" && inputPath.endsWith("_amo.json")) {
        return false;
      }
      if (
        typeof inputPath === "string" &&
        inputPath.includes("data/wiktionary")
      ) {
        return true;
      }
      return false;
    });
    readdirSyncMock.mockReturnValueOnce(["_b_e_l_l_u_m.json"]);

    const filePath = (
      command as unknown as {
        getWiktionaryFilePathForWord: (word: string) => null | string;
      }
    ).getWiktionaryFilePathForWord("Amo");

    expect(filePath).toBeNull();
  });

  it("should use provided wiktionary page without loading from disk", () => {
    const loadSpy = vi.spyOn(
      command as unknown as {
        loadWiktionaryPageForWord: (word: string) => null | {
          category: string;
          href: string;
          html: string;
          word: string;
        };
      },
      "loadWiktionaryPageForWord",
    );

    const providedPage = {
      category: "Latin",
      href: "/wiki/amo",
      html: "<html>amo</html>",
      word: "amo",
    };

    const page = (
      command as unknown as {
        getPageForLexeme: (
          word: string,
          wiktionaryPage?: {
            category: string;
            href: string;
            html: string;
            word: string;
          },
        ) => {
          category: string;
          href: string;
          html: string;
          word: string;
        };
      }
    ).getPageForLexeme("amo", providedPage);

    expect(page).toStrictEqual(providedPage);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it("should return null when wiktionary file does not exist", () => {
    existsSyncMock.mockReturnValue(false);

    const page = (
      command as unknown as {
        readWiktionaryPageFromFile: (filePath: string) => null | {
          category: string;
          href: string;
          html: string;
          word: string;
        };
      }
    ).readWiktionaryPageFromFile("/tmp/missing.json");

    expect(page).toBeNull();
  });

  it("should return null and warn when wiktionary page data cannot be loaded", () => {
    const getWiktionaryFilePathForWordSpy = vi
      .spyOn(
        command as unknown as {
          getWiktionaryFilePathForWord: (word: string) => null | string;
        },
        "getWiktionaryFilePathForWord",
      )
      .mockReturnValueOnce(null);

    const loadWiktionaryPageForWord = (
      command as unknown as {
        loadWiktionaryPageForWord: (word: string) => null | {
          category: string;
          href: string;
          html: string;
          word: string;
        };
      }
    ).loadWiktionaryPageForWord.bind(command);

    const page = loadWiktionaryPageForWord("missing");

    expect(getWiktionaryFilePathForWordSpy).toHaveBeenCalledWith("missing");
    expect(page).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      "📄 Missing data file for word",
      undefined,
      { word: "missing" },
    );
  });

  it("should return null and warn when wiktionary file exists but page read fails", () => {
    vi.spyOn(
      command as unknown as {
        getWiktionaryFilePathForWord: (word: string) => null | string;
      },
      "getWiktionaryFilePathForWord",
    ).mockReturnValueOnce("/tmp/amo.json");

    vi.spyOn(
      command as unknown as {
        readWiktionaryPageFromFile: (filePath: string) => null | {
          category: string;
          href: string;
          html: string;
          word: string;
        };
      },
      "readWiktionaryPageFromFile",
    ).mockReturnValueOnce(null);

    const page = (
      command as unknown as {
        loadWiktionaryPageForWord: (word: string) => null | {
          category: string;
          href: string;
          html: string;
          word: string;
        };
      }
    ).loadWiktionaryPageForWord("amo");

    expect(page).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      "📄 Missing data file for word",
      undefined,
      { word: "amo" },
    );
  });

  it("should load and return wiktionary page data when file path and read succeed", () => {
    vi.spyOn(
      command as unknown as {
        getWiktionaryFilePathForWord: (word: string) => null | string;
      },
      "getWiktionaryFilePathForWord",
    ).mockReturnValueOnce("/tmp/amo.json");

    const expectedPage = {
      category: "Latin",
      href: "/wiki/amo",
      html: "<html>amo</html>",
      word: "amo",
    };

    vi.spyOn(
      command as unknown as {
        readWiktionaryPageFromFile: (filePath: string) => null | {
          category: string;
          href: string;
          html: string;
          word: string;
        };
      },
      "readWiktionaryPageFromFile",
    ).mockReturnValueOnce(expectedPage);

    const page = (
      command as unknown as {
        loadWiktionaryPageForWord: (word: string) => null | {
          category: string;
          href: string;
          html: string;
          word: string;
        };
      }
    ).loadWiktionaryPageForWord("amo");

    expect(page).toStrictEqual(expectedPage);
  });

  it("should load and return page in getPageForLexeme when no page is provided", () => {
    const expectedPage = {
      category: "Latin",
      href: "/wiki/amo",
      html: "<html>amo</html>",
      word: "amo",
    };

    vi.spyOn(
      command as unknown as {
        loadWiktionaryPageForWord: (word: string) => null | {
          category: string;
          href: string;
          html: string;
          word: string;
        };
      },
      "loadWiktionaryPageForWord",
    ).mockReturnValueOnce(expectedPage);

    const page = (
      command as unknown as {
        getPageForLexeme: (
          word: string,
          wiktionaryPage?: {
            category: string;
            href: string;
            html: string;
            word: string;
          },
        ) => {
          category: string;
          href: string;
          html: string;
          word: string;
        };
      }
    ).getPageForLexeme("amo");

    expect(page).toStrictEqual(expectedPage);
  });

  it("should throw when page lookup fails during getPageForLexeme", () => {
    vi.spyOn(
      command as unknown as {
        loadWiktionaryPageForWord: (word: string) => null | {
          category: string;
          href: string;
          html: string;
          word: string;
        };
      },
      "loadWiktionaryPageForWord",
    ).mockReturnValueOnce(null);

    expect(() =>
      (
        command as unknown as {
          getPageForLexeme: (
            word: string,
            wiktionaryPage?: {
              category: string;
              href: string;
              html: string;
              word: string;
            },
          ) => {
            category: string;
            href: string;
            html: string;
            word: string;
          };
        }
      ).getPageForLexeme("missing"),
    ).toThrow("File missing or unreadable for word: missing");
  });

  it("should process translation matches and map translations", async () => {
    const parentLexeme = new Lexeme();
    parentLexeme.id = "parent";
    parentLexeme.lemma = "amo";
    parentLexeme.partOfSpeech = "verb";
    parentLexeme.disambiguator = 0;
    parentLexeme.principalParts = [];
    parentLexeme.pronunciations = [];
    parentLexeme.forms = [];
    parentLexeme.translations = [];
    parentLexeme.inflection = null;

    const referencedLexeme = new Lexeme();
    referencedLexeme.id = "ref";
    referencedLexeme.lemma = "amare";
    referencedLexeme.partOfSpeech = "verb";
    referencedLexeme.disambiguator = 0;
    referencedLexeme.principalParts = [];
    referencedLexeme.pronunciations = [];
    referencedLexeme.forms = [];
    referencedLexeme.inflection = null;
    referencedLexeme.translations = [
      new Translation("to love", referencedLexeme),
    ];

    lexemesService.findLexemesByLemmaWithTranslations.mockResolvedValueOnce([
      referencedLexeme,
    ]);

    const targetTranslation = new Translation("{*amare*}", parentLexeme);

    await (
      command as unknown as {
        ingestTranslationReference: (translation: Translation) => Promise<void>;
      }
    ).ingestTranslationReference(targetTranslation);

    expect(translationsService.saveTranslations).toHaveBeenCalledTimes(2);
    expect(targetTranslation.data).toBe("");
  });

  it("should warn when translation has no reference markers", async () => {
    const parentLexeme = new Lexeme();
    parentLexeme.id = "parent";
    parentLexeme.lemma = "amo";
    parentLexeme.partOfSpeech = "verb";
    parentLexeme.disambiguator = 0;
    parentLexeme.principalParts = [];
    parentLexeme.pronunciations = [];
    parentLexeme.forms = [];
    parentLexeme.translations = [];
    parentLexeme.inflection = null;

    const plainTranslation = new Translation("simple text", parentLexeme);

    await (
      command as unknown as {
        ingestTranslationReference: (translation: Translation) => Promise<void>;
      }
    ).ingestTranslationReference(plainTranslation);

    expect(logger.warn).toHaveBeenCalledWith(
      "🔗 Missing reference in translation",
      undefined,
      expect.any(Object),
    );
  });

  it("should warn when translation reference has no matching lexeme", async () => {
    const parentLexeme = new Lexeme();
    parentLexeme.id = "parent";
    parentLexeme.lemma = "amo";
    parentLexeme.partOfSpeech = "verb";
    parentLexeme.disambiguator = 0;
    parentLexeme.principalParts = [];
    parentLexeme.pronunciations = [];
    parentLexeme.forms = [];
    parentLexeme.translations = [];
    parentLexeme.inflection = null;

    lexemesService.findLexemesByLemmaWithTranslations.mockResolvedValueOnce([]);

    const targetTranslation = new Translation("{*unknown*}", parentLexeme);

    await (
      command as unknown as {
        ingestTranslationReference: (translation: Translation) => Promise<void>;
      }
    ).ingestTranslationReference(targetTranslation);

    expect(logger.warn).toHaveBeenCalledWith(
      "🔑 Missing lexeme for reference",
      undefined,
      { reference: "unknown" },
    );
  });

  it("should process translation references by ingesting missing lexemes", async () => {
    const savedLexeme = new Lexeme();
    savedLexeme.id = "saved";
    savedLexeme.lemma = "amo";
    savedLexeme.partOfSpeech = "verb";
    savedLexeme.disambiguator = 0;
    savedLexeme.principalParts = [];
    savedLexeme.pronunciations = [];
    savedLexeme.forms = [];
    savedLexeme.translations = [];
    savedLexeme.inflection = null;

    translationsService.extractTranslationReferences.mockReturnValueOnce([
      "ref-word",
    ]);
    lexemesService.existsByLemma.mockResolvedValueOnce(false);
    translationsService.findTranslationsWithReferences.mockResolvedValueOnce([
      new Translation("{*amare*}", savedLexeme),
    ]);

    const ingestLexemeSpy = vi
      .spyOn(command, "ingestLexeme")
      .mockResolvedValue(undefined);
    const ingestTranslationReferenceSpy = vi
      .spyOn(
        command as unknown as {
          ingestTranslationReference: (
            translation: Translation,
          ) => Promise<void>;
        },
        "ingestTranslationReference",
      )
      .mockResolvedValue(undefined);

    await (
      command as unknown as {
        processTranslationReferences: (saved: Lexeme) => Promise<void>;
      }
    ).processTranslationReferences(savedLexeme);

    expect(ingestLexemeSpy).toHaveBeenCalledWith("ref-word");
    expect(ingestTranslationReferenceSpy).toHaveBeenCalledTimes(1);
  });

  it("should ingest lexeme with provided page and resolve references", async () => {
    const savedLexeme = new Lexeme();
    savedLexeme.id = "saved";
    savedLexeme.lemma = "amo";
    savedLexeme.partOfSpeech = "verb";
    savedLexeme.disambiguator = 0;
    savedLexeme.principalParts = [];
    savedLexeme.pronunciations = [];
    savedLexeme.forms = [];
    savedLexeme.translations = [];
    savedLexeme.inflection = null;

    lexemesService.parseLexemes.mockResolvedValueOnce([savedLexeme]);
    lexemesService.saveParsedLexeme.mockResolvedValueOnce(savedLexeme);

    const processTranslationReferencesSpy = vi
      .spyOn(
        command as unknown as {
          processTranslationReferences: (saved: Lexeme) => Promise<void>;
        },
        "processTranslationReferences",
      )
      .mockResolvedValue(undefined);

    await command.ingestLexeme(
      "amo",
      {
        category: "Latin",
        href: "/wiki/amo",
        html: "<html>amo</html>",
        word: "amo",
      },
      { current: 1, total: 2 },
    );

    expect(lexemesService.parseLexemes).toHaveBeenCalledTimes(1);
    expect(lexemesService.saveParsedLexeme).toHaveBeenCalledWith(savedLexeme);
    expect(processTranslationReferencesSpy).toHaveBeenCalledWith(savedLexeme);
  });

  it("should skip translation-reference processing when parsed lexeme is not saved", async () => {
    const parsedLexeme = new Lexeme();
    parsedLexeme.lemma = "amo";
    parsedLexeme.partOfSpeech = "verb";
    parsedLexeme.disambiguator = 0;
    parsedLexeme.principalParts = [];
    parsedLexeme.pronunciations = [];
    parsedLexeme.forms = [];
    parsedLexeme.translations = [];
    parsedLexeme.inflection = null;

    lexemesService.parseLexemes.mockResolvedValueOnce([parsedLexeme]);
    lexemesService.saveParsedLexeme.mockResolvedValueOnce(null);

    const processTranslationReferencesSpy = vi.spyOn(
      command as unknown as {
        processTranslationReferences: (saved: Lexeme) => Promise<void>;
      },
      "processTranslationReferences",
    );

    await command.ingestLexeme("amo", {
      category: "Latin",
      href: "/wiki/amo",
      html: "<html>amo</html>",
      word: "amo",
    });

    expect(processTranslationReferencesSpy).not.toHaveBeenCalled();
  });

  it("should throw for lexeme ingestion when html is missing", async () => {
    await expect(
      command.ingestLexeme("amo", {
        category: "Latin",
        href: "/wiki/amo",
        html: "",
        word: "amo",
      }),
    ).rejects.toThrow("Missing HTML data in file for word: amo");
  });

  describe("command line", () => {
    const setStandardInputTerminal = mockStandardInputTerminal();

    beforeEach(() => {
      promptsMock.mockReset();
      readdirSyncMock.mockReturnValue([
        "amo.json",
        "aqua.json",
        "bellum.json",
        "cano.json",
        "terra.json",
      ]);
      readFileSyncMock.mockImplementation((filePath) =>
        JSON.stringify({
          category: "Latin",
          href: "/wiki/lemma",
          html: "<p></p>",
          word: path.basename(String(filePath), ".json"),
        }),
      );
      setStandardInputTerminal(false);
    });

    /** Runs `dictionary` with `flags` exactly as the CLI would. */
    async function runDictionary(...flags: string[]): Promise<void> {
      await runCommandLine({
        argv: ["dictionary", ...flags],
        providers: [
          DictionaryCommand,
          { provide: LoggerService, useValue: createMock<LoggerService>() },
          { provide: LexemesService, useValue: lexemesService },
          { provide: TranslationsService, useValue: translationsService },
          { provide: ManualService, useValue: manualService },
        ],
      });
    }

    /** The words of every Wiktionary page handed to lexeme parsing. */
    function ingestedWords(): string[] {
      return lexemesService.parseLexemes.mock.calls.map(([page]) => page.word);
    }

    it("ingests only the lemmas between --startLemma and --endLemma without prompting", async () => {
      await runDictionary("--startLemma=aqua", "--endLemma=cano");

      expect(ingestedWords()).toStrictEqual(["aqua", "bellum", "cano"]);
      expect(promptsMock).not.toHaveBeenCalled();
      expect(manualService.ingestManual).toHaveBeenCalledTimes(1);
    });

    it("rejects a --startLemma missing from the dataset before ingesting anything", async () => {
      await expect(runDictionary("--startLemma=nope")).rejects.toThrow(
        'Start lemma "nope" not found in the dataset.',
      );

      expect(ingestedWords()).toStrictEqual([]);
      expect(manualService.ingestManual).not.toHaveBeenCalled();
    });

    it("rejects an --endLemma that falls before --startLemma", async () => {
      await expect(
        runDictionary("--startLemma=cano", "--endLemma=aqua"),
      ).rejects.toThrow('End lemma "aqua" not found in the dataset.');

      expect(ingestedWords()).toStrictEqual([]);
    });

    it("ingests every page without prompting when no bound is given, even on a terminal", async () => {
      setStandardInputTerminal(true);

      await runDictionary();

      expect(ingestedWords()).toHaveLength(5);
      expect(promptsMock).not.toHaveBeenCalled();
    });

    it("takes no bound for a bare --startLemma when standard input is not a terminal", async () => {
      await runDictionary("--startLemma");

      expect(ingestedWords()).toHaveLength(5);
      expect(promptsMock).not.toHaveBeenCalled();
    });

    it("prompts for a bare --startLemma when standard input is a terminal", async () => {
      setStandardInputTerminal(true);
      promptsMock.mockResolvedValueOnce({ choice: "cano" });

      await runDictionary("--startLemma");

      expect(promptsMock).toHaveBeenCalledTimes(1);
      expect(ingestedWords()).toStrictEqual(["cano", "terra"]);
    });

    it("fails instead of ingesting when the lemma prompt is cancelled", async () => {
      setStandardInputTerminal(true);
      promptsMock.mockResolvedValueOnce({});

      await expect(runDictionary("--endLemma")).rejects.toThrow(
        "Prompt cancelled: Select the ending lemma",
      );

      expect(ingestedWords()).toStrictEqual([]);
    });

    it("fails when the manual lexemes fail", async () => {
      manualService.ingestManual.mockRejectedValueOnce(
        new Error('null value in column "lexeme_id"'),
      );

      await expect(
        runDictionary("--startLemma=terra", "--endLemma=terra"),
      ).rejects.toThrow('null value in column "lexeme_id"');
    });
  });

  describe("error handling and branch guard behavior", () => {
    describe("processFile", () => {
      it("should append stringified non-Error failures to the error log", async () => {
        vi.spyOn(command, "ingestLexeme").mockRejectedValueOnce(
          "string-failure",
        );

        await (
          command as unknown as {
            processFile: (
              file: string,
              current: number,
              total: number,
            ) => Promise<void>;
          }
        ).processFile("amo.json", 1, 1);

        expect(logger.error).toHaveBeenCalledWith(
          "📄 Failed processing file",
          undefined,
          { file: "amo.json" },
        );
        expect(appendFileSyncMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining("amo.json: string-failure\n"),
        );
      });

      it("should fall back to error.message when an Error has no stack", async () => {
        const errorWithoutStack = new Error("message-only");
        errorWithoutStack.stack = "";

        vi.spyOn(command, "ingestLexeme").mockRejectedValueOnce(
          errorWithoutStack,
        );

        await (
          command as unknown as {
            processFile: (
              file: string,
              current: number,
              total: number,
            ) => Promise<void>;
          }
        ).processFile("amo.json", 1, 1);

        expect(appendFileSyncMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining("amo.json: message-only\n"),
        );
      });
    });

    describe("ingestTranslationReference", () => {
      it("should normalize parenthetical references and map fallback lexeme translations", async () => {
        const parentLexeme = new Lexeme();
        parentLexeme.id = "parent";
        parentLexeme.lemma = "amo";
        parentLexeme.partOfSpeech = "verb";
        parentLexeme.disambiguator = 0;
        parentLexeme.principalParts = [];
        parentLexeme.pronunciations = [];
        parentLexeme.forms = [];
        parentLexeme.translations = [];
        parentLexeme.inflection = null;

        const fallbackLexeme = new Lexeme();
        fallbackLexeme.id = "fallback";
        fallbackLexeme.lemma = "amare";
        fallbackLexeme.partOfSpeech = "noun";
        fallbackLexeme.disambiguator = 0;
        fallbackLexeme.principalParts = [];
        fallbackLexeme.pronunciations = [];
        fallbackLexeme.forms = [];
        fallbackLexeme.inflection = null;
        fallbackLexeme.translations = [
          new Translation("to love", fallbackLexeme),
        ];

        lexemesService.findLexemesByLemmaWithTranslations.mockResolvedValueOnce(
          [fallbackLexeme],
        );

        const targetTranslation = new Translation(
          "{*amare (figurative)*}",
          parentLexeme,
        );

        await (
          command as unknown as {
            ingestTranslationReference: (
              translation: Translation,
            ) => Promise<void>;
          }
        ).ingestTranslationReference(targetTranslation);

        expect(
          lexemesService.findLexemesByLemmaWithTranslations,
        ).toHaveBeenCalledWith("amare");
        expect(translationsService.saveTranslations).toHaveBeenNthCalledWith(
          1,
          [expect.objectContaining({ data: "to love" })],
        );
      });

      it("should skip creating mapped translations when fallback lexeme has no translations", async () => {
        const parentLexeme = new Lexeme();
        parentLexeme.id = "parent";
        parentLexeme.lemma = "amo";
        parentLexeme.partOfSpeech = "verb";
        parentLexeme.disambiguator = 0;
        parentLexeme.principalParts = [];
        parentLexeme.pronunciations = [];
        parentLexeme.forms = [];
        parentLexeme.translations = [];
        parentLexeme.inflection = null;

        const fallbackLexeme = new Lexeme();
        fallbackLexeme.id = "fallback";
        fallbackLexeme.lemma = "amare";
        fallbackLexeme.partOfSpeech = "noun";
        fallbackLexeme.disambiguator = 0;
        fallbackLexeme.principalParts = [];
        fallbackLexeme.pronunciations = [];
        fallbackLexeme.forms = [];
        fallbackLexeme.inflection = null;
        (
          fallbackLexeme as unknown as {
            translations?: null | Translation[];
          }
        ).translations = null;

        lexemesService.findLexemesByLemmaWithTranslations.mockResolvedValueOnce(
          [fallbackLexeme],
        );

        const targetTranslation = new Translation("{*amare*}", parentLexeme);

        await (
          command as unknown as {
            ingestTranslationReference: (
              translation: Translation,
            ) => Promise<void>;
          }
        ).ingestTranslationReference(targetTranslation);

        expect(translationsService.saveTranslations).toHaveBeenCalledTimes(1);
        expect(translationsService.saveTranslations).toHaveBeenCalledWith([
          targetTranslation,
        ]);
      });

      it("should handle missing regex capture groups by treating the reference as empty", async () => {
        const parentLexeme = new Lexeme();
        parentLexeme.id = "parent";
        parentLexeme.lemma = "amo";
        parentLexeme.partOfSpeech = "verb";
        parentLexeme.disambiguator = 0;
        parentLexeme.principalParts = [];
        parentLexeme.pronunciations = [];
        parentLexeme.forms = [];
        parentLexeme.translations = [];
        parentLexeme.inflection = null;

        const targetTranslation = new Translation("{*amare*}", parentLexeme);
        const newTranslations: Translation[] = [];

        lexemesService.findLexemesByLemmaWithTranslations.mockResolvedValueOnce(
          [],
        );

        await (
          command as unknown as {
            processTranslationMatch: (
              match: RegExpMatchArray,
              translation: Translation,
              mappedTranslations: Translation[],
            ) => Promise<void>;
          }
        ).processTranslationMatch(
          ["{*amare*}"] as unknown as RegExpMatchArray,
          targetTranslation,
          newTranslations,
        );

        expect(
          lexemesService.findLexemesByLemmaWithTranslations,
        ).toHaveBeenCalledWith("");
        expect(logger.warn).toHaveBeenCalledWith(
          "🔑 Missing lexeme for reference",
          undefined,
          { reference: "" },
        );
      });
    });
  });

  describe("processTranslationReferences", () => {
    it("should skip recursive ingestion for in-progress and existing reference words", async () => {
      const savedLexeme = new Lexeme();
      savedLexeme.id = "saved";
      savedLexeme.lemma = "amo";
      savedLexeme.partOfSpeech = "verb";
      savedLexeme.disambiguator = 0;
      savedLexeme.principalParts = [];
      savedLexeme.pronunciations = [];
      savedLexeme.forms = [];
      savedLexeme.translations = [];
      savedLexeme.inflection = null;

      (
        command as unknown as {
          inProgressWords: Set<string>;
        }
      ).inProgressWords.add("in-progress");

      translationsService.extractTranslationReferences.mockReturnValueOnce([
        "in-progress",
        "existing-word",
      ]);
      lexemesService.existsByLemma.mockResolvedValueOnce(true);
      translationsService.findTranslationsWithReferences.mockResolvedValueOnce(
        [],
      );

      const ingestLexemeSpy = vi
        .spyOn(command, "ingestLexeme")
        .mockResolvedValue(undefined);

      await (
        command as unknown as {
          processTranslationReferences: (saved: Lexeme) => Promise<void>;
        }
      ).processTranslationReferences(savedLexeme);

      expect(lexemesService.existsByLemma).toHaveBeenCalledTimes(1);
      expect(lexemesService.existsByLemma).toHaveBeenCalledWith(
        "existing-word",
      );
      expect(ingestLexemeSpy).not.toHaveBeenCalled();
    });

    it("should extract references from an empty list when saved translations are null", async () => {
      const savedLexeme = new Lexeme();
      savedLexeme.id = "saved";
      savedLexeme.lemma = "amo";
      savedLexeme.partOfSpeech = "verb";
      savedLexeme.disambiguator = 0;
      savedLexeme.principalParts = [];
      savedLexeme.pronunciations = [];
      savedLexeme.forms = [];
      (
        savedLexeme as unknown as {
          translations?: null | Translation[];
        }
      ).translations = null;
      savedLexeme.inflection = null;

      translationsService.extractTranslationReferences.mockReturnValueOnce([]);
      translationsService.findTranslationsWithReferences.mockResolvedValueOnce(
        [],
      );

      await (
        command as unknown as {
          processTranslationReferences: (saved: Lexeme) => Promise<void>;
        }
      ).processTranslationReferences(savedLexeme);

      expect(
        translationsService.extractTranslationReferences,
      ).toHaveBeenCalledWith([]);
    });
  });
});
