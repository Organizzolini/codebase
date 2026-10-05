/* cspell:words FULLTEXT ILIKE */

import { performance } from "node:perf_hooks";

import { Injectable } from "@nestjs/common";

import {
  InjectRepository,
  Lexeme,
  type Repository,
  Translation,
  Word,
} from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import {
  createConnection,
  paginateArray,
  toCursor,
} from "../../lexico-api.utilities";
import { MacronsService } from "../macrons/macrons.service";

import {
  ENGLISH_MATCH_SCORE_EXPRESSION,
  ENGLISH_SEARCH_RESULT_LIMIT,
  SCORE_ENCLITIC,
  SCORE_FUZZY,
  SCORE_LEMMA_EXACT,
  SCORE_PREFIX,
  SCORE_WORD_EXACT,
} from "./search.constants";
import { type LexemeSearchResult, SearchMatchSource } from "./search.entities";
import {
  decomposeEnclitic,
  formatFormIdentifier,
  hasTranslations,
  mergeSearchResult,
} from "./search.utilities";

import type { Connection } from "../../lexico-api.types";
import type {
  EncliticDecompositionResult,
  EnglishSearchMatch,
  SearchCursorPayload,
  SearchLogEntry,
  SearchPaginationOptions,
} from "./search.types";
/**
 * Service providing dictionary search across Latin forms and English translations.
 */
@Injectable()
export class SearchService {
  // 🏗 Dependency Injection

  public constructor(
    @InjectRepository(Lexeme)
    private readonly lexemeRepository: Repository<Lexeme>,
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
    @InjectRepository(Translation)
    private readonly translationRepository: Repository<Translation>,
    private readonly macronsService: MacronsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(SearchService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Creates a lexeme query joining every relation a search result returns.
   */
  private createLexemeQuery(): ReturnType<
    Repository<Lexeme>["createQueryBuilder"]
  > {
    return this.lexemeRepository
      .createQueryBuilder("lexeme")
      .leftJoinAndSelect("lexeme.forms", "forms")
      .leftJoinAndSelect("lexeme.inflection", "inflection")
      .leftJoinAndSelect("lexeme.principalParts", "principalParts")
      .leftJoinAndSelect("lexeme.pronunciations", "pronunciations")
      .leftJoinAndSelect("lexeme.translations", "translations");
  }

  /**
   * Adds the dictionary entry for a separated enclitic, such as `-que`, once
   * the stem it was split from matched a headword or an inflected form.
   */
  private async findEncliticLexemes(
    decomposition: EncliticDecompositionResult,
    resultsMap: Map<string, LexemeSearchResult>,
  ): Promise<void> {
    const { enclitic } = decomposition;
    if (!enclitic) {
      return;
    }

    const isStemMatched = [...resultsMap.values()].some(
      (result) => result.enclitic === enclitic && hasTranslations(result),
    );
    if (!isStemMatched) {
      return;
    }

    const encliticLexemes = await this.createLexemeQuery()
      .where("LOWER(lexeme.lemma) = :lemma", { lemma: `-${enclitic}` })
      .getMany();

    for (const lexeme of encliticLexemes) {
      mergeSearchResult(resultsMap, {
        enclitic: null,
        identifiers: [],
        lexeme,
        score: SCORE_ENCLITIC,
        source: SearchMatchSource.ENCLITIC,
      });
    }
  }

  /**
   * Ranks lexemes by their best-matching translation in the database, excluding
   * proper nouns, and returns at most `ENGLISH_SEARCH_RESULT_LIMIT` of them.
   */
  private async findEnglishMatches(
    query: string,
    cleanQuery: string,
  ): Promise<EnglishSearchMatch[]> {
    const rows = await this.translationRepository
      .createQueryBuilder("translation")
      .innerJoin("translation.lexeme", "lexeme")
      .select("lexeme.id", "lexemeId")
      .addSelect(`MAX(${ENGLISH_MATCH_SCORE_EXPRESSION})`, "score")
      .where(
        "(LOWER(translation.data) = :exactQuery OR translation.data ILIKE :prefixQuery OR translation.data ILIKE :subQuery OR to_tsvector('english', translation.data) @@ plainto_tsquery('english', :rawQuery))",
      )
      .andWhere("lexeme.partOfSpeech <> :properNoun")
      .setParameters({
        exactQuery: cleanQuery,
        prefixQuery: `${cleanQuery}%`,
        properNoun: "properNoun",
        rawQuery: query,
        subQuery: `%${cleanQuery}%`,
      })
      .groupBy("lexeme.id")
      .orderBy("score", "DESC")
      .addOrderBy("lexeme.id", "ASC")
      .limit(ENGLISH_SEARCH_RESULT_LIMIT)
      .getRawMany<{ lexemeId: string; score: number | string }>();

    return rows.map((row) => ({
      lexemeId: row.lexemeId,
      score: Number(row.score),
    }));
  }

  /**
   * Queries exact matching dictionary headwords.
   */
  private async findExactLemmas(
    searchTerms: Set<string>,
    decomposition: EncliticDecompositionResult,
    resultsMap: Map<string, LexemeSearchResult>,
  ): Promise<void> {
    for (const term of searchTerms) {
      const exactLemmas = await this.createLexemeQuery()
        .where("LOWER(lexeme.lemma) = :term", { term })
        .getMany();

      for (const lexeme of exactLemmas) {
        mergeSearchResult(resultsMap, {
          enclitic: term === decomposition.stem ? decomposition.enclitic : null,
          identifiers: [],
          lexeme,
          score: SCORE_LEMMA_EXACT,
          source: SearchMatchSource.LEMMA_EXACT,
        });
      }
    }
  }

  /**
   * Queries approximate/fuzzy headwords using substring matching.
   */
  private async findFuzzyLemmas(
    searchTerms: Set<string>,
    resultsMap: Map<string, LexemeSearchResult>,
  ): Promise<void> {
    for (const term of searchTerms) {
      if (term.length >= 3) {
        const fuzzyLemmas = await this.createLexemeQuery()
          .where("lexeme.lemma ILIKE :fuzzy", { fuzzy: `%${term}%` })
          .take(50)
          .getMany();

        for (const lexeme of fuzzyLemmas) {
          mergeSearchResult(resultsMap, {
            enclitic: null,
            identifiers: [],
            lexeme,
            score: SCORE_FUZZY,
            source: SearchMatchSource.FUZZY,
          });
        }
      }
    }
  }

  /**
   * Queries prefix matches against dictionary headwords.
   */
  private async findPrefixLemmas(
    searchTerms: Set<string>,
    resultsMap: Map<string, LexemeSearchResult>,
  ): Promise<void> {
    for (const term of searchTerms) {
      const prefixLemmas = await this.createLexemeQuery()
        .where("lexeme.lemma ILIKE :prefix", { prefix: `${term}%` })
        .take(50)
        .getMany();

      for (const lexeme of prefixLemmas) {
        mergeSearchResult(resultsMap, {
          enclitic: null,
          identifiers: [],
          lexeme,
          score: SCORE_PREFIX,
          source: SearchMatchSource.PREFIX,
        });
      }
    }
  }

  /**
   * Queries exact inflected word forms and maps their morphological identifiers.
   */
  private async findWordMatches(
    searchTerms: Set<string>,
    decomposition: EncliticDecompositionResult,
    resultsMap: Map<string, LexemeSearchResult>,
  ): Promise<void> {
    for (const term of searchTerms) {
      const words = await this.wordRepository
        .createQueryBuilder("word")
        .leftJoinAndSelect("word.wordForms", "wordForms")
        .leftJoinAndSelect("wordForms.form", "form")
        .leftJoinAndSelect("word.wordLexemes", "wordLexemes")
        .leftJoinAndSelect("wordLexemes.lexeme", "lexeme")
        .leftJoinAndSelect("lexeme.forms", "forms")
        .leftJoinAndSelect("lexeme.inflection", "inflection")
        .leftJoinAndSelect("lexeme.principalParts", "principalParts")
        .leftJoinAndSelect("lexeme.pronunciations", "pronunciations")
        .leftJoinAndSelect("lexeme.translations", "translations")
        .where("LOWER(word.data) = :term", { term })
        .getMany();

      for (const word of words) {
        const identifiers = word.wordForms
          .map((wf) => formatFormIdentifier(wf.form))
          .filter((id): id is string => typeof id === "string");

        for (const wl of word.wordLexemes) {
          mergeSearchResult(resultsMap, {
            enclitic:
              term === decomposition.stem ? decomposition.enclitic : null,
            identifiers,
            lexeme: wl.lexeme,
            score: SCORE_WORD_EXACT,
            source: SearchMatchSource.WORD_EXACT,
          });
        }
      }
    }
  }

  /**
   * Logs one completed search with its response time and the lexemes it returned.
   */
  private logSearch({
    connection,
    language,
    query,
    startTime,
  }: SearchLogEntry): void {
    this.logger.info("🔎 Searched dictionary", undefined, {
      language,
      lexemeIds: connection.edges.map((edge) => edge.node.lexeme.id),
      query,
      responseTime: Math.round(performance.now() - startTime),
      totalCount: connection.totalCount,
    });
  }

  /**
   * Deterministically orders and paginates aggregated search results.
   */
  private paginateSearchResults(
    results: LexemeSearchResult[],
    options?: SearchPaginationOptions,
  ): Connection<LexemeSearchResult> {
    const allResults = results.toSorted((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.lexeme.id.localeCompare(b.lexeme.id);
    });

    const paginated = paginateArray(allResults, {
      after: options?.after,
      before: options?.before,
      first: options?.first,
      getCursor: (item) =>
        toCursor({
          id: item.lexeme.id,
          score: item.score,
        } satisfies SearchCursorPayload),
      last: options?.last,
    });

    return createConnection<LexemeSearchResult>({
      edges: paginated.edges,
      hasNextPage: paginated.hasNextPage,
      hasPreviousPage: paginated.hasPreviousPage,
      totalCount: allResults.length,
    });
  }

  // 🌎 Public Methods

  /**
   * Searches English translations and definitions using full-text and substring matching.
   */
  public async searchEnglish(
    query: string,
    options?: SearchPaginationOptions,
  ): Promise<Connection<LexemeSearchResult>> {
    const startTime = performance.now();
    const cleanQuery = query.trim().toLowerCase();
    if (cleanQuery.length === 0) {
      return this.paginateSearchResults([], options);
    }

    const matches = await this.findEnglishMatches(query, cleanQuery);
    const lexemes =
      matches.length === 0
        ? []
        : await this.createLexemeQuery()
            .where("lexeme.id IN (:...lexemeIds)", {
              lexemeIds: matches.map((match) => match.lexemeId),
            })
            .getMany();
    const lexemesById = new Map(lexemes.map((lexeme) => [lexeme.id, lexeme]));

    const results = matches.flatMap((match): LexemeSearchResult[] => {
      const lexeme = lexemesById.get(match.lexemeId);
      return lexeme
        ? [
            {
              enclitic: null,
              identifiers: [],
              lexeme,
              score: match.score,
              source: SearchMatchSource.TRANSLATION_FULLTEXT,
            },
          ]
        : [];
    });

    const connection = this.paginateSearchResults(results, options);
    this.logSearch({ connection, language: "english", query, startTime });
    return connection;
  }

  /**
   * Performs tiered Latin dictionary search with enclitic parsing and fuzzy matching.
   */
  public async searchLatin(
    query: string,
    options?: SearchPaginationOptions,
  ): Promise<Connection<LexemeSearchResult>> {
    const startTime = performance.now();
    const cleanQuery = this.macronsService
      .removeMacrons(query)
      .trim()
      .toLowerCase();
    if (cleanQuery.length === 0) {
      return this.paginateSearchResults([], options);
    }

    const decomposition = decomposeEnclitic(cleanQuery);
    const searchTerms = new Set(
      [cleanQuery, decomposition.stem].filter(Boolean),
    );
    const resultsMap = new Map<string, LexemeSearchResult>();

    await this.findExactLemmas(searchTerms, decomposition, resultsMap);
    await this.findWordMatches(searchTerms, decomposition, resultsMap);
    await this.findEncliticLexemes(decomposition, resultsMap);
    await this.findPrefixLemmas(searchTerms, resultsMap);
    await this.findFuzzyLemmas(searchTerms, resultsMap);

    const translatedResults = [...resultsMap.values()].filter((result) =>
      hasTranslations(result),
    );

    const connection = this.paginateSearchResults(translatedResults, options);
    this.logSearch({ connection, language: "latin", query, startTime });
    return connection;
  }
}
