import { Inject } from "@nestjs/common";
import { Args as Arguments, Query, Resolver } from "@nestjs/graphql";

import { Lexeme } from "@codebase/lexico-entities";

import { LexemeArguments } from "./lexeme-arguments.entities";
import { LexemesArguments } from "./lexemes-arguments.entities";
import { LexemesService } from "./lexemes.service";

/**
 * GraphQL resolver exposing dictionary lexeme queries.
 */
@Resolver(() => Lexeme)
export class LexemesResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(LexemesService) private readonly lexemesService: LexemesService,
  ) {}

  // 🔎 Queries

  /**
   * Retrieves a single dictionary lexeme by ID.
   */
  @Query(() => Lexeme, {
    description: "Retrieves a single dictionary lexeme by ID.",
    name: "lexeme",
    nullable: true,
  })
  public async lexeme(
    @Arguments() arguments_: LexemeArguments,
  ): Promise<Lexeme | null> {
    return this.lexemesService.findById(arguments_.id);
  }

  /**
   * Retrieves multiple dictionary lexemes by ID.
   */
  @Query(() => [Lexeme], {
    description: "Retrieves multiple dictionary lexemes by ID.",
    name: "lexemes",
  })
  public async lexemes(
    @Arguments() arguments_: LexemesArguments,
  ): Promise<Lexeme[]> {
    return this.lexemesService.findByIds(arguments_.ids);
  }

  // 🖋️ Mutations

  // 🔗 Relations
}
