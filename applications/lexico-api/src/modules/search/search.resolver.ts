import { Inject } from "@nestjs/common";
import { Args as Arguments, Query, Resolver } from "@nestjs/graphql";

import { SearchEnglishArguments } from "./search-english-arguments.entities";
import { SearchLatinArguments } from "./search-latin-arguments.entities";
import { LexemeSearchConnection, LexemeSearchResult } from "./search.entities";
import { SearchService } from "./search.service";

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
    description:
      "Performs English definition and translation search with relevance ranking.",
    name: "searchEnglish",
  })
  public async searchEnglish(
    @Arguments() arguments_: SearchEnglishArguments,
  ): Promise<Connection<LexemeSearchResult>> {
    return this.searchService.searchEnglish(arguments_.query, arguments_);
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
    return this.searchService.searchLatin(arguments_.query, arguments_);
  }

  // 🖋️ Mutations

  // 🔗 Relations
}
