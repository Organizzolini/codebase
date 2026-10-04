import { Inject } from "@nestjs/common";
import {
  Args as Arguments,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";

import { Line, Text } from "@codebase/lexico-entities";

import { TextConnectionType } from "./literature-connection.entities";
import { LiteratureService } from "./literature.service";
import { SearchTextsArguments } from "./search-texts-arguments.entities";
import { TextArguments } from "./text-argument.entities";
import { TextsArguments } from "./texts-arguments.entities";

import type { Connection } from "../../lexico-api.types";

/**
 * GraphQL resolver for Texts.
 */
@Resolver(() => Text)
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
  @ResolveField(() => [Text], { name: "childTexts" })
  public async childTexts(@Parent() text: Text): Promise<Text[]> {
    return this.literatureService.listTexts(undefined, text.id);
  }

  /**
   * Lists the current text's lines in index order. A joined relation carries no
   * order, and not every query joins it, so the lines are always loaded here.
   */
  @ResolveField(() => [Line], { name: "lines" })
  public async linesForText(@Parent() text: Text): Promise<Line[]> {
    return this.literatureService.listLines(text.id);
  }

  /** Resolves the parent text for a nested text. */
  @ResolveField(() => Text, { name: "parentText", nullable: true })
  public parentText(@Parent() text: Text): null | Text {
    return text.parentText ?? null;
  }

  // 🖋️ Mutations

  // 🔗 Relations

  /** Searches texts by title or slug. */
  @Query(() => TextConnectionType, { name: "searchTexts" })
  public async searchTexts(
    @Arguments() arguments_: SearchTextsArguments,
  ): Promise<Connection<Text>> {
    return this.literatureService.searchTexts(
      arguments_.query,
      arguments_.authorId,
      arguments_,
    );
  }

  /**
   * Finds a text by ID or slug.
   */
  @Query(() => Text, { name: "text", nullable: true })
  public async text(
    @Arguments() arguments_: TextArguments,
  ): Promise<null | Text> {
    const resolvedId = arguments_.lookup?.id ?? arguments_.id;
    const resolvedSlug = arguments_.lookup?.slug ?? arguments_.slug;

    if (!resolvedId && !resolvedSlug) {
      return null;
    }

    return this.literatureService.findTextByLookup(resolvedId, resolvedSlug);
  }

  /** Lists texts with optional author and parent filters. */
  @Query(() => TextConnectionType, { name: "texts" })
  public async texts(
    @Arguments() arguments_: TextsArguments,
  ): Promise<Connection<Text>> {
    return this.literatureService.listTextsConnection(
      arguments_.authorId,
      arguments_.parentTextId,
      arguments_,
    );
  }
}
