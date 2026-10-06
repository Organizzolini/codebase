import { Inject } from "@nestjs/common";
import { Args as Arguments, Query, Resolver } from "@nestjs/graphql";

import { Word } from "@codebase/lexico-entities";

import { WordArguments } from "./word-arguments.entities";
import { WordsArguments } from "./words-arguments.entities";
import { WordsService } from "./words.service";

/**
 * GraphQL resolver exposing surface-word and morphological lookup queries.
 */
@Resolver(() => Word)
export class WordsResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(WordsService) private readonly wordsService: WordsService,
  ) {}

  // 🔎 Queries

  /**
   * Retrieves a single surface word by normalized input string.
   */
  @Query(() => Word, {
    description: "Retrieves a surface Latin word and its morphological links.",
    name: "word",
    nullable: true,
  })
  public async word(
    @Arguments() arguments_: WordArguments,
  ): Promise<null | Word> {
    return this.wordsService.findByData(arguments_.data);
  }

  /**
   * Retrieves multiple surface words by a batch of normalized input strings.
   */
  @Query(() => [Word], {
    description: "Retrieves multiple surface Latin words and their links.",
    name: "words",
  })
  public async words(@Arguments() arguments_: WordsArguments): Promise<Word[]> {
    return this.wordsService.findByDataList(arguments_.data);
  }

  // 🖋️ Mutations

  // 🔗 Relations
}
