import { Inject } from "@nestjs/common";
import {
  Args as Arguments,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";

import { mapConnection } from "../../lexico-api.utilities";

import { LinesArguments } from "./line-arguments.entities";
import { LineType } from "./line.entities";
import { LineConnectionType } from "./literature-connection.entities";
import { LiteratureService } from "./literature.service";
import { toLineType, toTokenType } from "./literature.utilities";
import { SearchLinesArguments } from "./search-lines-arguments.entities";
import { TokenType } from "./token.entities";

import type { Connection } from "../../lexico-api.types";

/**
 * GraphQL resolver for Lines.
 */
@Resolver(() => LineType)
export class LinesResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(LiteratureService)
    private readonly literatureService: LiteratureService,
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

  /** Resolves every token attached to a line. */
  @ResolveField(() => [TokenType], { name: "tokens" })
  public async tokensForLine(@Parent() line: LineType): Promise<TokenType[]> {
    const tokens = await this.literatureService.listTokensForLine(line.id);
    return tokens.map((token) => toTokenType(token));
  }
}
