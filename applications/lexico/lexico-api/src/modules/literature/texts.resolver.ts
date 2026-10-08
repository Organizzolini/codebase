import { Inject } from "@nestjs/common";
import {
  Args as Arguments,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";

import { mapConnection, mapNullableRelation } from "../../lexico-api.utilities";

import { LineType } from "./line.entities";
import { TextConnectionType } from "./literature-connection.entities";
import { LiteratureService } from "./literature.service";
import { toLineType, toTextType } from "./literature.utilities";
import { SearchTextsArguments } from "./search-texts-arguments.entities";
import { TextArguments } from "./text-argument.entities";
import { TextType } from "./text.entities";
import { TextsArguments } from "./texts-arguments.entities";

import type { Connection } from "../../lexico-api.types";

/**
 * GraphQL resolver for Texts.
 */
@Resolver(() => TextType)
export class TextsResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(LiteratureService)
    private readonly literatureService: LiteratureService,
  ) {}

  // 🔎 Queries

  /**
   * Lists the child texts under the current text, ordered like the `texts` query.
   * Loaded here rather than from the parent's relation, which not every query joins.
   */
  @ResolveField(() => [TextType], { name: "childTexts" })
  public async childTexts(@Parent() text: TextType): Promise<TextType[]> {
    const childTexts = await this.literatureService.listTexts(
      undefined,
      text.id,
    );
    return childTexts.map((childText) => toTextType(childText));
  }

  /**
   * Lists the current text's lines in index order. A joined relation carries no
   * order, and not every query joins it, so the lines are always loaded here.
   */
  @ResolveField(() => [LineType], { name: "lines" })
  public async linesForText(@Parent() text: TextType): Promise<LineType[]> {
    const lines = await this.literatureService.listLines(text.id);
    return lines.map((line) => toLineType(line));
  }

  /**
   * Resolves the parent text for a nested text. A parent that was itself
   * loaded as a relation carries no `parentText` of its own, so one that was
   * not joined is looked up here rather than reported as absent.
   */
  @ResolveField(() => TextType, { name: "parentText", nullable: true })
  public async parentText(@Parent() text: TextType): Promise<null | TextType> {
    if (text.parentText !== undefined) {
      return text.parentText;
    }

    const loaded = await this.literatureService.findTextByLookup(text.id);
    return mapNullableRelation(loaded?.parentText, toTextType) ?? null;
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
