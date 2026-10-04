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

  it("resolves a token to its word through the data loader", async () => {
    expect.hasAssertions();

    const word = new Word();
    word.id = "word-1";
    word.data = "amo";

    const token = new Token();
    token.id = "token-1";
    token.data = "amo";
    token.isPunctuation = false;
    token.word = word;

    const mockService = createMock<LiteratureService>({
      findTokensByIds: vi
        .fn<LiteratureService["findTokensByIds"]>()
        .mockResolvedValue([token]),
    });
    const tokensResolver = new TokensResolver(
      mockService,
      new TokenWordLoader(mockService),
    );

    await expect(tokensResolver.resolveTokenWord(token)).resolves.toBe(word);
  });
});
