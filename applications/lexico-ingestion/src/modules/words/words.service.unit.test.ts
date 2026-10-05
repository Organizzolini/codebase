import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it } from "vitest";

import {
  type Form,
  Lexeme,
  PrincipalPart,
  Word,
  WordForm,
  WordLexeme,
} from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { createRepositoryMock } from "../../../testing/mocks";
import { LEXICO_INGESTION_BY_ID } from "../lexico-ingestion/lexico-ingestion.constants";

import { WordsService } from "./words.service";

import type { DeepMocked } from "@golevelup/ts-vitest";
import type { InsertResult, Repository } from "typeorm";

describe(WordsService, () => {
  let service: WordsService;
  let wordRepository: DeepMocked<Repository<Word>>;
  let wordLexemeRepository: DeepMocked<Repository<WordLexeme>>;
  let wordFormRepository: DeepMocked<Repository<WordForm>>;
  let logger: DeepMocked<LoggerService>;

  const mockInsertResult: InsertResult = {
    generatedMaps: [],
    identifiers: [],
    raw: [],
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WordsService,
        {
          provide: getRepositoryToken(Word),
          useValue: createRepositoryMock<Word>(),
        },
        {
          provide: getRepositoryToken(WordLexeme),
          useValue: createRepositoryMock<WordLexeme>(),
        },
        {
          provide: getRepositoryToken(WordForm),
          useValue: createRepositoryMock<WordForm>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = await module.resolve(WordsService);
    wordRepository = module.get(getRepositoryToken(Word));
    wordLexemeRepository = module.get(getRepositoryToken(WordLexeme));
    wordFormRepository = module.get(getRepositoryToken(WordForm));
    logger = await module.resolve(LoggerService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        WordsService,
        {
          provide: getRepositoryToken(Word),
          useValue: createRepositoryMock<Word>(),
        },
        {
          provide: getRepositoryToken(WordLexeme),
          useValue: createRepositoryMock<WordLexeme>(),
        },
        {
          provide: getRepositoryToken(WordForm),
          useValue: createRepositoryMock<WordForm>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    await module.resolve(WordsService);
    const scopedLogger = await module.resolve(LoggerService);

    expect(scopedLogger.setContext).toHaveBeenCalledWith("WordsService");
  });

  describe("getLexemeWords", () => {
    it("should return text from all principal parts", () => {
      const pp1 = new PrincipalPart();
      pp1.text = ["amo"];
      const pp2 = new PrincipalPart();
      pp2.text = ["amare"];
      const pp3 = new PrincipalPart();
      pp3.text = ["amavi"];

      const lexeme = new Lexeme();
      lexeme.principalParts = [pp1, pp2, pp3];

      const result = service.getLexemeWords(lexeme);

      expect(result).toStrictEqual(["amo", "amare", "amavi"]);
    });

    it("should return empty array when no principal parts", () => {
      const lexeme = new Lexeme();
      lexeme.principalParts = [];

      const result = service.getLexemeWords(lexeme);

      expect(result).toStrictEqual([]);
    });

    it("should flatten multiple text entries from principal parts", () => {
      const pp1 = new PrincipalPart();
      pp1.text = ["amo", "amō"];
      const pp2 = new PrincipalPart();
      pp2.text = ["amare", "amāre"];

      const lexeme = new Lexeme();
      lexeme.principalParts = [pp1, pp2];

      const result = service.getLexemeWords(lexeme);

      expect(result).toStrictEqual(["amo", "amō", "amare", "amāre"]);
    });
  });

  describe("ingestLexemeWords", () => {
    it("should upsert normalized words for lexeme principal parts", async () => {
      const pp1 = new PrincipalPart();
      pp1.text = ["amo"];
      const pp2 = new PrincipalPart();
      pp2.text = ["amare"];

      const lexeme = new Lexeme();
      lexeme.id = "amor:1";
      lexeme.principalParts = [pp1, pp2];

      const word1 = new Word();
      word1.id = "1";
      word1.data = "amo";

      const word2 = new Word();
      word2.id = "2";
      word2.data = "amare";

      wordRepository.upsert.mockResolvedValue(mockInsertResult);
      wordRepository.find.mockResolvedValue([word1, word2]);

      await service.ingestLexemeWords(lexeme);

      expect(wordRepository.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ data: "amo" }),
          expect.objectContaining({ data: "amare" }),
        ]),
        {
          conflictPaths: ["data"],
          skipUpdateIfNoValuesChanged: true,
        },
      );
      expect(logger.info).toHaveBeenCalledWith(
        "🔤 Ingesting words for lexeme",
        undefined,
        { lexemeId: "amor:1" },
      );
      expect(logger.info).toHaveBeenCalledWith(
        "🔤 Ingested words for lexeme",
        undefined,
        { lexemeId: "amor:1" },
      );
    });

    it("should normalize words before upsert", async () => {
      const pp1 = new PrincipalPart();
      pp1.text = ["Amo"];
      const pp2 = new PrincipalPart();
      pp2.text = ["amāre"];

      const lexeme = new Lexeme();
      lexeme.id = "amor:1";
      lexeme.principalParts = [pp1, pp2];

      const word = new Word();
      word.id = "1";
      word.data = "amo";

      wordRepository.upsert.mockResolvedValue(mockInsertResult);
      wordRepository.find.mockResolvedValue([word]);

      await service.ingestLexemeWords(lexeme);

      expect(wordRepository.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ data: "amo" }),
          expect.objectContaining({ data: "amare" }),
        ]),
        expect.anything(),
      );
    });

    it("should create WordLexeme junctions for ingested words", async () => {
      const pp1 = new PrincipalPart();
      pp1.text = ["rosa"];

      const lexeme = new Lexeme();
      lexeme.id = "rosa:1";
      lexeme.principalParts = [pp1];

      const word = new Word();
      word.id = "1";
      word.data = "rosa";

      wordRepository.upsert.mockResolvedValue(mockInsertResult);
      wordRepository.find.mockResolvedValue([word]);

      await service.ingestLexemeWords(lexeme);

      expect(wordLexemeRepository.createQueryBuilder).toHaveBeenCalledWith();
    });

    it("should escape capital letters during normalization", async () => {
      const pp1 = new PrincipalPart();
      pp1.text = ["Julius"];

      const lexeme = new Lexeme();
      lexeme.id = "julius:1";
      lexeme.principalParts = [pp1];

      const word = new Word();
      word.id = "1";
      word.data = "_julius";

      wordRepository.upsert.mockResolvedValue(mockInsertResult);
      wordRepository.find.mockResolvedValue([word]);

      await service.ingestLexemeWords(lexeme);

      expect(wordRepository.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ data: "julius" })]),
        expect.anything(),
      );
    });

    it("should skip when no words provided", async () => {
      const lexeme = new Lexeme();
      lexeme.principalParts = [];

      await service.ingestLexemeWords(lexeme);

      expect(wordRepository.upsert).not.toHaveBeenCalled();
    });
  });

  describe("upsertWordsAndJunctions", () => {
    it("should upsert words with metadata fields", async () => {
      const formsByWord = new Map<string, Set<Form>>([["amo", new Set()]]);
      const lexeme = new Lexeme();
      lexeme.id = "amor:1";

      wordRepository.upsert.mockResolvedValue(mockInsertResult);
      wordRepository.find.mockResolvedValue([]);

      await service.upsertWordsAndJunctions(formsByWord, lexeme);

      expect(wordRepository.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            createdBy: LEXICO_INGESTION_BY_ID,
            data: "amo",
            updatedBy: LEXICO_INGESTION_BY_ID,
          }),
        ]),
        {
          conflictPaths: ["data"],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    });

    it("should skip when no words provided", async () => {
      const formsByWord = new Map<string, Set<Form>>();
      const lexeme = new Lexeme();

      await service.upsertWordsAndJunctions(formsByWord, lexeme);

      expect(wordRepository.upsert).not.toHaveBeenCalled();
    });

    it("should create WordLexeme and WordForm junctions", async () => {
      const form1 = {
        id: "form1",
        lexeme: new Lexeme(),
        wordForms: [],
      } as unknown as Form;
      const formsByWord = new Map<string, Set<Form>>([
        ["rosa", new Set<Form>([form1])],
      ]);
      const lexeme = new Lexeme();
      lexeme.id = "rosa:1";

      const word = new Word();
      word.id = "1";
      word.data = "rosa";

      wordRepository.upsert.mockResolvedValue(mockInsertResult);
      wordRepository.find.mockResolvedValue([word]);

      await service.upsertWordsAndJunctions(formsByWord, lexeme);

      expect(wordLexemeRepository.createQueryBuilder).toHaveBeenCalledWith();
    });

    it("should link form to word via WordForm junction", async () => {
      const form1 = {
        id: "form1",
        lexeme: new Lexeme(),
        wordForms: [],
      } as unknown as Form;
      const formsByWord = new Map<string, Set<Form>>([
        ["rosa", new Set<Form>([form1])],
      ]);
      const lexeme = new Lexeme();
      lexeme.id = "rosa:1";

      const word = new Word();
      word.id = "1";
      word.data = "rosa";

      wordRepository.upsert.mockResolvedValue(mockInsertResult);
      wordRepository.find.mockResolvedValue([word]);

      await service.upsertWordsAndJunctions(formsByWord, lexeme);

      expect(wordFormRepository.createQueryBuilder).toHaveBeenCalledWith();
    });

    it("should batch large sets of word forms", async () => {
      const forms: Form[] = [];
      for (let index = 0; index < 1500; index += 1) {
        forms.push({
          id: `form${index}`,
          lexeme: new Lexeme(),
          wordForms: [],
        } as unknown as Form);
      }

      const formsByWord = new Map<string, Set<Form>>([
        ["rosa", new Set<Form>(forms)],
      ]);
      const lexeme = new Lexeme();
      lexeme.id = "rosa:1";

      const word = new Word();
      word.id = "1";
      word.data = "rosa";

      wordRepository.upsert.mockResolvedValue(mockInsertResult);
      wordRepository.find.mockResolvedValue([word]);

      await service.upsertWordsAndJunctions(formsByWord, lexeme);

      // Should call createQueryBuilder multiple times due to batching
      expect(
        wordFormRepository.createQueryBuilder.mock.calls.length,
      ).toBeGreaterThan(1);
      expect(logger.debug).toHaveBeenCalledWith(
        "🧩 Inserting word form chunks",
        undefined,
        { chunkSize: 1000, totalValues: 1500 },
      );
      expect(logger.debug).toHaveBeenCalledWith(
        "🧩 Inserted word form chunks",
        undefined,
        { chunksWritten: 2 },
      );
    });
  });
});
