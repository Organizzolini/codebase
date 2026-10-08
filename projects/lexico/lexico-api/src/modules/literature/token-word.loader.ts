import { Inject, Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";

import { Word } from "@codebase/lexico-entities";

import { LiteratureService } from "./literature.service";

/**
 * Request-scoped DataLoader resolving tokens to their dictionary words. Every
 * `load` issued in the same tick shares one `findTokensByIds` query, and each
 * token's word is cached for the rest of the request.
 */
@Injectable({ scope: Scope.REQUEST })
export class TokenWordLoader {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(LiteratureService)
    private readonly literatureService: LiteratureService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  public readonly byTokenId = new DataLoader<string, null | Word>(
    async (tokenIds) => this.loadTokenWords(tokenIds),
  );

  // 🔏 Private Methods

  /** Loads token word mappings for a batch of token IDs, in request order. */
  private async loadTokenWords(
    tokenIds: readonly string[],
  ): Promise<(null | Word)[]> {
    const tokens = await this.literatureService.findTokensByIds([...tokenIds]);
    const wordByTokenId = new Map(
      tokens.map((token) => [token.id, token.word ?? null]),
    );

    return tokenIds.map((tokenId) => wordByTokenId.get(tokenId) ?? null);
  }

  // 🌎 Public Methods
}
