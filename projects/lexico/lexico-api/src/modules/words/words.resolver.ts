import { Inject } from "@nestjs/common";
import { Args as Arguments, Query, Resolver } from "@nestjs/graphql";

import { WordArguments } from "./word-arguments.entities";
import { WordType } from "./word.entities";
import { WordsArguments } from "./words-arguments.entities";
import { WordsService } from "./words.service";
import { toWordType } from "./words.utilities";

/**
 * GraphQL resolver exposing surface-word and morphological lookup queries.
 */
@Resolver(() => WordType)
export class WordsResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(WordsService) private readonly wordsService: WordsService,
  ) {}

  // 🔎 Queries

  /**
   * Retrieves a single surface word by normalized input string.
   */
  @Query(() => WordType, {
    description: "Retrieves a surface Latin word and its morphological links.",
    name: "word",
    nullable: true,
  })
  public async word(
    @Arguments() arguments_: WordArguments,
  ): Promise<null | WordType> {
    const word = await this.wordsService.findByData(arguments_.data);
    return word === null ? null : toWordType(word);
  }

  /**
   * Retrieves multiple surface words by a batch of normalized input strings.
   */
  @Query(() => [WordType], {
    description: "Retrieves multiple surface Latin words and their links.",
    name: "words",
  })
  public async words(
    @Arguments() arguments_: WordsArguments,
  ): Promise<WordType[]> {
    const words = await this.wordsService.findByDataList(arguments_.data);
    return words.map((word) => toWordType(word));
  }

  // 🖋️ Mutations

  // 🔗 Relations
}
