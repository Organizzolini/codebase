/* cspell:words amō cantoque Cantōque */

import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it } from "vitest";

import { Lexeme, Translation, Word } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { createRepositoryMock } from "../../../testing/mocks";
import { MacronsService } from "../macrons/macrons.service";

import { ENGLISH_SEARCH_RESULT_LIMIT } from "./search.constants";
import { SearchService } from "./search.service";

import type { Repository } from "typeorm";

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

      const { lexemeQueryBuilder, logger, service } = createSearchService();

      const result = await service.searchLatin("   ");

      expect(result.edges).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(lexemeQueryBuilder.getCount).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });

    it("ranks the query and its stem with the macrons removed, adding the enclitic's tier", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service } = createSearchService();

      await service.searchLatin("Cantōque");

      expect(lexemeQueryBuilder.setParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          encliticLemma: "-que",
          latinFuzzy0: "%cantoque%",
          latinFuzzy1: "%canto%",
          latinPrefix0: "cantoque%",
          latinPrefix1: "canto%",
          latinStem: ["canto"],
          latinTerms: ["cantoque", "canto"],
        }),
      );
    });

    it("ranks a query under 3 characters with no substring tier and no enclitic", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service } = createSearchService();

      await service.searchLatin("in");

      expect(lexemeQueryBuilder.setParameters).toHaveBeenCalledWith({
        latinPrefix0: "in%",
        latinStem: ["in"],
        latinTerms: ["in"],
      });
    });

    it("asks for no words when every ranked lexeme vanished before loading", async () => {
      expect.hasAssertions();

      const { lexemeQueryBuilder, service, wordQueryBuilder } =
        createSearchService();
      Object.defineProperty(lexemeQueryBuilder, "dataSource", {
        value: {
          driver: {
            escapeQueryWithParameters: (sql: string): [string, unknown[]] => [
              sql,
              [],
            ],
          },
          query: async () =>
            await Promise.resolve([
              {
                after: null,
                before: null,
                hasRowBefore: false,
                totalCount: 1,
                window: [{ id: "lexeme-gone", key: -1 }],
              },
            ]),
        },
      });

      const result = await service.searchLatin("amo");

      expect(result.edges).toStrictEqual([]);
      expect(result.totalCount).toBe(1);
      expect(wordQueryBuilder.getMany).not.toHaveBeenCalled();
    });

    it("logs the query, response time, and returned lexemes", async () => {
      expect.hasAssertions();

      const { logger, service } = createSearchService();

      await service.searchLatin("amo");

      expect(logger.info).toHaveBeenCalledWith(
        "🔎 Searched dictionary",
        undefined,
        expect.objectContaining({
          language: "latin",
          lexemeIds: [],
          query: "amo",
          totalCount: 0,
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

      const { service, translationQueryBuilder } = createSearchService();

      const result = await service.searchEnglish("");

      expect(result.edges).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(translationQueryBuilder.getQuery).not.toHaveBeenCalled();
    });

    it("excludes proper nouns and caps the matches in the database", async () => {
      expect.hasAssertions();

      const { service, translationQueryBuilder } = createSearchService();

      await service.searchEnglish("Rome");

      expect(translationQueryBuilder.andWhere).toHaveBeenCalledWith(
        "translatedLexeme.partOfSpeech <> :properNoun",
      );
      expect(translationQueryBuilder.setParameters).toHaveBeenCalledWith(
        expect.objectContaining({ properNoun: "properNoun" }),
      );
      expect(translationQueryBuilder.limit).toHaveBeenCalledWith(
        ENGLISH_SEARCH_RESULT_LIMIT,
      );
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
