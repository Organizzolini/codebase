import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Author,
  Lexeme,
  Line,
  Text,
  Token,
  Translation,
  Word,
} from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { resetCommandTestHarness } from "../../../testing/command-harness";
import {
  createRepositoryMock,
  setPromptsMockResponse,
} from "../../../testing/mocks";

import { ClearCommand } from "./clear.command";

import type { Repository } from "typeorm";

const { promptsMock } = vi.hoisted(() => ({
  promptsMock:
    vi.fn<() => Promise<{ dictionary: boolean; literature: boolean }>>(),
}));

vi.mock("prompts", () => ({
  default: promptsMock,
}));

describe(ClearCommand, () => {
  let command: ClearCommand;
  let lexemesRepository: Repository<Lexeme>;
  let translationsRepository: Repository<Translation>;
  let wordsRepository: Repository<Word>;
  let linesRepository: Repository<Line>;
  let textsRepository: Repository<Text>;
  let authorsRepository: Repository<Author>;
  let tokensRepository: Repository<Token>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ClearCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(Lexeme),
          useValue: createRepositoryMock<Lexeme>(),
        },
        {
          provide: getRepositoryToken(Translation),
          useValue: createRepositoryMock<Translation>(),
        },
        {
          provide: getRepositoryToken(Word),
          useValue: createRepositoryMock<Word>(),
        },
        {
          provide: getRepositoryToken(Line),
          useValue: createRepositoryMock<Line>(),
        },
        {
          provide: getRepositoryToken(Text),
          useValue: createRepositoryMock<Text>(),
        },
        {
          provide: getRepositoryToken(Author),
          useValue: createRepositoryMock<Author>(),
        },
        {
          provide: getRepositoryToken(Token),
          useValue: createRepositoryMock<Token>(),
        },
      ],
    }).compile();

    command = await module.resolve(ClearCommand);
    lexemesRepository = module.get(getRepositoryToken(Lexeme));
    translationsRepository = module.get(getRepositoryToken(Translation));
    wordsRepository = module.get(getRepositoryToken(Word));
    linesRepository = module.get(getRepositoryToken(Line));
    textsRepository = module.get(getRepositoryToken(Text));
    authorsRepository = module.get(getRepositoryToken(Author));
    tokensRepository = module.get(getRepositoryToken(Token));
  });

  beforeEach(() => {
    resetCommandTestHarness({ unstubGlobals: false });
    setPromptsMockResponse(promptsMock, {
      dictionary: true,
      literature: true,
    });
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ClearCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(Lexeme),
          useValue: createRepositoryMock<Lexeme>(),
        },
        {
          provide: getRepositoryToken(Translation),
          useValue: createRepositoryMock<Translation>(),
        },
        {
          provide: getRepositoryToken(Word),
          useValue: createRepositoryMock<Word>(),
        },
        {
          provide: getRepositoryToken(Line),
          useValue: createRepositoryMock<Line>(),
        },
        {
          provide: getRepositoryToken(Text),
          useValue: createRepositoryMock<Text>(),
        },
        {
          provide: getRepositoryToken(Author),
          useValue: createRepositoryMock<Author>(),
        },
        {
          provide: getRepositoryToken(Token),
          useValue: createRepositoryMock<Token>(),
        },
      ],
    }).compile();

    await module.resolve(ClearCommand);
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ClearCommand");
  });

  it.each([
    ["dictionary", undefined, true],
    ["dictionary", "false", false],
    ["dictionary", "0", false],
    ["dictionary", "true", true],
    ["literature", undefined, true],
    ["literature", "false", false],
    ["literature", "0", false],
    ["literature", "true", true],
  ] as const)(
    "parses %s option %s to %s",
    (optionName, inputValue, expectedValue) => {
      const result =
        optionName === "dictionary"
          ? command.parseDictionary(inputValue)
          : command.parseLiterature(inputValue);

      expect(result).toBe(expectedValue);
    },
  );

  it("prompts and clears both dictionary and literature when options are missing", async () => {
    await command.run([], {});

    expect(promptsMock).toHaveBeenCalledTimes(1);

    expect(wordsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(translationsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(lexemesRepository.createQueryBuilder).toHaveBeenCalledTimes(1);

    expect(tokensRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(linesRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(textsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(authorsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
  });

  it("clears only dictionary data when literature is disabled", async () => {
    await command.run([], {
      dictionary: true,
      literature: false,
    });

    expect(promptsMock).not.toHaveBeenCalled();

    expect(wordsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(translationsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(lexemesRepository.createQueryBuilder).toHaveBeenCalledTimes(1);

    expect(tokensRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(linesRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(textsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(authorsRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it("clears only literature data when dictionary is disabled", async () => {
    await command.run([], {
      dictionary: false,
      literature: true,
    });

    expect(promptsMock).not.toHaveBeenCalled();

    expect(wordsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(translationsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(lexemesRepository.createQueryBuilder).not.toHaveBeenCalled();

    expect(tokensRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(linesRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(textsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(authorsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
  });

  it("uses prompted boolean values when options are missing", async () => {
    setPromptsMockResponse(promptsMock, {
      dictionary: false,
      literature: true,
    });

    await command.run([], {});

    expect(promptsMock).toHaveBeenCalledTimes(1);
    expect(wordsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(translationsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(lexemesRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(tokensRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(linesRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(textsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(authorsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
  });

  it("parses prompt responses with only dictionary boolean values", () => {
    const parsedResponse = (
      command as unknown as {
        parsePromptResponse: (response: unknown) => {
          dictionary?: boolean;
          literature?: boolean;
        };
      }
    ).parsePromptResponse({ dictionary: false });

    expect(parsedResponse).toStrictEqual({ dictionary: false });
  });

  it("parses prompt responses with only literature boolean values", () => {
    const parsedResponse = (
      command as unknown as {
        parsePromptResponse: (response: unknown) => {
          dictionary?: boolean;
          literature?: boolean;
        };
      }
    ).parsePromptResponse({ literature: true });

    expect(parsedResponse).toStrictEqual({ literature: true });
  });

  it("ignores malformed prompt responses when options are missing", async () => {
    promptsMock.mockResolvedValueOnce(null as never);

    await command.run([], {});

    expect(wordsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(translationsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(lexemesRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(tokensRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(linesRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(textsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(authorsRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it("skips all deletion when both dictionary and literature are disabled", async () => {
    await command.run([], {
      dictionary: false,
      literature: false,
    });

    expect(promptsMock).not.toHaveBeenCalled();

    expect(wordsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(translationsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(lexemesRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(tokensRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(linesRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(textsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(authorsRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
