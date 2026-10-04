/* cspell:words ILIKE amō caritas diligo FULLTEXT lupusque puella puellam puellamque virum virumque */

import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Lexeme,
  NominalForm,
  type PartOfSpeech,
  Translation,
  Word,
  WordForm,
  WordLexeme,
} from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logger";

import { createRepositoryMock } from "../../../testing/mocks";
import { MacronsService } from "../macrons/macrons.service";

import { ENGLISH_SEARCH_RESULT_LIMIT } from "./search.constants";
import { SearchMatchSource } from "./search.entities";
import { SearchService } from "./search.service";

import type { Repository } from "typeorm";

/**
 * Creates a lexeme fixture, translated unless `translations` says otherwise.
 */
function createLexeme(
  id: string,
  lemma: string,
  options: { partOfSpeech?: PartOfSpeech; translations?: string[] } = {},
): Lexeme {
  const lexeme = new Lexeme();
  lexeme.id = id;
  lexeme.lemma = lemma;
  lexeme.partOfSpeech = options.partOfSpeech ?? "noun";
  lexeme.translations = (options.translations ?? [`${lemma} meaning`]).map(
    (data) => new Translation(data, lexeme),
  );
  return lexeme;
}

/**
 * Creates a surface word fixture inflecting a lexeme as one nominal form.
 */
function createNominalWord(data: string, lexeme: Lexeme): Word {
  const form = new NominalForm();
  form.case = "accusative";
  form.number = "singular";

  const wordForm = new WordForm();
  wordForm.form = form;

  const wordLexeme = new WordLexeme();
  wordLexeme.lexeme = lexeme;

  const word = new Word();
  word.id = `word-${data}`;
  word.data = data;
  word.wordForms = [wordForm];
  word.wordLexemes = [wordLexeme];
  return word;
}

/**
 * Creates a search service over fresh repository mocks and exposes their query builders.
 */
function createSearchService(): {
  lexemeQueryBuilder: ReturnType<Repository<Lexeme>["createQueryBuilder"]>;
  logger: DeepMocked<LoggerService>;
  service: SearchService;
  translationQueryBuilder: ReturnType<
    Repository<Translation>["createQueryBuilder"]
  >;
  wordQueryBuilder: ReturnType<Repository<Word>["createQueryBuilder"]>;
} {
  const lexemeRepository = createRepositoryMock<Lexeme>();
  const wordRepository = createRepositoryMock<Word>();
  const translationRepository = createRepositoryMock<Translation>();
  const logger = createMock<LoggerService>();

  const service = new SearchService(
    lexemeRepository,
    wordRepository,
    translationRepository,
    new MacronsService(),
    logger,
  );

  return {
    lexemeQueryBuilder: lexemeRepository.createQueryBuilder(),
    logger,
    service,
    translationQueryBuilder: translationRepository.createQueryBuilder(),
    wordQueryBuilder: wordRepository.createQueryBuilder(),
  };
}

describe(SearchService, () => {
  let service: SearchService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SearchService,
        MacronsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
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

  describe("searchLatin", () => {
    it("returns an empty connection for a whitespace query without logging", async () => {
      expect.hasAssertions();

      const { logger, service } = createSearchService();

      const result = await service.searchLatin("   ");

      expect(result.edges).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(logger.info).not.toHaveBeenCalled();
    });

    it("finds an exact lemma match with its score and match source", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service } = createSearchService();
      vi.mocked(lexemeQueryBuilder.getMany).mockResolvedValue([
        createLexeme("lex-amo", "amo", { partOfSpeech: "verb" }),
      ]);

      const result = await service.searchLatin("amo");

      expect(result.edges).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.edges[0]?.node.lexeme.id).toBe("lex-amo");
      expect(result.edges[0]?.node.source).toBe(SearchMatchSource.LEMMA_EXACT);
      expect(result.edges[0]?.node.score).toBe(1);
      expect(result.edges[0]?.node.enclitic).toBeNull();
    });

    it("finds an exact word form match with morphological identifiers", async () => {
      expect.hasAssertions();

      const { service, wordQueryBuilder } = createSearchService();
      const puella = createLexeme("lex-puella", "puella");
      vi.mocked(wordQueryBuilder.getMany).mockResolvedValue([
        createNominalWord("puellam", puella),
      ]);

      const result = await service.searchLatin("puellam");

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]?.node.lexeme.id).toBe("lex-puella");
      expect(result.edges[0]?.node.source).toBe(SearchMatchSource.WORD_EXACT);
      expect(result.edges[0]?.node.identifiers).toStrictEqual([
        "accusative singular",
      ]);
    });

    it("marks the stem of an enclitic query with the separated enclitic", async () => {
      expect.hasAssertions();

      const { service, wordQueryBuilder } = createSearchService();
      const puella = createLexeme("lex-puella", "puella");
      vi.mocked(wordQueryBuilder.getMany).mockResolvedValue([
        createNominalWord("puellam", puella),
      ]);

      const result = await service.searchLatin("puellamque");

      expect(result.edges[0]?.node.enclitic).toBe("que");
      expect(result.edges[0]?.node.lexeme.id).toBe("lex-puella");
    });

    it("returns the enclitic's own entry after the stem it was split from", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service, wordQueryBuilder } =
        createSearchService();
      const vir = createLexeme("lex-vir", "vir");
      const que = createLexeme("lex-que", "-que", { partOfSpeech: "suffix" });
      vi.mocked(wordQueryBuilder.getMany)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([createNominalWord("virum", vir)]);
      vi.mocked(lexemeQueryBuilder.getMany)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([que])
        .mockResolvedValue([]);

      const result = await service.searchLatin("virumque");

      expect(lexemeQueryBuilder.where).toHaveBeenCalledWith(
        "LOWER(lexeme.lemma) = :lemma",
        { lemma: "-que" },
      );
      expect(result.edges.map((edge) => edge.node.lexeme.id)).toStrictEqual([
        "lex-vir",
        "lex-que",
      ]);
      expect(result.edges[1]?.node.source).toBe(SearchMatchSource.ENCLITIC);
      expect(result.edges[1]?.node.score).toBe(0.8);
    });

    it("skips the enclitic's entry when its stem matched nothing", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service } = createSearchService();

      await service.searchLatin("lupusque");

      expect(lexemeQueryBuilder.where).not.toHaveBeenCalledWith(
        "LOWER(lexeme.lemma) = :lemma",
        { lemma: "-que" },
      );
    });

    it("skips the enclitic's entry when its stem matched only an untranslated lexeme", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service, wordQueryBuilder } =
        createSearchService();
      const vir = createLexeme("lex-vir", "vir", { translations: [] });
      vi.mocked(wordQueryBuilder.getMany)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([createNominalWord("virum", vir)]);

      const result = await service.searchLatin("virumque");

      expect(result.totalCount).toBe(0);
      expect(lexemeQueryBuilder.where).not.toHaveBeenCalledWith(
        "LOWER(lexeme.lemma) = :lemma",
        { lemma: "-que" },
      );
    });

    it("drops lexemes that have no translations", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service } = createSearchService();
      vi.mocked(lexemeQueryBuilder.getMany).mockResolvedValue([
        createLexeme("lex-amo", "amo"),
        createLexeme("lex-amo-bare", "amo", { translations: [] }),
      ]);

      const result = await service.searchLatin("amo");

      expect(result.edges.map((edge) => edge.node.lexeme.id)).toStrictEqual([
        "lex-amo",
      ]);
    });

    it("drops lexemes whose translations were not loaded", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service } = createSearchService();
      const unloaded = createLexeme("lex-amo", "amo");
      delete unloaded.translations;
      vi.mocked(lexemeQueryBuilder.getMany).mockResolvedValue([unloaded]);

      const result = await service.searchLatin("amo");

      expect(result.totalCount).toBe(0);
    });

    it("removes macrons from the query before matching stored words", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service } = createSearchService();

      await service.searchLatin("Amō");

      expect(lexemeQueryBuilder.where).toHaveBeenCalledWith(
        "LOWER(lexeme.lemma) = :term",
        { term: "amo" },
      );
    });

    it("deduplicates a lexeme matched by several tiers", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service } = createSearchService();
      const amo = createLexeme("lex-1", "amo");
      vi.mocked(lexemeQueryBuilder.getMany).mockResolvedValue([amo, amo]);

      const result = await service.searchLatin("amo");

      expect(result.edges).toHaveLength(1);
    });

    it("handles queries under 3 characters without fuzzy expansion", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service } = createSearchService();
      vi.mocked(lexemeQueryBuilder.getMany).mockResolvedValue([
        createLexeme("lex-in", "in"),
      ]);

      const result = await service.searchLatin("in");

      expect(result.edges).toHaveLength(1);
      expect(lexemeQueryBuilder.where).not.toHaveBeenCalledWith(
        "lexeme.lemma ILIKE :fuzzy",
        expect.anything(),
      );
    });

    it("logs the query, response time, and returned lexemes", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, logger, service } = createSearchService();
      vi.mocked(lexemeQueryBuilder.getMany).mockResolvedValue([
        createLexeme("lex-amo", "amo"),
      ]);

      await service.searchLatin("amo");

      expect(logger.info).toHaveBeenCalledWith(
        "🔎 Searched dictionary",
        undefined,
        expect.objectContaining({
          language: "latin",
          lexemeIds: ["lex-amo"],
          query: "amo",
          totalCount: 1,
        }),
      );
      expect(logger.info.mock.calls[0]?.[2]).toHaveProperty(
        "responseTime",
        expect.any(Number),
      );
    });
  });

  describe("searchEnglish", () => {
    it("returns an empty connection for an empty query", async () => {
      expect.hasAssertions();

      const { service } = createSearchService();

      const result = await service.searchEnglish("");

      expect(result.edges).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it("orders lexemes by the score the database ranked them with", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service, translationQueryBuilder } =
        createSearchService();
      vi.mocked(translationQueryBuilder.getRawMany).mockResolvedValue([
        { lexemeId: "lex-2", score: "1" },
        { lexemeId: "lex-1", score: "0.8" },
      ]);
      vi.mocked(lexemeQueryBuilder.getMany).mockResolvedValue([
        createLexeme("lex-1", "amo"),
        createLexeme("lex-2", "diligo"),
      ]);

      const result = await service.searchEnglish("love");

      expect(lexemeQueryBuilder.where).toHaveBeenCalledWith(
        "lexeme.id IN (:...lexemeIds)",
        { lexemeIds: ["lex-2", "lex-1"] },
      );
      expect(result.edges.map((edge) => edge.node.lexeme.id)).toStrictEqual([
        "lex-2",
        "lex-1",
      ]);
      expect(result.edges[0]?.node.score).toBe(1);
      expect(result.edges[1]?.node.score).toBe(0.8);
      expect(result.edges[0]?.node.source).toBe(
        SearchMatchSource.TRANSLATION_FULLTEXT,
      );
    });

    it("excludes proper nouns and caps the matches in the database", async () => {
      expect.hasAssertions();

      const { service, translationQueryBuilder } = createSearchService();

      await service.searchEnglish("Rome");

      expect(translationQueryBuilder.andWhere).toHaveBeenCalledWith(
        "lexeme.partOfSpeech <> :properNoun",
      );
      expect(translationQueryBuilder.setParameters).toHaveBeenCalledWith(
        expect.objectContaining({ properNoun: "properNoun" }),
      );
      expect(translationQueryBuilder.limit).toHaveBeenCalledWith(
        ENGLISH_SEARCH_RESULT_LIMIT,
      );
    });

    it("drops a ranked lexeme that no longer exists when loaded", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service, translationQueryBuilder } =
        createSearchService();
      vi.mocked(translationQueryBuilder.getRawMany).mockResolvedValue([
        { lexemeId: "lex-1", score: "1" },
        { lexemeId: "lex-deleted", score: "0.8" },
      ]);
      vi.mocked(lexemeQueryBuilder.getMany).mockResolvedValue([
        createLexeme("lex-1", "amo"),
      ]);

      const result = await service.searchEnglish("love");

      expect(result.edges.map((edge) => edge.node.lexeme.id)).toStrictEqual([
        "lex-1",
      ]);
    });

    it("skips loading lexemes when no translation matched", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service } = createSearchService();

      const result = await service.searchEnglish("zzz");

      expect(result.totalCount).toBe(0);
      expect(lexemeQueryBuilder.getMany).not.toHaveBeenCalled();
    });

    it("paginates results forward and backward", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service, translationQueryBuilder } =
        createSearchService();
      vi.mocked(translationQueryBuilder.getRawMany).mockResolvedValue(
        ["lex-1", "lex-2", "lex-3"].map((lexemeId) => ({
          lexemeId,
          score: "1",
        })),
      );
      vi.mocked(lexemeQueryBuilder.getMany).mockResolvedValue([
        createLexeme("lex-1", "amo"),
        createLexeme("lex-2", "diligo"),
        createLexeme("lex-3", "caritas"),
      ]);

      const page1 = await service.searchEnglish("love", { first: 2 });

      expect(page1.edges).toHaveLength(2);
      expect(page1.pageInfo.hasNextPage).toBe(true);
      expect(page1.pageInfo.hasPreviousPage).toBe(false);

      const page2 = await service.searchEnglish("love", {
        after: page1.edges[1]?.cursor,
        first: 2,
      });

      expect(page2.edges).toHaveLength(1);
      expect(page2.edges[0]?.node.lexeme.id).toBe("lex-3");
      expect(page2.pageInfo.hasNextPage).toBe(false);
      expect(page2.pageInfo.hasPreviousPage).toBe(true);
    });

    it("logs the English search", async () => {
      expect.hasAssertions();

      const { logger, service } = createSearchService();

      await service.searchEnglish("love");

      expect(logger.info).toHaveBeenCalledWith(
        "🔎 Searched dictionary",
        undefined,
        expect.objectContaining({ language: "english", query: "love" }),
      );
    });
  });
});
