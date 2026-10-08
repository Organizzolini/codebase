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
import {
  AuthorConnectionType,
  TextConnectionType,
} from "./literature-connection.entities";
import { LiteratureRelationsLoader } from "./literature-relations.loader";
import { LiteratureService } from "./literature.service";
import { toAuthorType, toTextType } from "./literature.utilities";
import { SearchAuthorsArguments } from "./search-authors-arguments.entities";

import type { Connection } from "../../lexico-api.types";
import type { TextType } from "./text.entities";

/**
 * GraphQL resolver for Authors.
 */
@Resolver(() => AuthorType)
export class AuthorsResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(LiteratureService)
    private readonly literatureService: LiteratureService,
    @Inject(LiteratureRelationsLoader)
    private readonly literatureRelationsLoader: LiteratureRelationsLoader,
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

  /**
   * Pages an author's texts in title order. The texts of every author in a
   * response are loaded together.
   */
  @ResolveField(() => TextConnectionType, { name: "texts" })
  public async resolveAuthorTexts(
    @Parent() author: AuthorType,
    @Arguments() arguments_: PaginationArguments,
  ): Promise<Connection<TextType>> {
    const texts = await this.literatureRelationsLoader.textsByAuthor.load({
      pagination: arguments_,
      parentId: author.id,
    });
    return mapConnection(texts, toTextType);
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
