import { Inject } from "@nestjs/common";
import { Args as Arguments, Query, Resolver } from "@nestjs/graphql";

import { mapConnection } from "../../lexico-api.utilities";

import { SearchEnglishArguments } from "./search-english-arguments.entities";
import { SearchLatinArguments } from "./search-latin-arguments.entities";
import { ENGLISH_SEARCH_RESULT_LIMIT } from "./search.constants";
import { LexemeSearchConnection, LexemeSearchResult } from "./search.entities";
import { SearchService } from "./search.service";
import { toLexemeSearchResult } from "./search.utilities";

import type { Connection } from "../../lexico-api.types";

/**
 * GraphQL resolver exposing Latin and English dictionary search queries.
 */
@Resolver()
export class SearchResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(SearchService) private readonly searchService: SearchService,
  ) {}

  // 🔎 Queries

  /**
   * Searches English definitions and translations using full-text and substring matching.
   */
  @Query(() => LexemeSearchConnection, {
    description: `Performs English definition and translation search with relevance ranking, returning at most the ${ENGLISH_SEARCH_RESULT_LIMIT} best-ranked lexemes.`,
    name: "searchEnglish",
  })
  public async searchEnglish(
    @Arguments() arguments_: SearchEnglishArguments,
  ): Promise<Connection<LexemeSearchResult>> {
    return mapConnection(
      await this.searchService.searchEnglish(arguments_.query, arguments_),
      toLexemeSearchResult,
    );
  }

  /**
   * Searches Latin lemmas and inflected forms with enclitic parsing and fuzzy matching.
   */
  @Query(() => LexemeSearchConnection, {
    description:
      "Performs tiered Latin dictionary search across exact headwords, inflected forms, prefixes, and fuzzy matches.",
    name: "searchLatin",
  })
  public async searchLatin(
    @Arguments() arguments_: SearchLatinArguments,
  ): Promise<Connection<LexemeSearchResult>> {
    return mapConnection(
      await this.searchService.searchLatin(arguments_.query, arguments_),
      toLexemeSearchResult,
    );
  }

  // 🖋️ Mutations

  // 🔗 Relations
}
