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

import { LinesArguments } from "./line-arguments.entities";
import { LineType } from "./line.entities";
import {
  LineConnectionType,
  TokenConnectionType,
} from "./literature-connection.entities";
import { LiteratureRelationsLoader } from "./literature-relations.loader";
import { LiteratureService } from "./literature.service";
import { toLineType, toTokenType } from "./literature.utilities";
import { SearchLinesArguments } from "./search-lines-arguments.entities";

import type { Connection } from "../../lexico-api.types";
import type { TokenType } from "./token.entities";

/**
 * GraphQL resolver for Lines.
 */
@Resolver(() => LineType)
export class LinesResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(LiteratureService)
    private readonly literatureService: LiteratureService,
    @Inject(LiteratureRelationsLoader)
    private readonly literatureRelationsLoader: LiteratureRelationsLoader,
  ) {}

  // 🔎 Queries

  /**
   * Lists lines with optional range bounds.
   */
  @Query(() => LineConnectionType, { name: "lines" })
  public async lines(
    @Arguments() arguments_: LinesArguments,
  ): Promise<Connection<LineType>> {
    const lines = await this.literatureService.listLinesConnection(
      arguments_.textId,
      {
        endIndex: arguments_.range?.endIndex ?? null,
        startIndex: arguments_.range?.startIndex ?? null,
      },
      arguments_,
    );
    return mapConnection(lines, toLineType);
  }

  /** Searches lines by content. */
  @Query(() => LineConnectionType, { name: "searchLines" })
  public async searchLines(
    @Arguments() arguments_: SearchLinesArguments,
  ): Promise<Connection<LineType>> {
    const lines = await this.literatureService.searchLines(
      arguments_.query,
      arguments_.textId,
      arguments_,
    );
    return mapConnection(lines, toLineType);
  }

  // 🖋️ Mutations

  // 🔗 Relations

  /**
   * Pages a line's tokens in index order, each with its dictionary word. The
   * tokens of every line on a page are loaded together, in a fixed number of
   * statements however many lines and tokens there are.
   */
  @ResolveField(() => TokenConnectionType, { name: "tokens" })
  public async tokensForLine(
    @Parent() line: LineType,
    @Arguments() arguments_: PaginationArguments,
  ): Promise<Connection<TokenType>> {
    const tokens = await this.literatureRelationsLoader.tokensByLine.load({
      pagination: arguments_,
      parentId: line.id,
    });
    return mapConnection(tokens, toTokenType);
  }
}
