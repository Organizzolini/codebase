/* cspell:words FULLTEXT ILIKE */

import { Injectable } from "@nestjs/common";

import {
  InjectRepository,
  Lexeme,
  type Repository,
  Translation,
  Word,
} from "@codebase/lexico-entities";

import {
  createConnection,
  paginateArray,
  toCursor,
} from "../../lexico-api.utilities";

import {
  SCORE_FUZZY,
  SCORE_LEMMA_EXACT,
  SCORE_PREFIX,
  SCORE_WORD_EXACT,
} from "./search.constants";
import { type LexemeSearchResult, SearchMatchSource } from "./search.entities";
import {
  calculateEnglishMatchScore,
  decomposeEnclitic,
  formatFormIdentifier,
  mergeSearchResult,
} from "./search.utilities";

import type { Connection } from "../../lexico-api.types";
import type {
  EncliticDecompositionResult,
  SearchCursorPayload,
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
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Queries exact matching dictionary headwords.
   */
  private async findExactLemmas(
    searchTerms: Set<string>,
    decomposition: EncliticDecompositionResult,
    resultsMap: Map<string, LexemeSearchResult>,
  ): Promise<void> {
    for (const term of searchTerms) {
      const exactLemmas = await this.lexemeRepository
        .createQueryBuilder("lexeme")
        .leftJoinAndSelect("lexeme.forms", "forms")
        .leftJoinAndSelect("lexeme.inflection", "inflection")
        .leftJoinAndSelect("lexeme.principalParts", "principalParts")
        .leftJoinAndSelect("lexeme.pronunciations", "pronunciations")
        .leftJoinAndSelect("lexeme.translations", "translations")
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
        const fuzzyLemmas = await this.lexemeRepository
          .createQueryBuilder("lexeme")
          .leftJoinAndSelect("lexeme.forms", "forms")
          .leftJoinAndSelect("lexeme.inflection", "inflection")
          .leftJoinAndSelect("lexeme.principalParts", "principalParts")
          .leftJoinAndSelect("lexeme.pronunciations", "pronunciations")
          .leftJoinAndSelect("lexeme.translations", "translations")
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
      const prefixLemmas = await this.lexemeRepository
        .createQueryBuilder("lexeme")
        .leftJoinAndSelect("lexeme.forms", "forms")
        .leftJoinAndSelect("lexeme.inflection", "inflection")
        .leftJoinAndSelect("lexeme.principalParts", "principalParts")
        .leftJoinAndSelect("lexeme.pronunciations", "pronunciations")
        .leftJoinAndSelect("lexeme.translations", "translations")
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
   * Deterministically orders and paginates aggregated search result entries.
   */
  private paginateSearchResults(
    resultsMap: Map<string, LexemeSearchResult>,
    options?: SearchPaginationOptions,
  ): Connection<LexemeSearchResult> {
    const allResults = [...resultsMap.values()].toSorted((a, b) => {
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
    const cleanQuery = query.trim().toLowerCase();
    if (cleanQuery.length === 0) {
      return createConnection<LexemeSearchResult>({
        edges: [],
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: 0,
      });
    }

    const translations = await this.translationRepository
      .createQueryBuilder("translation")
      .leftJoinAndSelect("translation.lexeme", "lexeme")
      .leftJoinAndSelect("lexeme.forms", "forms")
      .leftJoinAndSelect("lexeme.inflection", "inflection")
      .leftJoinAndSelect("lexeme.principalParts", "principalParts")
      .leftJoinAndSelect("lexeme.pronunciations", "pronunciations")
      .leftJoinAndSelect("lexeme.translations", "translations")
      .where(
        "LOWER(translation.data) = :exactQuery OR translation.data ILIKE :prefixQuery OR translation.data ILIKE :subQuery OR to_tsvector('english', translation.data) @@ plainto_tsquery('english', :rawQuery)",
        {
          exactQuery: cleanQuery,
          prefixQuery: `${cleanQuery}%`,
          rawQuery: query,
          subQuery: `%${cleanQuery}%`,
        },
      )
      .getMany();

    const resultsMap = new Map<string, LexemeSearchResult>();
    for (const translation of translations) {
      const score = calculateEnglishMatchScore(translation.data, cleanQuery);
      mergeSearchResult(resultsMap, {
        enclitic: null,
        identifiers: [],
        lexeme: translation.lexeme,
        score,
        source: SearchMatchSource.TRANSLATION_FULLTEXT,
      });
    }

    return this.paginateSearchResults(resultsMap, options);
  }

  /**
   * Performs tiered Latin dictionary search with enclitic parsing and fuzzy matching.
   */
  public async searchLatin(
    query: string,
    options?: SearchPaginationOptions,
  ): Promise<Connection<LexemeSearchResult>> {
    const cleanQuery = query.trim().toLowerCase();
    if (cleanQuery.length === 0) {
      return createConnection<LexemeSearchResult>({
        edges: [],
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: 0,
      });
    }

    const decomposition = decomposeEnclitic(cleanQuery);
    const searchTerms = new Set(
      [cleanQuery, decomposition.stem].filter(Boolean),
    );
    const resultsMap = new Map<string, LexemeSearchResult>();

    await this.findExactLemmas(searchTerms, decomposition, resultsMap);
    await this.findWordMatches(searchTerms, decomposition, resultsMap);
    await this.findPrefixLemmas(searchTerms, resultsMap);
    await this.findFuzzyLemmas(searchTerms, resultsMap);

    return this.paginateSearchResults(resultsMap, options);
  }
}
