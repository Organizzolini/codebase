import { Inject } from "@nestjs/common";
import {
  Args as Arguments,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";

import { Token, Word } from "@codebase/lexico-entities";

import { TokenConnectionType } from "./literature-connection.entities";
import { LiteratureService } from "./literature.service";
import { TokenWordLoader } from "./token-word.loader";
import { TokensArguments } from "./tokens-arguments.entities";

import type { Connection } from "../../lexico-api.types";

/**
 * GraphQL resolver for Tokens.
 */
@Resolver(() => Token)
export class TokensResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(LiteratureService)
    private readonly literatureService: LiteratureService,
    @Inject(TokenWordLoader)
    private readonly tokenWordLoader: TokenWordLoader,
  ) {}

  // 🔎 Queries

  /** Resolves a token to the matching dictionary word. */
  @ResolveField(() => Word, { name: "word", nullable: true })
  public async resolveTokenWord(@Parent() token: Token): Promise<null | Word> {
    return this.tokenWordLoader.byTokenId.load(token.id);
  }

  // 🖋️ Mutations

  // 🔗 Relations

  /** Lists tokens for a line. */
  @Query(() => TokenConnectionType, { name: "tokens" })
  public async tokens(
    @Arguments() arguments_: TokensArguments,
  ): Promise<Connection<Token>> {
    return this.literatureService.listTokensForLineConnection(
      arguments_.lineId,
      arguments_,
    );
  }
}
