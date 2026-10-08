import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Line, Token } from "@codebase/lexico-entities";

import { LinesResolver } from "./lines.resolver";
import { LiteratureService } from "./literature.service";
import { toLineType, toTokenType } from "./literature.utilities";

describe(LinesResolver, () => {
  let resolver: LinesResolver;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LinesResolver,
        {
          provide: LiteratureService,
          useValue: createMock<LiteratureService>(),
        },
      ],
    }).compile();

    resolver = await module.resolve(LinesResolver);
  });

  it("is defined", () => {
    expect(resolver).toBeDefined();
  });

  it("returns a paginated connection for lines", async () => {
    expect.hasAssertions();

    const line = new Line();
    line.id = "line-1";

    const mockService = createMock<LiteratureService>({
      listLinesConnection: vi
        .fn<LiteratureService["listLinesConnection"]>()
        .mockResolvedValue({
          edges: [{ cursor: "l", node: line }],
          pageInfo: {
            endCursor: "l",
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "l",
          },
          totalCount: 1,
        }),
    });

    const linesResolver = new LinesResolver(mockService);

    await expect(
      linesResolver.lines({
        after: "cursor-1",
        before: "cursor-0",
        first: 10,
        last: 5,
        range: { endIndex: 5, startIndex: 1 },
        textId: "text-1",
      }),
    ).resolves.toMatchObject({
      edges: [{ node: toLineType(line) }],
      totalCount: 1,
    });
    await expect(
      linesResolver.lines({
        first: 10,
      }),
    ).resolves.toMatchObject({
      edges: [{ node: toLineType(line) }],
      totalCount: 1,
    });
  });

  it("resolves line search results and nested token relations", async () => {
    expect.hasAssertions();

    const line = new Line();
    line.id = "line-1";

    const mockService = createMock<LiteratureService>({
      searchLines: vi.fn<LiteratureService["searchLines"]>().mockResolvedValue({
        edges: [{ cursor: "l", node: line }],
        pageInfo: {
          endCursor: "l",
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: "l",
        },
        totalCount: 1,
      }),
    });

    const linesResolver = new LinesResolver(mockService);

    await expect(
      linesResolver.searchLines({
        after: "c-1",
        before: "c-0",
        first: 5,
        last: 2,
        query: "arma",
        textId: "text-1",
      }),
    ).resolves.toMatchObject({
      edges: [{ node: toLineType(line) }],
      totalCount: 1,
    });
    await expect(
      linesResolver.searchLines({ first: 5, query: "arma" }),
    ).resolves.toMatchObject({
      edges: [{ node: toLineType(line) }],
      totalCount: 1,
    });
  });

  it("loads a line's tokens through the service when the relation was not joined", async () => {
    expect.hasAssertions();

    const line = new Line();
    line.id = "line-1";

    const token = new Token();
    token.id = "token-1";

    const listTokensForLine = vi
      .fn<LiteratureService["listTokensForLine"]>()
      .mockResolvedValue([token]);
    const linesResolver = new LinesResolver(
      createMock<LiteratureService>({ listTokensForLine }),
    );

    await expect(
      linesResolver.tokensForLine(toLineType(line)),
    ).resolves.toStrictEqual([toTokenType(token)]);
    expect(listTokensForLine).toHaveBeenCalledWith("line-1");
  });
});
