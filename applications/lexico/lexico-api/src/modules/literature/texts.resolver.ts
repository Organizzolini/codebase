import { Inject } from "@nestjs/common";
import {
  Args as Arguments,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";

import { mapConnection, mapNullableRelation } from "../../lexico-api.utilities";
import { PaginationArguments } from "../search/pagination-arguments.entities";

import {
  LineConnectionType,
  TextConnectionType,
} from "./literature-connection.entities";
import { LiteratureRelationsLoader } from "./literature-relations.loader";
import { LiteratureService } from "./literature.service";
import { toLineType, toTextType } from "./literature.utilities";
import { SearchTextsArguments } from "./search-texts-arguments.entities";
import { TextArguments } from "./text-argument.entities";
import { TextType } from "./text.entities";
import { TextsArguments } from "./texts-arguments.entities";

import type { Connection } from "../../lexico-api.types";
import type { LineType } from "./line.entities";

/**
 * GraphQL resolver for Texts.
 */
@Resolver(() => TextType)
export class TextsResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(LiteratureService)
    private readonly literatureService: LiteratureService,
    @Inject(LiteratureRelationsLoader)
    private readonly literatureRelationsLoader: LiteratureRelationsLoader,
  ) {}

  // 🔎 Queries

  /**
   * Pages the child texts under the current text, ordered like the `texts`
   * query. The children of every text in a response are loaded together.
   */
  @ResolveField(() => TextConnectionType, { name: "childTexts" })
  public async childTexts(
    @Parent() text: TextType,
    @Arguments() arguments_: PaginationArguments,
  ): Promise<Connection<TextType>> {
    const childTexts =
      await this.literatureRelationsLoader.childTextsByParent.load({
        pagination: arguments_,
        parentId: text.id,
      });
    return mapConnection(childTexts, toTextType);
  }

  /**
   * Pages the current text's lines in index order. A joined relation carries
   * no order, and not every query joins it, so the lines of every text in a
   * response are loaded together here.
   */
  @ResolveField(() => LineConnectionType, { name: "lines" })
  public async linesForText(
    @Parent() text: TextType,
    @Arguments() arguments_: PaginationArguments,
  ): Promise<Connection<LineType>> {
    const lines = await this.literatureRelationsLoader.linesByText.load({
      pagination: arguments_,
      parentId: text.id,
    });
    return mapConnection(lines, toLineType);
  }

  /**
   * Resolves the parent text for a nested text. A parent the query joined is
   * used as it is, a joined null included. One that was not joined — a parent
   * loaded as a relation carries no `parentText` of its own, and search does
   * not join it — is looked up with every other text's in the same response.
   */
  @ResolveField(() => TextType, { name: "parentText", nullable: true })
  public async parentText(@Parent() text: TextType): Promise<null | TextType> {
    if (text.parentText !== undefined) {
      return text.parentText;
    }

    const parent = await this.literatureRelationsLoader.parentTextByText.load(
      text.id,
    );
    return mapNullableRelation(parent, toTextType) ?? null;
  }

  // 🖋️ Mutations

  // 🔗 Relations

  /** Searches texts by title or slug. */
  @Query(() => TextConnectionType, { name: "searchTexts" })
  public async searchTexts(
    @Arguments() arguments_: SearchTextsArguments,
  ): Promise<Connection<TextType>> {
    const texts = await this.literatureService.searchTexts(
      arguments_.query,
      arguments_.authorId,
      arguments_,
    );
    return mapConnection(texts, toTextType);
  }

  /**
   * Finds a text by ID or slug.
   */
  @Query(() => TextType, { name: "text", nullable: true })
  public async text(
    @Arguments() arguments_: TextArguments,
  ): Promise<null | TextType> {
    const resolvedId = arguments_.lookup?.id ?? arguments_.id;
    const resolvedSlug = arguments_.lookup?.slug ?? arguments_.slug;

    if (!resolvedId && !resolvedSlug) {
      return null;
    }

    const text = await this.literatureService.findTextByLookup(
      resolvedId,
      resolvedSlug,
    );
    return text === null ? null : toTextType(text);
  }

  /** Lists texts with optional author and parent filters. */
  @Query(() => TextConnectionType, { name: "texts" })
  public async texts(
    @Arguments() arguments_: TextsArguments,
  ): Promise<Connection<TextType>> {
    const texts = await this.literatureService.listTextsConnection(
      arguments_.authorId,
      arguments_.parentTextId,
      arguments_,
    );
    return mapConnection(texts, toTextType);
  }
}
