import { Inject } from "@nestjs/common";
import {
  Args as Arguments,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";

import { mapConnection } from "../../lexico-api.utilities";
import { PaginationArguments } from "../search/pagination-arguments.entities";

import { AuthorArguments } from "./author-argument.entities";
import { AuthorType } from "./author.entities";
import { AuthorConnectionType } from "./literature-connection.entities";
import { LiteratureService } from "./literature.service";
import { toAuthorType, toTextType } from "./literature.utilities";
import { SearchAuthorsArguments } from "./search-authors-arguments.entities";
import { TextType } from "./text.entities";

import type { Connection } from "../../lexico-api.types";

/**
 * GraphQL resolver for Authors.
 */
@Resolver(() => AuthorType)
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
  @Query(() => AuthorType, { name: "author", nullable: true })
  public async author(
    @Arguments() arguments_: AuthorArguments,
  ): Promise<AuthorType | null> {
    const resolvedId = arguments_.lookup?.id ?? arguments_.id;
    const resolvedSlug = arguments_.lookup?.slug ?? arguments_.slug;

    if (!resolvedId && !resolvedSlug) {
      return null;
    }

    const author = await this.literatureService.findAuthorByLookup(
      resolvedId,
      resolvedSlug,
    );
    return author === null ? null : toAuthorType(author);
  }

  /**
   * Lists authors with Relay pagination.
   */
  @Query(() => AuthorConnectionType, { name: "authors" })
  public async authors(
    @Arguments() arguments_: PaginationArguments,
  ): Promise<Connection<AuthorType>> {
    return mapConnection(
      await this.literatureService.listAuthorsConnection(arguments_),
      toAuthorType,
    );
  }

  /** Resolves the text list associated with an author. */
  @ResolveField(() => [TextType], { name: "texts" })
  public async resolveAuthorTexts(
    @Parent() author: AuthorType,
  ): Promise<TextType[]> {
    const texts = await this.literatureService.listTexts(author.id);
    return texts.map((text) => toTextType(text));
  }

  // 🖋️ Mutations

  // 🔗 Relations

  /** Searches authors by name or slug. */
  @Query(() => AuthorConnectionType, { name: "searchAuthors" })
  public async searchAuthors(
    @Arguments() arguments_: SearchAuthorsArguments,
  ): Promise<Connection<AuthorType>> {
    return mapConnection(
      await this.literatureService.searchAuthors(arguments_.query, arguments_),
      toAuthorType,
    );
  }
}
