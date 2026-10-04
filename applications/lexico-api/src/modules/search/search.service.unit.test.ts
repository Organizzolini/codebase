/* cspell:words atque bonis bonisve denique diligo FULLTEXT neque puella puellam puellamque quinque vides videsne */

import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Lexeme,
  NominalForm,
  Translation,
  Word,
  WordForm,
  WordLexeme,
} from "@codebase/lexico-entities";

import { createRepositoryMock } from "../../../testing/mocks";

import { SearchMatchSource } from "./search.entities";
import { SearchService } from "./search.service";
import { decomposeEnclitic } from "./search.utilities";

describe(SearchService, () => {
  let service: SearchService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SearchService,
        ...[Lexeme, Word, Translation].map((entity) => ({
          provide: getRepositoryToken(entity),
          useValue: createRepositoryMock(),
        })),
      ],
    }).compile();

    service = await module.resolve(SearchService);
  });

  it("is defined", () => {
    expect.hasAssertions();

    expect(service).toBeDefined();
  });

  describe(decomposeEnclitic, () => {
    it("decomposes -que enclitic when stem is sufficiently long", () => {
      expect.hasAssertions();

      const result = decomposeEnclitic("puellamque");

      expect(result).toStrictEqual({
        enclitic: "que",
        stem: "puellam",
      });
    });

    it("decomposes -ve enclitic", () => {
      expect.hasAssertions();

      const result = decomposeEnclitic("bonisve");

      expect(result).toStrictEqual({
        enclitic: "ve",
        stem: "bonis",
      });
    });

    it("decomposes -ne enclitic", () => {
      expect.hasAssertions();

      const result = decomposeEnclitic("videsne");

      expect(result).toStrictEqual({
        enclitic: "ne",
        stem: "vides",
      });
    });

    it("preserves non-decomposable false positive words like neque and atque", () => {
      expect.hasAssertions();

      expect(decomposeEnclitic("neque")).toStrictEqual({
        enclitic: null,
        stem: "neque",
      });
      expect(decomposeEnclitic("atque")).toStrictEqual({
        enclitic: null,
        stem: "atque",
      });
      expect(decomposeEnclitic("denique")).toStrictEqual({
        enclitic: null,
        stem: "denique",
      });
      expect(decomposeEnclitic("quinque")).toStrictEqual({
        enclitic: null,
        stem: "quinque",
      });
    });

    it("returns unmodified stem when no enclitic is detected", () => {
      expect.hasAssertions();

      expect(decomposeEnclitic("amare")).toStrictEqual({
        enclitic: null,
        stem: "amare",
      });
    });
  });

  describe("searchLatin", () => {
    it("returns empty connection for empty or whitespace query", async () => {
      expect.hasAssertions();

      const mockLexemeRepo = createRepositoryMock<Lexeme>();
      const mockWordRepo = createRepositoryMock<Word>();
      const mockTranslationRepo = createRepositoryMock<Translation>();

      const service = new SearchService(
        mockLexemeRepo,
        mockWordRepo,
        mockTranslationRepo,
      );

      const result = await service.searchLatin("   ");

      expect(result.edges).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it("finds exact lemma match and returns connection with score and match source", async () => {
      expect.hasAssertions();

      const lexeme = new Lexeme();
      lexeme.id = "lex-amo";
      lexeme.lemma = "amo";
      lexeme.partOfSpeech = "verb";

      const mockLexemeRepo = createRepositoryMock<Lexeme>();
      const mockWordRepo = createRepositoryMock<Word>();
      const mockTranslationRepo = createRepositoryMock<Translation>();

      const queryBuilder = mockLexemeRepo.createQueryBuilder();
      vi.spyOn(queryBuilder, "getMany").mockResolvedValue([lexeme]);

      const service = new SearchService(
        mockLexemeRepo,
        mockWordRepo,
        mockTranslationRepo,
      );

      const result = await service.searchLatin("amo");

      expect(result.edges).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.edges[0]?.node.lexeme.id).toBe("lex-amo");
      expect(result.edges[0]?.node.source).toBe(SearchMatchSource.LEMMA_EXACT);
      expect(result.edges[0]?.node.score).toBe(1);
      expect(result.edges[0]?.node.enclitic).toBeNull();
    });

    it("finds exact word form match with morphological identifiers", async () => {
      expect.hasAssertions();

      const lexeme = new Lexeme();
      lexeme.id = "lex-puella";
      lexeme.lemma = "puella";
      lexeme.partOfSpeech = "noun";

      const form = new NominalForm();
      form.case = "accusative";
      form.number = "singular";

      const wordForm = new WordForm();
      wordForm.form = form;

      const wordLexeme = new WordLexeme();
      wordLexeme.lexeme = lexeme;

      const word = new Word();
      word.id = "word-puellam";
      word.data = "puellam";
      word.wordForms = [wordForm];
      word.wordLexemes = [wordLexeme];

      const mockLexemeRepo = createRepositoryMock<Lexeme>();
      const mockWordRepo = createRepositoryMock<Word>();
      const mockTranslationRepo = createRepositoryMock<Translation>();

      const lexemeQb = mockLexemeRepo.createQueryBuilder();
      vi.spyOn(lexemeQb, "getMany").mockResolvedValue([]);

      const wordQb = mockWordRepo.createQueryBuilder();
      vi.spyOn(wordQb, "getMany").mockResolvedValue([word]);

      const service = new SearchService(
        mockLexemeRepo,
        mockWordRepo,
        mockTranslationRepo,
      );

      const result = await service.searchLatin("puellam");

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]?.node.lexeme.id).toBe("lex-puella");
      expect(result.edges[0]?.node.source).toBe(SearchMatchSource.WORD_EXACT);
      expect(result.edges[0]?.node.identifiers).toStrictEqual([
        "accusative singular",
      ]);
    });

    it("handles enclitic query puellamque decomposing to stem puellam with enclitic que", async () => {
      expect.hasAssertions();

      const lexeme = new Lexeme();
      lexeme.id = "lex-puella";
      lexeme.lemma = "puella";

      const form = new NominalForm();
      form.case = "accusative";
      form.number = "singular";

      const wordForm = new WordForm();
      wordForm.form = form;

      const wordLexeme = new WordLexeme();
      wordLexeme.lexeme = lexeme;

      const word = new Word();
      word.id = "word-puellam";
      word.data = "puellam";
      word.wordForms = [wordForm];
      word.wordLexemes = [wordLexeme];

      const mockLexemeRepo = createRepositoryMock<Lexeme>();
      const mockWordRepo = createRepositoryMock<Word>();
      const mockTranslationRepo = createRepositoryMock<Translation>();

      const lexemeQb = mockLexemeRepo.createQueryBuilder();
      vi.spyOn(lexemeQb, "getMany").mockResolvedValue([]);

      const wordQb = mockWordRepo.createQueryBuilder();
      vi.spyOn(wordQb, "getMany").mockResolvedValue([word]);

      const service = new SearchService(
        mockLexemeRepo,
        mockWordRepo,
        mockTranslationRepo,
      );

      const result = await service.searchLatin("puellamque");

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]?.node.enclitic).toBe("que");
      expect(result.edges[0]?.node.lexeme.id).toBe("lex-puella");
    });
  });

  describe("searchEnglish", () => {
    it("returns empty connection for empty English query", async () => {
      expect.hasAssertions();

      const mockLexemeRepo = createRepositoryMock<Lexeme>();
      const mockWordRepo = createRepositoryMock<Word>();
      const mockTranslationRepo = createRepositoryMock<Translation>();

      const service = new SearchService(
        mockLexemeRepo,
        mockWordRepo,
        mockTranslationRepo,
      );

      const result = await service.searchEnglish("");

      expect(result.edges).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it("finds matching translations and ranks exact match highest", async () => {
      expect.hasAssertions();

      const lexeme1 = new Lexeme();
      lexeme1.id = "lex-1";
      lexeme1.lemma = "amo";

      const lexeme2 = new Lexeme();
      lexeme2.id = "lex-2";
      lexeme2.lemma = "diligo";

      const translation1 = new Translation("love, to like", lexeme1);
      const translation2 = new Translation("love", lexeme2);

      const mockLexemeRepo = createRepositoryMock<Lexeme>();
      const mockWordRepo = createRepositoryMock<Word>();
      const mockTranslationRepo = createRepositoryMock<Translation>();

      const translationQb = mockTranslationRepo.createQueryBuilder();
      vi.spyOn(translationQb, "getMany").mockResolvedValue([
        translation1,
        translation2,
      ]);

      const service = new SearchService(
        mockLexemeRepo,
        mockWordRepo,
        mockTranslationRepo,
      );

      const result = await service.searchEnglish("love");

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0]?.node.lexeme.id).toBe("lex-2");
      expect(result.edges[0]?.node.score).toBe(1);
      expect(result.edges[1]?.node.lexeme.id).toBe("lex-1");
      expect(result.edges[1]?.node.score).toBe(0.8);
      expect(result.edges[0]?.node.source).toBe(
        SearchMatchSource.TRANSLATION_FULLTEXT,
      );
    });

    it("deduplicates prefix and fuzzy results when already present in results map", async () => {
      expect.hasAssertions();

      const lexeme = new Lexeme();
      lexeme.id = "lex-1";
      lexeme.lemma = "amo";

      const mockLexemeRepo = createRepositoryMock<Lexeme>();
      const mockWordRepo = createRepositoryMock<Word>();
      const mockTranslationRepo = createRepositoryMock<Translation>();

      const lexemeQb = mockLexemeRepo.createQueryBuilder();
      vi.spyOn(lexemeQb, "getMany").mockResolvedValue([lexeme, lexeme]);

      const service = new SearchService(
        mockLexemeRepo,
        mockWordRepo,
        mockTranslationRepo,
      );

      const result = await service.searchLatin("amo");

      expect(result.edges).toHaveLength(1);
    });

    it("paginates English search results forward and backward", async () => {
      expect.hasAssertions();

      const lexeme1 = new Lexeme();
      lexeme1.id = "lex-1";
      lexeme1.lemma = "amo";

      const lexeme2 = new Lexeme();
      lexeme2.id = "lex-2";
      lexeme2.lemma = "diligo";

      const lexeme3 = new Lexeme();
      lexeme3.id = "lex-3";
      lexeme3.lemma = "amo-alt";

      const translation1 = new Translation("love", lexeme1);
      const translation2 = new Translation("love", lexeme2);
      const translation3 = new Translation("love", lexeme3);

      const mockLexemeRepo = createRepositoryMock<Lexeme>();
      const mockWordRepo = createRepositoryMock<Word>();
      const mockTranslationRepo = createRepositoryMock<Translation>();

      const translationQb = mockTranslationRepo.createQueryBuilder();
      vi.spyOn(translationQb, "getMany").mockResolvedValue([
        translation1,
        translation2,
        translation3,
      ]);

      const service = new SearchService(
        mockLexemeRepo,
        mockWordRepo,
        mockTranslationRepo,
      );

      const page1 = await service.searchEnglish("love", { first: 2 });

      expect(page1.edges).toHaveLength(2);
      expect(page1.pageInfo.hasNextPage).toBe(true);
      expect(page1.pageInfo.hasPreviousPage).toBe(false);

      const afterCursor = page1.edges[1]?.cursor;
      const page2 = await service.searchEnglish("love", {
        after: afterCursor,
        first: 2,
      });

      expect(page2.edges).toHaveLength(1);
      expect(page2.edges[0]?.node.lexeme.id).toBe("lex-3");
      expect(page2.pageInfo.hasNextPage).toBe(false);
      expect(page2.pageInfo.hasPreviousPage).toBe(true);
    });

    it("handles short queries under 3 characters without fuzzy expansion", async () => {
      expect.hasAssertions();

      const lexeme = new Lexeme();
      lexeme.id = "lex-in";
      lexeme.lemma = "in";

      const mockLexemeRepo = createRepositoryMock<Lexeme>();
      const mockWordRepo = createRepositoryMock<Word>();
      const mockTranslationRepo = createRepositoryMock<Translation>();

      const lexemeQb = mockLexemeRepo.createQueryBuilder();
      vi.spyOn(lexemeQb, "getMany").mockResolvedValue([lexeme]);

      const service = new SearchService(
        mockLexemeRepo,
        mockWordRepo,
        mockTranslationRepo,
      );

      const result = await service.searchLatin("in");

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]?.node.lexeme.id).toBe("lex-in");
    });
  });
});
