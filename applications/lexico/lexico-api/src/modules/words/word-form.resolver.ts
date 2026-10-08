import { Inject } from "@nestjs/common";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

import { WordFormType } from "./word-form.entities";
import { WordLinkLoader } from "./word-link.loader";
import { WordType } from "./word.entities";
import { toWordType } from "./words.utilities";

/**
 * Resolves the written word a word-form link belongs to, which the link type
 * leaves to a resolver so the word and its links need not import each other.
 */
@Resolver(() => WordFormType)
export class WordFormResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(WordLinkLoader) private readonly wordLinkLoader: WordLinkLoader,
  ) {}

  // 🔎 Queries

  // 🖋️ Mutations

  // 🔗 Relations

  /** Resolves the word side of a word-form link, batched per request. */
  @ResolveField(() => WordType, { name: "word" })
  public async word(@Parent() wordForm: WordFormType): Promise<WordType> {
    return toWordType(await this.wordLinkLoader.byWordFormId.load(wordForm.id));
  }
}
