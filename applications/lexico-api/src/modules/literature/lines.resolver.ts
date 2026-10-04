import { Inject } from "@nestjs/common";
import {
  Args as Arguments,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";

import { Line, Token } from "@codebase/lexico-entities";

import { LinesArguments } from "./line-arguments.entities";
import { LineConnectionType } from "./literature-connection.entities";
import { LiteratureService } from "./literature.service";
import { SearchLinesArguments } from "./search-lines-arguments.entities";

import type { Connection } from "../../lexico-api.types";

/**
 * GraphQL resolver for Lines.
 */
@Resolver(() => Line)
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
  ): Promise<Connection<Line>> {
    return this.literatureService.listLinesConnection(
      arguments_.textId,
      {
        endIndex: arguments_.range?.endIndex ?? null,
        startIndex: arguments_.range?.startIndex ?? null,
      },
      arguments_,
    );
  }

  /** Searches lines by content. */
  @Query(() => LineConnectionType, { name: "searchLines" })
  public async searchLines(
    @Arguments() arguments_: SearchLinesArguments,
  ): Promise<Connection<Line>> {
    return this.literatureService.searchLines(
      arguments_.query,
      arguments_.textId,
      arguments_,
    );
  }

  // 🖋️ Mutations

  // 🔗 Relations

  /** Resolves every token attached to a line. */
  @ResolveField(() => [Token], { name: "tokens" })
  public async tokensForLine(@Parent() line: Line): Promise<Token[]> {
    return this.literatureService.listTokensForLine(line.id);
  }
}
