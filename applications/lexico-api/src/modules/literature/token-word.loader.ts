import { Injectable, Scope } from "@nestjs/common";

import { Word } from "@codebase/lexico-entities";

import { LiteratureService } from "./literature.service";

/**
 * Minimal request-scoped batch loader for token-to-word resolution.
 */
@Injectable({ scope: Scope.REQUEST })
export class TokenWordLoader {
  // 🏗 Dependency Injection

  public constructor(private readonly literatureService: LiteratureService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  public readonly byTokenId = {
    load: this.loadTokenWord.bind(this),
    loadMany: this.loadTokenWords.bind(this),
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Loads a single token word mapping. */
  public async loadTokenWord(tokenId: string): Promise<null | Word> {
    const tokens = await this.literatureService.findTokensByIds([tokenId]);
    return tokens[0]?.word ?? null;
  }

  /** Loads token word mappings for a batch of token IDs. */
  public async loadTokenWords(
    tokenIds: readonly string[],
  ): Promise<(null | Word)[]> {
    if (tokenIds.length === 0) {
      return [];
    }

    const tokens = await this.literatureService.findTokensByIds([...tokenIds]);
    const byTokenId = new Map(
      tokens
        .filter((token) => token.word !== undefined)
        .map((token) => [token.id, token.word ?? null]),
    );

    return tokenIds.map((tokenId) => byTokenId.get(tokenId) ?? null);
  }
}
