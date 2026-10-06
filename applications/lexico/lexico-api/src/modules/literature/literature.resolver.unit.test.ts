import { createMock } from "@golevelup/ts-vitest";
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Author, Line, Text } from "@codebase/lexico-entities";

import { AuthorsResolver } from "./authors.resolver";
import { LinesResolver } from "./lines.resolver";
import { LiteratureResolver } from "./literature.resolver";
import { LiteratureService } from "./literature.service";
import { TextsResolver } from "./texts.resolver";
import { TokenWordLoader } from "./token-word.loader";
import { TokensResolver } from "./tokens.resolver";

describe(LiteratureResolver, () => {
  let resolver: LiteratureResolver;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LiteratureResolver,
        {
          provide: LiteratureService,
          useValue: createMock<LiteratureService>(),
        },
      ],
    }).compile();

    resolver = await module.resolve(LiteratureResolver);
  });

  it("is defined", () => {
    expect(resolver).toBeDefined();
  });

  it("resolves aggregated literature search results", async () => {
    expect.hasAssertions();

    const author = new Author();
    author.id = "author-1";

    const text = new Text();
    text.id = "text-1";

    const line = new Line();
    line.id = "line-1";

    const mockService = createMock<LiteratureService>({
      searchLiterature: vi
        .fn<LiteratureService["searchLiterature"]>()
        .mockResolvedValue({
          authors: [author],
          lines: [line],
          texts: [text],
        }),
    });

    const literatureResolver = new LiteratureResolver(mockService);

    await expect(
      literatureResolver.searchLiterature({
        authorId: "author-1",
        query: "vir",
      }),
    ).resolves.toStrictEqual({
      authors: [author],
      lines: [line],
      texts: [text],
    });
    await expect(
      literatureResolver.searchLiterature({ query: "vir" }),
    ).resolves.toStrictEqual({
      authors: [author],
      lines: [line],
      texts: [text],
    });
  });

  it("generates a schema containing the literature queries and field resolvers", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
      providers: [
        AuthorsResolver,
        TextsResolver,
        LinesResolver,
        TokensResolver,
        LiteratureResolver,
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

    const schemaFactory = module.get(GraphQLSchemaFactory);
    const schema = await schemaFactory.create([
      AuthorsResolver,
      TextsResolver,
      LinesResolver,
      TokensResolver,
      LiteratureResolver,
    ]);

    expect(schema).toBeDefined();
    expect(schema.getQueryType()?.getFields()["author"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["authors"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["text"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["texts"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["lines"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["tokens"]).toBeDefined();
    expect(
      schema.getQueryType()?.getFields()["searchLiterature"],
    ).toBeDefined();
  });
});
