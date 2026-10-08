import { createMock } from "@golevelup/ts-vitest";
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Author, Text } from "@codebase/lexico-entities";

import { AuthorsResolver } from "./authors.resolver";
import { LiteratureService } from "./literature.service";
import { TextsResolver } from "./texts.resolver";

describe(AuthorsResolver, () => {
  let resolver: AuthorsResolver;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthorsResolver,
        {
          provide: LiteratureService,
          useValue: createMock<LiteratureService>(),
        },
      ],
    }).compile();

    resolver = await module.resolve(AuthorsResolver);
  });

  it("is defined", () => {
    expect(resolver).toBeDefined();
  });

  it("resolves a single author by lookup, including nested field data", async () => {
    expect.hasAssertions();

    const author = new Author();
    author.id = "author-1";
    author.name = "Virgil";

    const text = new Text();
    text.id = "text-1";
    text.title = "Aeneid";

    const mockService = createMock<LiteratureService>({
      findAuthorByLookup: vi
        .fn<LiteratureService["findAuthorByLookup"]>()
        .mockResolvedValue(author),
      listTexts: vi
        .fn<LiteratureService["listTexts"]>()
        .mockResolvedValue([text]),
    });

    const authorsResolver = new AuthorsResolver(mockService);

    await expect(authorsResolver.author({ id: "author-1" })).resolves.toBe(
      author,
    );
    await expect(authorsResolver.author({ slug: "virgil" })).resolves.toBe(
      author,
    );
    await expect(
      authorsResolver.author({ lookup: { id: "author-1" } }),
    ).resolves.toBe(author);
    await expect(
      authorsResolver.author({ lookup: { slug: "virgil" } }),
    ).resolves.toBe(author);
    await expect(
      authorsResolver.resolveAuthorTexts(author),
    ).resolves.toStrictEqual([text]);
  });

  it("returns a paginated connection for authors", async () => {
    expect.hasAssertions();

    const author = new Author();
    author.id = "author-1";

    const mockService = createMock<LiteratureService>({
      listAuthorsConnection: vi
        .fn<LiteratureService["listAuthorsConnection"]>()
        .mockResolvedValue({
          edges: [{ cursor: "a", node: author }],
          pageInfo: {
            endCursor: "a",
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "a",
          },
          totalCount: 1,
        }),
    });

    const authorsResolver = new AuthorsResolver(mockService);

    await expect(
      authorsResolver.authors({
        after: "cursor-1",
        before: "cursor-0",
        first: 10,
        last: 5,
      }),
    ).resolves.toMatchObject({
      edges: [{ node: author }],
      totalCount: 1,
    });
  });

  it("resolves author search results", async () => {
    expect.hasAssertions();

    const author = new Author();
    author.id = "author-1";

    const mockService = createMock<LiteratureService>({
      searchAuthors: vi
        .fn<LiteratureService["searchAuthors"]>()
        .mockResolvedValue({
          edges: [{ cursor: "a", node: author }],
          pageInfo: {
            endCursor: "a",
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "a",
          },
          totalCount: 1,
        }),
    });

    const authorsResolver = new AuthorsResolver(mockService);

    await expect(
      authorsResolver.searchAuthors({
        after: "c-1",
        before: "c-0",
        first: 5,
        last: 2,
        query: "vir",
      }),
    ).resolves.toMatchObject({
      edges: [{ node: author }],
      totalCount: 1,
    });
  });

  it("resolves nullable author lookups", async () => {
    expect.hasAssertions();

    const authorsResolver = new AuthorsResolver(
      createMock<LiteratureService>(),
    );

    await expect(authorsResolver.author({})).resolves.toBeNull();

    await expect(authorsResolver.author({ lookup: {} })).resolves.toBeNull();

    expect(authorsResolver).toBeInstanceOf(AuthorsResolver);
  });

  it("exposes authors as a pagination-only listing without a query argument", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
      providers: [
        AuthorsResolver,
        TextsResolver,
        {
          provide: LiteratureService,
          useValue: createMock<LiteratureService>(),
        },
      ],
    }).compile();

    const schema = await module
      .get(GraphQLSchemaFactory)
      .create([AuthorsResolver, TextsResolver]);
    const fields = schema.getQueryType()?.getFields();

    expect(
      fields?.["authors"]?.args.map((argument) => argument.name).toSorted(),
    ).toStrictEqual(["after", "before", "first", "last"]);
    expect(
      fields?.["searchAuthors"]?.args.map((argument) => argument.name),
    ).toContain("query");
  });
});
