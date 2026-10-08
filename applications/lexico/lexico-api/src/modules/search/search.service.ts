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

import { mapConnection, toCursor } from "../../lexico-api.utilities";
import {
  createEmptyConnection,
  paginateQuery,
} from "../literature/literature.utilities";
import { MacronsService } from "../macrons/macrons.service";

import {
  ENGLISH_MATCH_SCORE_EXPRESSION,
  ENGLISH_SEARCH_RESULT_LIMIT,
  LATIN_TIER_RESULT_LIMIT,
  SCORE_ENCLITIC,
  SCORE_FUZZY,
  SCORE_LEMMA_EXACT,
  SCORE_PREFIX,
  SCORE_WORD_EXACT,
} from "./search.constants";
import { SearchMatchSource } from "./search.entities";
import {
  decomposeEnclitic,
  formatFormIdentifier,
  readSearchCursor,
  toLatinMatchSource,
  toRankedScore,
} from "./search.utilities";

import type { Connection } from "../../lexico-api.types";
import type {
  EncliticDecompositionResult,
  LexemeSearchMatch,
  RankedLexemeMatch,
  RankedLexemeQuery,
  ScoredLexeme,
  SearchCursorPayload,
  SearchLogEntry,
  SearchPaginationOptions,
} from "./search.types";

/**
 * Service providing dictionary search across Latin forms and English translations.
 * Every tier is ranked in SQL, and only the requested page of lexemes is ever
 * loaded: the ranking orders by score and then id, and pages by keyset.
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
   * Describes each Latin match on a page the way merging its tiers would: the
   * morphological identifiers of every matched word that inflects it, and the
   * split-off enclitic when its stem matched a headword or an inflected word.
   */
  private async describeLatinMatches(
    scored: readonly ScoredLexeme[],
    search: {
      decomposition: EncliticDecompositionResult;
      terms: readonly string[];
    },
  ): Promise<LexemeSearchMatch[]> {
    const { enclitic, stem } = search.decomposition;
    if (scored.length === 0) {
      return [];
    }
    const words = await this.wordRepository
      .createQueryBuilder("word")
      .leftJoinAndSelect("word.wordForms", "wordForms")
      .leftJoinAndSelect("wordForms.form", "form")
      .innerJoinAndSelect("word.wordLexemes", "wordLexemes")
      .innerJoinAndSelect("wordLexemes.lexeme", "linkedLexeme")
      .where("LOWER(word.data) IN (:...latinTerms)", {
        latinTerms: [...search.terms],
      })
      .andWhere("linkedLexeme.id IN (:...lexemeIds)", {
        lexemeIds: scored.map(({ lexeme }) => lexeme.id),
      })
      .getMany();

    const identifiers = new Map<string, Set<string>>();
    for (const term of search.terms) {
      for (const word of words.filter(
        (candidate) => candidate.data.toLowerCase() === term,
      )) {
        const wordIdentifiers = word.wordForms
          .map((wordForm) => formatFormIdentifier(wordForm.form))
          .filter((identifier) => typeof identifier === "string");
        for (const { lexeme } of word.wordLexemes) {
          const merged = identifiers.get(lexeme.id) ?? new Set<string>();
          wordIdentifiers.forEach((identifier) => merged.add(identifier));
          identifiers.set(lexeme.id, merged);
        }
      }
    }
    const stemMatched = new Set([
      ...scored
        .filter(({ lexeme }) => lexeme.lemma.toLowerCase() === stem)
        .map(({ lexeme }) => lexeme.id),
      ...words
        .filter((word) => word.data.toLowerCase() === stem)
        .flatMap((word) => word.wordLexemes.map(({ lexeme }) => lexeme.id)),
    ]);

    return scored.map(({ lexeme, score }) => ({
      enclitic: stemMatched.has(lexeme.id) ? enclitic : null,
      identifiers: [...(identifiers.get(lexeme.id) ?? [])],
      lexeme,
      score,
      source: toLatinMatchSource(score),
    }));
  }

  /**
   * Selects the lexemes whose headword is one of the terms, or one of whose
   * inflected words is, as SQL yielding a `lexemeId` column.
   */
  private headwordOrWordMatches(
    alias: string,
    termsParameter: string,
  ): string[] {
    return [
      this.lexemeRepository
        .createQueryBuilder(`${alias}Headword`)
        .select(`${alias}Headword.id`, "lexemeId")
        .where(`LOWER(${alias}Headword.lemma) IN (:...${termsParameter})`)
        .getQuery(),
      this.wordRepository
        .createQueryBuilder(`${alias}Word`)
        .innerJoin(`${alias}Word.wordLexemes`, `${alias}Link`)
        .innerJoin(`${alias}Link.lexeme`, `${alias}Lexeme`)
        .select(`${alias}Lexeme.id`, "lexemeId")
        .where(`LOWER(${alias}Word.data) IN (:...${termsParameter})`)
        .getQuery(),
    ];
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
   * Pages ranked lexemes in SQL, best score first and then by id: the ranking
   * is joined to the lexemes, the cursors bound its negated score and id, and
   * only the page's lexemes are loaded and described.
   */
  private async paginateRankedLexemes(
    ranked: RankedLexemeQuery,
    options: SearchPaginationOptions | undefined,
    describe: (
      scored: ScoredLexeme[],
    ) => LexemeSearchMatch[] | Promise<LexemeSearchMatch[]>,
  ): Promise<Connection<LexemeSearchMatch>> {
    const connection = await paginateQuery<RankedLexemeMatch, Lexeme>(
      {
        cursor: {
          decode: readSearchCursor,
          encode: (position) =>
            toCursor({
              id: position.id,
              score: toRankedScore(position.key),
            } satisfies SearchCursorPayload),
        },
        filter: () =>
          this.lexemeRepository
            .createQueryBuilder("lexeme")
            .innerJoin(
              `(${ranked.sql})`,
              "ranked",
              `ranked."lexemeId" = lexeme.id`,
            )
            .setParameters(ranked.parameters),
        load: async (ids, keys) => {
          const lexemes = await this.createLexemeQuery()
            .where("lexeme.id IN (:...lexemeIds)", { lexemeIds: ids })
            .getMany();
          const matches = await describe(
            lexemes.map((lexeme) => ({
              lexeme,
              score: toRankedScore(keys.get(lexeme.id)),
            })),
          );
          return matches.map((match) => ({ ...match, id: match.lexeme.id }));
        },
        sortKey: "-ranked.score",
      },
      {
        after: options?.after ?? null,
        before: options?.before ?? null,
        first: options?.first ?? null,
        last: options?.last ?? null,
      },
    );

    return mapConnection(
      connection,
      ({ enclitic, identifiers, lexeme, score, source }) => ({
        enclitic,
        identifiers,
        lexeme,
        score,
        source,
      }),
    );
  }

  /**
   * Ranks lexemes by their best-matching translation, excluding proper nouns,
   * keeping at most `ENGLISH_SEARCH_RESULT_LIMIT` of them.
   */
  private rankEnglishMatches(
    query: string,
    cleanQuery: string,
  ): RankedLexemeQuery {
    const ranked = this.translationRepository
      .createQueryBuilder("translation")
      .innerJoin("translation.lexeme", "translatedLexeme")
      .select("translatedLexeme.id", "lexemeId")
      .addSelect(`MAX(${ENGLISH_MATCH_SCORE_EXPRESSION})`, "score")
      .where(
        "(LOWER(translation.data) = :exactQuery OR translation.data ILIKE :prefixQuery OR translation.data ILIKE :subQuery OR to_tsvector('english', translation.data) @@ plainto_tsquery('english', :rawQuery))",
      )
      .andWhere("translatedLexeme.partOfSpeech <> :properNoun")
      .setParameters({
        exactQuery: cleanQuery,
        prefixQuery: `${cleanQuery}%`,
        properNoun: "properNoun",
        rawQuery: query,
        subQuery: `%${cleanQuery}%`,
      })
      .groupBy("translatedLexeme.id")
      .orderBy("score", "DESC")
      .addOrderBy("translatedLexeme.id", "ASC")
      .limit(ENGLISH_SEARCH_RESULT_LIMIT);

    return { parameters: ranked.getParameters(), sql: ranked.getQuery() };
  }

  /**
   * Ranks every Latin tier at once: exact headwords, inflected words, the
   * enclitic's own entry once its stem matched a translated lexeme, and the
   * first `LATIN_TIER_RESULT_LIMIT` lexemes by id each prefix and substring
   * matches. A lexeme keeps its best tier's score, and one with no
   * translation is dropped.
   */
  private rankLatinMatches(
    terms: readonly string[],
    decomposition: EncliticDecompositionResult,
  ): RankedLexemeQuery {
    const parameters: Record<string, unknown> = {
      latinStem: [decomposition.stem],
      latinTerms: [...terms],
    };
    const [headwords = "", words = ""] = this.headwordOrWordMatches(
      "match",
      "latinTerms",
    );
    const tiers = [
      `SELECT "headwordMatch"."lexemeId", ${String(SCORE_LEMMA_EXACT)} AS "score" FROM (${headwords}) "headwordMatch"`,
      `SELECT "wordMatch"."lexemeId", ${String(SCORE_WORD_EXACT)} AS "score" FROM (${words}) "wordMatch"`,
    ];

    if (decomposition.enclitic !== null) {
      parameters["encliticLemma"] = `-${decomposition.enclitic}`;
      tiers.push(
        this.lexemeRepository
          .createQueryBuilder("encliticLexeme")
          .select("encliticLexeme.id", "lexemeId")
          .addSelect(String(SCORE_ENCLITIC), "score")
          .where("LOWER(encliticLexeme.lemma) = :encliticLemma")
          .andWhere(
            `EXISTS (SELECT 1 FROM (${this.headwordOrWordMatches("stem", "latinStem").join(" UNION ALL ")}) "stemMatch" WHERE ${this.translatedCondition(`"stemMatch"."lexemeId"`)})`,
          )
          .getQuery(),
      );
    }

    for (const [index, term] of terms.entries()) {
      parameters[`latinPrefix${String(index)}`] = `${term}%`;
      tiers.push(
        this.rankLemmaPattern(`latinPrefix${String(index)}`, SCORE_PREFIX),
      );
      if (term.length >= 3) {
        parameters[`latinFuzzy${String(index)}`] = `%${term}%`;
        tiers.push(
          this.rankLemmaPattern(`latinFuzzy${String(index)}`, SCORE_FUZZY),
        );
      }
    }

    return {
      parameters,
      sql: `SELECT "candidate"."lexemeId" AS "lexemeId", MAX("candidate"."score") AS "score" FROM (${tiers.map((tier) => `(${tier})`).join(" UNION ALL ")}) "candidate" WHERE ${this.translatedCondition(`"candidate"."lexemeId"`)} GROUP BY "candidate"."lexemeId"`,
    };
  }

  /**
   * Ranks the first `LATIN_TIER_RESULT_LIMIT` lexemes by id whose headword
   * matches a pattern parameter, all at one score.
   */
  private rankLemmaPattern(patternParameter: string, score: number): string {
    const alias = `${patternParameter}Lexeme`;
    return this.lexemeRepository
      .createQueryBuilder(alias)
      .select(`${alias}.id`, "lexemeId")
      .addSelect(String(score), "score")
      .where(`${alias}.lemma ILIKE :${patternParameter}`)
      .orderBy(`${alias}.id`, "ASC")
      .limit(LATIN_TIER_RESULT_LIMIT)
      .getQuery();
  }

  /** A condition holding when the lexeme in a column has a translation. */
  private translatedCondition(column: string): string {
    return `EXISTS (${this.translationRepository
      .createQueryBuilder("ownTranslation")
      .select("1")
      .where(`ownTranslation.lexeme_id = ${column}`)
      .getQuery()})`;
  }

  // 🌎 Public Methods

  /**
   * Searches English translations and definitions using full-text and substring matching.
   */
  public async searchEnglish(
    query: string,
    options?: SearchPaginationOptions,
  ): Promise<Connection<LexemeSearchMatch>> {
    const startTime = performance.now();
    const cleanQuery = query.trim().toLowerCase();
    if (cleanQuery.length === 0) {
      return createEmptyConnection<LexemeSearchMatch>();
    }

    const connection = await this.paginateRankedLexemes(
      this.rankEnglishMatches(query, cleanQuery),
      options,
      (scored) =>
        scored.map(({ lexeme, score }) => ({
          enclitic: null,
          identifiers: [],
          lexeme,
          score,
          source: SearchMatchSource.TRANSLATION_FULLTEXT,
        })),
    );
    this.logSearch({ connection, language: "english", query, startTime });
    return connection;
  }

  /**
   * Performs tiered Latin dictionary search with enclitic parsing and fuzzy matching.
   */
  public async searchLatin(
    query: string,
    options?: SearchPaginationOptions,
  ): Promise<Connection<LexemeSearchMatch>> {
    const startTime = performance.now();
    const cleanQuery = this.macronsService
      .removeMacrons(query)
      .trim()
      .toLowerCase();
    if (cleanQuery.length === 0) {
      return createEmptyConnection<LexemeSearchMatch>();
    }

    const decomposition = decomposeEnclitic(cleanQuery);
    const terms = [
      ...new Set([cleanQuery, decomposition.stem].filter(Boolean)),
    ];
    const connection = await this.paginateRankedLexemes(
      this.rankLatinMatches(terms, decomposition),
      options,
      async (scored) =>
        this.describeLatinMatches(scored, { decomposition, terms }),
    );
    this.logSearch({ connection, language: "latin", query, startTime });
    return connection;
  }
}
