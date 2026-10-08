import { Inject, Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";

import { WordsService } from "./words.service";

import type { Word } from "@codebase/lexico-entities";

/**
 * Request-scoped DataLoaders resolving word-form and word-lexeme links to the
 * written word on their other side. Every `load` issued in the same tick
 * shares one query, and each link's word is cached for the rest of the
 * request.
 */
@Injectable({ scope: Scope.REQUEST })
export class WordLinkLoader {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(WordsService)
    private readonly wordsService: WordsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  public readonly byWordFormId = new DataLoader<string, Word>(
    async (wordFormIds) =>
      this.loadWords(
        wordFormIds,
        await this.wordsService.findWordFormsByIds([...wordFormIds]),
      ),
  );

  public readonly byWordLexemeId = new DataLoader<string, Word>(
    async (wordLexemeIds) =>
      this.loadWords(
        wordLexemeIds,
        await this.wordsService.findWordLexemesByIds([...wordLexemeIds]),
      ),
  );

  // 🔏 Private Methods

  /**
   * Orders the words of a batch of links by the link IDs requested, with an
   * error in place of a link that no longer resolves to a word.
   */
  private loadWords(
    linkIds: readonly string[],
    links: readonly { readonly id: string; readonly word: Word }[],
  ): (Error | Word)[] {
    const wordByLinkId = new Map(links.map((link) => [link.id, link.word]));

    return linkIds.map(
      (linkId) =>
        wordByLinkId.get(linkId) ?? new Error(`Link ${linkId} has no word`),
    );
  }

  // 🌎 Public Methods
}
