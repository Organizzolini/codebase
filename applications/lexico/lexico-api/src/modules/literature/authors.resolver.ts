import { Inject } from "@nestjs/common";
import {
  Args as Arguments,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";

import { Author, Text } from "@codebase/lexico-entities";

import { PaginationArguments } from "../search/pagination-arguments.entities";

import { AuthorArguments } from "./author-argument.entities";
import { AuthorConnectionType } from "./literature-connection.entities";
import { LiteratureService } from "./literature.service";
import { SearchAuthorsArguments } from "./search-authors-arguments.entities";

import type { Connection } from "../../lexico-api.types";

/**
 * GraphQL resolver for Authors.
 */
@Resolver(() => Author)
export class AuthorsResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(LiteratureService)
    private readonly literatureService: LiteratureService,
  ) {}

  // 🔎 Queries

  /**
   * Finds an author by ID or slug.
   */
  @Query(() => Author, { name: "author", nullable: true })
  public async author(
    @Arguments() arguments_: AuthorArguments,
  ): Promise<Author | null> {
    const resolvedId = arguments_.lookup?.id ?? arguments_.id;
    const resolvedSlug = arguments_.lookup?.slug ?? arguments_.slug;

    if (!resolvedId && !resolvedSlug) {
      return null;
    }

    return this.literatureService.findAuthorByLookup(resolvedId, resolvedSlug);
  }

  /**
   * Lists authors with Relay pagination.
   */
  @Query(() => AuthorConnectionType, { name: "authors" })
  public async authors(
    @Arguments() arguments_: PaginationArguments,
  ): Promise<Connection<Author>> {
    return this.literatureService.listAuthorsConnection(arguments_);
  }

  /** Resolves the text list associated with an author. */
  @ResolveField(() => [Text], { name: "texts" })
  public async resolveAuthorTexts(@Parent() author: Author): Promise<Text[]> {
    return this.literatureService.listTexts(author.id);
  }

  // 🖋️ Mutations

  // 🔗 Relations

  /** Searches authors by name or slug. */
  @Query(() => AuthorConnectionType, { name: "searchAuthors" })
  public async searchAuthors(
    @Arguments() arguments_: SearchAuthorsArguments,
  ): Promise<Connection<Author>> {
    return this.literatureService.searchAuthors(arguments_.query, arguments_);
  }
}
