import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Token, Word } from "@codebase/lexico-entities";

import { LiteratureService } from "./literature.service";
import { TokenWordLoader } from "./token-word.loader";
import { TokensResolver } from "./tokens.resolver";

describe(TokensResolver, () => {
  let resolver: TokensResolver;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TokensResolver,
        {
          provide: LiteratureService,
          useValue: createMock<LiteratureService>(),
        },
        {
          provide: TokenWordLoader,
          useValue: createMock<TokenWordLoader>(),
        },
      ],
    }).compile();

    resolver = await module.resolve(TokensResolver);
  });

  it("is defined", () => {
    expect(resolver).toBeDefined();
  });

  it("returns a paginated connection for tokens", async () => {
    expect.hasAssertions();

    const token = new Token();
    token.id = "token-1";

    const mockService = createMock<LiteratureService>({
      listTokensForLineConnection: vi
        .fn<LiteratureService["listTokensForLineConnection"]>()
        .mockResolvedValue({
          edges: [{ cursor: "to", node: token }],
          pageInfo: {
            endCursor: "to",
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "to",
          },
          totalCount: 1,
        }),
    });

    const tokensResolver = new TokensResolver(
      mockService,
      createMock<TokenWordLoader>(),
    );

    await expect(
      tokensResolver.tokens({
        after: "cursor-1",
        before: "cursor-0",
        first: 10,
        last: 5,
        lineId: "line-1",
      }),
    ).resolves.toMatchObject({
      edges: [{ node: token }],
      totalCount: 1,
    });
  });

  describe("word", () => {
    /** Builds a resolver whose loader answers from the given loaded token. */
    function createWordResolver(loaded: Token): {
      findTokensByIds: ReturnType<
        typeof vi.fn<LiteratureService["findTokensByIds"]>
      >;
      tokensResolver: TokensResolver;
    } {
      const findTokensByIds = vi
        .fn<LiteratureService["findTokensByIds"]>()
        .mockResolvedValue([loaded]);
      const mockService = createMock<LiteratureService>({ findTokensByIds });
      return {
        findTokensByIds,
        tokensResolver: new TokensResolver(
          mockService,
          new TokenWordLoader(mockService),
        ),
      };
    }

    const word = Object.assign(new Word(), { data: "amo", id: "word-1" });

    it("loads the word through the data loader when the relation is absent", async () => {
      expect.hasAssertions();

      const loaded = Object.assign(new Token(), { id: "token-1", word });
      const { findTokensByIds, tokensResolver } = createWordResolver(loaded);
      const parent = Object.assign(new Token(), { id: "token-1" });

      await expect(tokensResolver.resolveTokenWord(parent)).resolves.toBe(word);
      expect(findTokensByIds).toHaveBeenCalledWith(["token-1"]);
    });

    it("returns the parent's loaded word without querying", async () => {
      expect.hasAssertions();

      const parent = Object.assign(new Token(), { id: "token-1", word });
      const { findTokensByIds, tokensResolver } = createWordResolver(parent);

      await expect(tokensResolver.resolveTokenWord(parent)).resolves.toBe(word);
      expect(findTokensByIds).not.toHaveBeenCalled();
    });

    it("returns null without querying for a loaded token that has no word", async () => {
      expect.hasAssertions();

      const parent = Object.assign(new Token(), {
        data: ",",
        id: "token-2",
        isPunctuation: true,
        word: null,
      });
      const { findTokensByIds, tokensResolver } = createWordResolver(parent);

      await expect(tokensResolver.resolveTokenWord(parent)).resolves.toBeNull();
      expect(findTokensByIds).not.toHaveBeenCalled();
    });
  });
});
