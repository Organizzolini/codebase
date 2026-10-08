import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { In, Word, WordForm, WordLexeme } from "@codebase/lexico-entities";

import { createRepositoryMock } from "../../../testing/mocks";

import { WORD_RELATIONS } from "./words.constants";
import { WordsService } from "./words.service";

describe(WordsService, () => {
  let service: WordsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WordsService,
        ...[Word, WordForm, WordLexeme].map((entity) => ({
          provide: getRepositoryToken(entity),
          useValue: createRepositoryMock(),
        })),
      ],
    }).compile();

    service = await module.resolve(WordsService);
  });

  it("is defined", () => {
    expect.hasAssertions();

    expect(service).toBeDefined();
  });

  it("finds a single word by surface data with all relations", async () => {
    expect.hasAssertions();

    const mockWord = new Word();
    mockWord.id = "word-1";
    mockWord.data = "amo";

    const wordRepo = createRepositoryMock<Word>();
    vi.spyOn(wordRepo, "findOne").mockResolvedValue(mockWord);

    const service = new WordsService(
      wordRepo,
      createRepositoryMock<WordForm>(),
      createRepositoryMock<WordLexeme>(),
    );

    const result = await service.findByData("amo");

    expect(wordRepo.findOne).toHaveBeenCalledWith({
      relations: {
        wordForms: {
          form: true,
        },
        wordLexemes: {
          lexeme: {
            forms: true,
            inflection: true,
            principalParts: true,
            pronunciations: true,
            translations: true,
          },
        },
      },
      where: { data: "amo" },
    });
    expect(result).toBe(mockWord);
  });

  it("finds a batch of words by data and preserves input ordering in the repository query", async () => {
    expect.hasAssertions();

    const wordRepo = createRepositoryMock<Word>();
    const words: Word[] = [new Word(), new Word()];
    const [firstWord, secondWord] = words;
    if (!firstWord || !secondWord) {
      throw new Error("Expected two test words");
    }
    firstWord.id = "word-1";
    firstWord.data = "amo";
    secondWord.id = "word-2";
    secondWord.data = "amare";
    vi.spyOn(wordRepo, "find").mockResolvedValue(words);

    const service = new WordsService(
      wordRepo,
      createRepositoryMock<WordForm>(),
      createRepositoryMock<WordLexeme>(),
    );

    const result = await service.findByDataList(["amo", "amare"]);

    expect(wordRepo.find).toHaveBeenCalledWith({
      relations: {
        wordForms: {
          form: true,
        },
        wordLexemes: {
          lexeme: {
            forms: true,
            inflection: true,
            principalParts: true,
            pronunciations: true,
            translations: true,
          },
        },
      },
      where: { data: In(["amo", "amare"]) },
    });
    expect(result).toStrictEqual(words);
  });

  it("orders batched words by first request, once each, omitting misses", async () => {
    expect.hasAssertions();

    const amo = new Word();
    amo.data = "amo";
    const amare = new Word();
    amare.data = "amare";
    const wordRepo = createRepositoryMock<Word>();
    vi.spyOn(wordRepo, "find").mockResolvedValue([amo, amare]);

    const service = new WordsService(
      wordRepo,
      createRepositoryMock<WordForm>(),
      createRepositoryMock<WordLexeme>(),
    );

    await expect(
      service.findByDataList(["amare", "amas", "amo", "amare"]),
    ).resolves.toStrictEqual([amare, amo]);
  });

  it("returns empty arrays immediately for empty lookup batches", async () => {
    expect.hasAssertions();

    const wordRepo = createRepositoryMock<Word>();
    const findSpy = vi.spyOn(wordRepo, "find");

    const service = new WordsService(
      wordRepo,
      createRepositoryMock<WordForm>(),
      createRepositoryMock<WordLexeme>(),
    );

    await expect(service.findByDataList([])).resolves.toStrictEqual([]);
    await expect(service.findByIds([])).resolves.toStrictEqual([]);
    expect(findSpy).not.toHaveBeenCalled();
  });

  it("returns linked forms and lexeme junction rows for a word surface", async () => {
    expect.hasAssertions();

    const mockWord = new Word();
    mockWord.wordForms = [new WordForm()];
    mockWord.wordLexemes = [new WordLexeme()];

    const wordRepo = createRepositoryMock<Word>();
    vi.spyOn(wordRepo, "findOne")
      .mockResolvedValueOnce(mockWord)
      .mockResolvedValueOnce(mockWord)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const service = new WordsService(
      wordRepo,
      createRepositoryMock<WordForm>(),
      createRepositoryMock<WordLexeme>(),
    );

    await expect(service.findFormsByData("amo")).resolves.toStrictEqual(
      mockWord.wordForms,
    );
    await expect(service.findLexemeLinksByData("amo")).resolves.toStrictEqual(
      mockWord.wordLexemes,
    );
    await expect(service.findFormsByData("unknown")).resolves.toStrictEqual([]);
    await expect(
      service.findLexemeLinksByData("unknown"),
    ).resolves.toStrictEqual([]);
  });

  it("loads rows by ids and nested form and lexeme rows by word id", async () => {
    expect.hasAssertions();

    const wordRepo = createRepositoryMock<Word>();
    const formRepo = createRepositoryMock<WordForm>();
    const lexemeRepo = createRepositoryMock<WordLexeme>();

    const words: Word[] = [new Word()];
    const [firstWord] = words;
    if (!firstWord) {
      throw new Error("Expected a test word");
    }
    firstWord.id = "word-1";
    vi.spyOn(wordRepo, "find").mockResolvedValue(words);

    const formRows = [new WordForm()];
    const lexemeRows = [new WordLexeme()];
    vi.spyOn(formRepo, "find").mockResolvedValue(formRows);
    vi.spyOn(lexemeRepo, "find").mockResolvedValue(lexemeRows);

    const service = new WordsService(wordRepo, formRepo, lexemeRepo);

    await expect(service.findByIds(["word-1"])).resolves.toStrictEqual(words);
    await expect(service.findFormRowsByWordId("word-1")).resolves.toStrictEqual(
      formRows,
    );
    await expect(
      service.findLexemeRowsByWordId("word-1"),
    ).resolves.toStrictEqual(lexemeRows);

    expect(wordRepo.find).toHaveBeenCalledWith({
      relations: {
        wordForms: {
          form: true,
        },
        wordLexemes: {
          lexeme: {
            forms: true,
            inflection: true,
            principalParts: true,
            pronunciations: true,
            translations: true,
          },
        },
      },
      where: { id: In(["word-1"]) },
    });
  });

  it("finds word-form and word-lexeme links by id, each with its word joined", async () => {
    expect.hasAssertions();

    const formRows = [Object.assign(new WordForm(), { id: "word-form-1" })];
    const lexemeRows = [
      Object.assign(new WordLexeme(), { id: "word-lexeme-1" }),
    ];
    const formRepo = createRepositoryMock<WordForm>();
    const lexemeRepo = createRepositoryMock<WordLexeme>();
    vi.spyOn(formRepo, "find").mockResolvedValue(formRows);
    vi.spyOn(lexemeRepo, "find").mockResolvedValue(lexemeRows);
    const service = new WordsService(
      createRepositoryMock<Word>(),
      formRepo,
      lexemeRepo,
    );

    await expect(
      service.findWordFormsByIds(["word-form-1"]),
    ).resolves.toStrictEqual(formRows);
    await expect(
      service.findWordLexemesByIds(["word-lexeme-1"]),
    ).resolves.toStrictEqual(lexemeRows);
    expect(formRepo.find).toHaveBeenCalledWith({
      relations: { word: WORD_RELATIONS },
      where: { id: In(["word-form-1"]) },
    });
    expect(lexemeRepo.find).toHaveBeenCalledWith({
      relations: { word: WORD_RELATIONS },
      where: { id: In(["word-lexeme-1"]) },
    });
  });
});
