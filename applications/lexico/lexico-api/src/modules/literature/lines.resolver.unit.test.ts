import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Line, Token } from "@codebase/lexico-entities";

import { LinesResolver } from "./lines.resolver";
import { LiteratureRelationsLoader } from "./literature-relations.loader";
import { LiteratureService } from "./literature.service";
import {
  createEmptyConnection,
  toLineType,
  toTokenType,
} from "./literature.utilities";

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
        {
          provide: LiteratureRelationsLoader,
          useValue: createMock<LiteratureRelationsLoader>(),
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

    const linesResolver = new LinesResolver(
      mockService,
      createMock<LiteratureRelationsLoader>(),
    );

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

    const linesResolver = new LinesResolver(
      mockService,
      createMock<LiteratureRelationsLoader>(),
    );

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

  it("pages a line's tokens through the request's relations loader", async () => {
    expect.hasAssertions();

    const line = Object.assign(new Line(), { id: "line-1" });
    const token = Object.assign(new Token(), { id: "token-1" });
    const load = vi
      .fn<LiteratureRelationsLoader["tokensByLine"]["load"]>()
      .mockResolvedValue({
        ...createEmptyConnection<Token>(),
        edges: [{ cursor: "t", node: token }],
        totalCount: 1,
      });
    const linesResolver = new LinesResolver(
      createMock<LiteratureService>(),
      createMock<LiteratureRelationsLoader>({
        tokensByLine: createMock<LiteratureRelationsLoader["tokensByLine"]>({
          load,
        }),
      }),
    );

    await expect(
      linesResolver.tokensForLine(toLineType(line), { first: 2 }),
    ).resolves.toMatchObject({
      edges: [{ cursor: "t", node: toTokenType(token) }],
      totalCount: 1,
    });
    expect(load).toHaveBeenCalledWith({
      pagination: { first: 2 },
      parentId: "line-1",
    });
  });
});
