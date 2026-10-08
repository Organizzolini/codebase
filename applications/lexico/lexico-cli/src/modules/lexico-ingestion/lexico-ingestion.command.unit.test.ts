import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { setPromptsMockResponse } from "../../../testing/mocks";
import { CorpusScriptorumEcclesiasticorumLatinorumCommand } from "../corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.command";
import { DictionaryCommand } from "../dictionary/dictionary.command";
import { EpigraphikDatenbankClaussSlabyCommand } from "../epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.command";
import { LatinLibraryCommand } from "../latin-library/latin-library.command";
import { LibraryCommand } from "../library/library.command";
import { LiteratureCommand } from "../literature/literature.command";
import { PerseusCommand } from "../perseus/perseus.command";
import { WiktionaryCommand } from "../wiktionary/wiktionary.command";

import { LexicoIngestionCommand } from "./lexico-ingestion.command";

import type { LexicoIngestionCommandOptions } from "./lexico-ingestion.types";

const { promptsMock } = vi.hoisted(() => ({
  promptsMock: vi.fn<() => Promise<Record<string, boolean>>>(),
}));

vi.mock("prompts", () => ({
  default: promptsMock,
}));

describe(LexicoIngestionCommand, () => {
  let command: LexicoIngestionCommand;
  let logger: DeepMocked<LoggerService>;
  let corpusScriptorumEcclesiasticorumLatinorumCommand: DeepMocked<CorpusScriptorumEcclesiasticorumLatinorumCommand>;
  let dictionaryCommand: DeepMocked<DictionaryCommand>;
  let epigraphikDatenbankClaussSlabyCommand: DeepMocked<EpigraphikDatenbankClaussSlabyCommand>;
  let latinLibraryCommand: DeepMocked<LatinLibraryCommand>;
  let libraryCommand: DeepMocked<LibraryCommand>;
  let literatureCommand: DeepMocked<LiteratureCommand>;
  let perseusCommand: DeepMocked<PerseusCommand>;
  let wiktionaryCommand: DeepMocked<WiktionaryCommand>;

  beforeAll(async () => {
    setPromptsMockResponse(promptsMock, { value: true });

    const module = await Test.createTestingModule({
      providers: [
        LexicoIngestionCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: CorpusScriptorumEcclesiasticorumLatinorumCommand,
          useValue:
            createMock<CorpusScriptorumEcclesiasticorumLatinorumCommand>(),
        },
        {
          provide: DictionaryCommand,
          useValue: createMock<DictionaryCommand>(),
        },
        {
          provide: EpigraphikDatenbankClaussSlabyCommand,
          useValue: createMock<EpigraphikDatenbankClaussSlabyCommand>(),
        },
        {
          provide: LatinLibraryCommand,
          useValue: createMock<LatinLibraryCommand>(),
        },
        { provide: LibraryCommand, useValue: createMock<LibraryCommand>() },
        {
          provide: LiteratureCommand,
          useValue: createMock<LiteratureCommand>(),
        },
        { provide: PerseusCommand, useValue: createMock<PerseusCommand>() },
        {
          provide: WiktionaryCommand,
          useValue: createMock<WiktionaryCommand>(),
        },
      ],
    }).compile();

    command = await module.resolve(LexicoIngestionCommand);
    logger = await module.resolve(LoggerService);
    corpusScriptorumEcclesiasticorumLatinorumCommand = module.get(
      CorpusScriptorumEcclesiasticorumLatinorumCommand,
    );
    dictionaryCommand = module.get(DictionaryCommand);
    epigraphikDatenbankClaussSlabyCommand = module.get(
      EpigraphikDatenbankClaussSlabyCommand,
    );
    latinLibraryCommand = module.get(LatinLibraryCommand);
    libraryCommand = module.get(LibraryCommand);
    literatureCommand = module.get(LiteratureCommand);
    perseusCommand = module.get(PerseusCommand);
    wiktionaryCommand = module.get(WiktionaryCommand);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setPromptsMockResponse(promptsMock, { value: true });
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        LexicoIngestionCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: CorpusScriptorumEcclesiasticorumLatinorumCommand,
          useValue:
            createMock<CorpusScriptorumEcclesiasticorumLatinorumCommand>(),
        },
        {
          provide: DictionaryCommand,
          useValue: createMock<DictionaryCommand>(),
        },
        {
          provide: EpigraphikDatenbankClaussSlabyCommand,
          useValue: createMock<EpigraphikDatenbankClaussSlabyCommand>(),
        },
        {
          provide: LatinLibraryCommand,
          useValue: createMock<LatinLibraryCommand>(),
        },
        {
          provide: LibraryCommand,
          useValue: createMock<LibraryCommand>(),
        },
        {
          provide: LiteratureCommand,
          useValue: createMock<LiteratureCommand>(),
        },
        {
          provide: PerseusCommand,
          useValue: createMock<PerseusCommand>(),
        },
        {
          provide: WiktionaryCommand,
          useValue: createMock<WiktionaryCommand>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("LexicoIngestionCommand");
  });

  it("should parse all boolean options", () => {
    expect(command.parseWikipedia(undefined)).toBe(true);
    expect(command.parseWikipedia("false")).toBe(false);
    expect(command.parseWikipedia("0")).toBe(false);

    expect(command.parseDictionary(undefined)).toBe(true);
    expect(command.parseDictionary("false")).toBe(false);
    expect(command.parseDictionary("0")).toBe(false);

    expect(command.parseLibrarySources(undefined)).toBe(true);
    expect(command.parseLibrarySources("0")).toBe(false);

    expect(command.parseLibrary(undefined)).toBe(true);
    expect(command.parseLibrary("false")).toBe(false);
    expect(command.parseLibrary("0")).toBe(false);

    expect(command.parseLiterature(undefined)).toBe(true);
    expect(command.parseLiterature("0")).toBe(false);
  });

  it("should return provided prompt option values without prompting", async () => {
    const result = await (
      command as unknown as {
        promptOption: (
          currentValue: boolean | undefined,
          message: string,
          name: string,
        ) => Promise<boolean>;
      }
    ).promptOption(true, "message", "name");

    expect(result).toBe(true);
    expect(promptsMock).not.toHaveBeenCalled();
  });

  it("should prompt when option value is missing", async () => {
    setPromptsMockResponse(promptsMock, { wikipedia: false });

    const result = await (
      command as unknown as {
        promptOption: (
          currentValue: boolean | undefined,
          message: string,
          name: string,
        ) => Promise<boolean>;
      }
    ).promptOption(undefined, "Run wikipedia?", "wikipedia");

    expect(result).toBe(false);
    expect(promptsMock).toHaveBeenCalledTimes(1);
  });

  it("should run selected stages in order", async () => {
    const options: LexicoIngestionCommandOptions = {
      dictionary: true,
      library: true,
      librarySources: true,
      literature: true,
      wikipedia: true,
    };

    const promptForMissingOptionsSpy = vi
      .spyOn(
        command as unknown as {
          promptForMissingOptions: (
            optionsToPrompt: LexicoIngestionCommandOptions,
          ) => Promise<void>;
        },
        "promptForMissingOptions",
      )
      .mockResolvedValue(undefined);

    await command.run([], options);

    expect(promptForMissingOptionsSpy).toHaveBeenCalledWith(options);
    expect(wiktionaryCommand.run).toHaveBeenCalledTimes(1);
    expect(dictionaryCommand.ingestAll).toHaveBeenCalledTimes(1);
    expect(perseusCommand.run).toHaveBeenCalledTimes(1);
    expect(latinLibraryCommand.run).toHaveBeenCalledTimes(1);
    expect(
      corpusScriptorumEcclesiasticorumLatinorumCommand.run,
    ).toHaveBeenCalledTimes(1);
    expect(epigraphikDatenbankClaussSlabyCommand.run).toHaveBeenCalledTimes(1);
    expect(libraryCommand.run).toHaveBeenCalledWith([], {});
    expect(literatureCommand.run).toHaveBeenCalledWith([], {});

    const completionCall = logger.info.mock.calls.find(
      (call) => call[0] === "🎉 Completed the full ingestion pipeline",
    ) as [string, undefined, { durationSeconds: string }] | undefined;

    expect(completionCall).toBeDefined();
    expect(typeof completionCall?.[2].durationSeconds).toBe("string");
  });

  it("should skip disabled stages", async () => {
    const options: LexicoIngestionCommandOptions = {
      dictionary: false,
      library: false,
      librarySources: false,
      literature: false,
      wikipedia: false,
    };

    const promptForMissingOptionsSpy = vi
      .spyOn(
        command as unknown as {
          promptForMissingOptions: (
            optionsToPrompt: LexicoIngestionCommandOptions,
          ) => Promise<void>;
        },
        "promptForMissingOptions",
      )
      .mockResolvedValue(undefined);

    await command.run([], options);

    expect(promptForMissingOptionsSpy).toHaveBeenCalledWith(options);
    expect(wiktionaryCommand.run).not.toHaveBeenCalled();
    expect(dictionaryCommand.ingestAll).not.toHaveBeenCalled();
    expect(perseusCommand.run).not.toHaveBeenCalled();
    expect(libraryCommand.run).not.toHaveBeenCalled();
    expect(literatureCommand.run).not.toHaveBeenCalled();
  });

  it("should prompt for missing options and run only prompted stages", async () => {
    vi.restoreAllMocks();
    setPromptsMockResponse(promptsMock, {
      dictionary: false,
      library: false,
      librarySources: true,
      literature: true,
      wikipedia: false,
    });

    await command.run([], {});

    expect(promptsMock).toHaveBeenCalledTimes(5);
    expect(wiktionaryCommand.run).not.toHaveBeenCalled();
    expect(dictionaryCommand.ingestAll).not.toHaveBeenCalled();
    expect(perseusCommand.run).toHaveBeenCalledTimes(1);
    expect(latinLibraryCommand.run).toHaveBeenCalledTimes(1);
    expect(
      corpusScriptorumEcclesiasticorumLatinorumCommand.run,
    ).toHaveBeenCalledTimes(1);
    expect(epigraphikDatenbankClaussSlabyCommand.run).toHaveBeenCalledTimes(1);
    expect(libraryCommand.run).not.toHaveBeenCalled();
    expect(literatureCommand.run).toHaveBeenCalledWith([], {});
  });

  it("should run only library sources stage helper", async () => {
    await (
      command as unknown as {
        runLibrarySourcesStage: () => Promise<void>;
      }
    ).runLibrarySourcesStage();

    expect(perseusCommand.run).toHaveBeenCalledTimes(1);
    expect(latinLibraryCommand.run).toHaveBeenCalledTimes(1);
    expect(
      corpusScriptorumEcclesiasticorumLatinorumCommand.run,
    ).toHaveBeenCalledTimes(1);
    expect(epigraphikDatenbankClaussSlabyCommand.run).toHaveBeenCalledTimes(1);
  });
});
