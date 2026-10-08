import { Inject } from "@nestjs/common";
import {
  Args as Arguments,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";

import { mapConnection } from "../../lexico-api.utilities";
import { WordType } from "../words/word.entities";
import { toWordType } from "../words/words.utilities";

import { TokenConnectionType } from "./literature-connection.entities";
import { LiteratureService } from "./literature.service";
import { toTokenType } from "./literature.utilities";
import { TokenWordLoader } from "./token-word.loader";
import { TokenType } from "./token.entities";
import { TokensArguments } from "./tokens-arguments.entities";

import type { Connection } from "../../lexico-api.types";

/**
 * GraphQL resolver for Tokens.
 */
@Resolver(() => TokenType)
export class TokensResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(LiteratureService)
    private readonly literatureService: LiteratureService,
    @Inject(TokenWordLoader)
    private readonly tokenWordLoader: TokenWordLoader,
  ) {}

  // 🔎 Queries

  /**
   * Resolves a token to the matching dictionary word, reusing the parent's
   * already-loaded relation and batching the rest through the loader.
   */
  @ResolveField(() => WordType, { name: "word", nullable: true })
  public async resolveTokenWord(
    @Parent() token: TokenType,
  ): Promise<null | WordType> {
    if (token.word !== undefined) {
      return token.word;
    }
    const word = await this.tokenWordLoader.byTokenId.load(token.id);
    return word === null ? null : toWordType(word);
  }

  // 🖋️ Mutations

  // 🔗 Relations

  /** Lists tokens for a line. */
  @Query(() => TokenConnectionType, { name: "tokens" })
  public async tokens(
    @Arguments() arguments_: TokensArguments,
  ): Promise<Connection<TokenType>> {
    const tokens = await this.literatureService.listTokensForLineConnection(
      arguments_.lineId,
      arguments_,
    );
    return mapConnection(tokens, toTokenType);
  }
}
