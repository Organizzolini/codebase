import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Author, In, Line, Text, Token } from "@codebase/lexico-entities";

import { createRepositoryMock } from "../../../testing/mocks";

import { LiteratureService } from "./literature.service";

import type { PageReadRow } from "./literature.types";
import type { Repository } from "typeorm";

/** Stubs a repository so its next connection holds exactly these entities. */
function stubPage<Entity extends { id: string }>(
  repository: Repository<Entity>,
  entities: Entity[],
): ReturnType<Repository<Entity>["createQueryBuilder"]> {
  const builder = repository.createQueryBuilder();
  vi.mocked(builder.getQuery).mockReturnValue("SELECT filtered");
  vi.mocked(builder.getParameters).mockReturnValue({});
  stubPageStatement(builder, entities);
  vi.mocked(repository.find).mockResolvedValue(entities);
  vi.mocked(repository.findBy).mockResolvedValue(entities);
  return builder;
}

/**
 * Stubs a builder so the page statement it runs reads back exactly these
 * entities, every one counted and none past the page.
 */
function stubPageStatement(
  builder: object,
  entities: readonly { id: string }[],
): void {
  Object.defineProperty(builder, "dataSource", {
    configurable: true,
    value: {
      driver: {
        escapeQueryWithParameters: (sql: string): [string, unknown[]] => [
          sql,
          [],
        ],
      },
      query: vi.fn<() => Promise<PageReadRow[]>>().mockResolvedValue([
        {
          after: null,
          before: null,
          hasRowBefore: false,
          totalCount: entities.length,
          window: entities.map((entity, key) => ({ id: entity.id, key })),
        },
      ]),
    },
  });
}

describe(LiteratureService, () => {
  let service: LiteratureService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LiteratureService,
        {
          provide: getRepositoryToken(Author),
          useValue: createRepositoryMock<Author>(),
        },
        {
          provide: getRepositoryToken(Line),
          useValue: createRepositoryMock<Line>(),
        },
        {
          provide: getRepositoryToken(Text),
          useValue: createRepositoryMock<Text>(),
        },
        {
          provide: getRepositoryToken(Token),
          useValue: createRepositoryMock<Token>(),
        },
      ],
    }).compile();

    service = await module.resolve(LiteratureService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("finds an author by id and slug without loading its texts", async () => {
    expect.hasAssertions();

    const author = new Author();
    author.id = "author-1";
    author.slug = "virgil";

    const authorRepo = createRepositoryMock<Author>();
    vi.spyOn(authorRepo, "findOneBy").mockResolvedValue(author);

    const service = new LiteratureService(
      authorRepo,
      createRepositoryMock<Line>(),
      createRepositoryMock<Text>(),
      createRepositoryMock<Token>(),
    );

    await expect(service.findAuthorByLookup("author-1")).resolves.toBe(author);
    await expect(service.findAuthorByLookup(null, "virgil")).resolves.toBe(
      author,
    );
    await expect(service.findAuthorByLookup(null, null)).resolves.toBeNull();
    await expect(service.findAuthorByLookup("", "")).resolves.toBeNull();

    expect(authorRepo.findOneBy).toHaveBeenCalledWith({ id: "author-1" });
    expect(authorRepo.findOneBy).toHaveBeenCalledWith({ slug: "virgil" });
  });

  it("lists authors and paginates them through Relay connection output", async () => {
    expect.hasAssertions();

    const authorRepo = createRepositoryMock<Author>();
    const authors: Author[] = [new Author()];
    const [firstAuthor] = authors;
    if (!firstAuthor) {
      throw new Error("Expected a test author");
    }
    firstAuthor.id = "author-1";
    firstAuthor.name = "Virgil";
    const authorQb = stubPage(authorRepo, authors);

    const service = new LiteratureService(
      authorRepo,
      createRepositoryMock<Line>(),
      createRepositoryMock<Text>(),
      createRepositoryMock<Token>(),
    );

    const result = await service.listAuthorsConnection({ first: 10 });

    expect(result.totalCount).toBe(1);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.node).toBe(firstAuthor);
    expect(authorQb.addSelect).toHaveBeenCalledWith("author.name", "key");
    expect(authorRepo.findBy).toHaveBeenCalledWith({
      id: In(["author-1"]),
    });
  });

  it("finds a text by id or slug and lists paginated text results", async () => {
    expect.hasAssertions();

    const textRepo = createRepositoryMock<Text>();
    const text = Object.assign(new Text(), { id: "text-1", slug: "aeneid" });
    vi.spyOn(textRepo, "findOne").mockResolvedValue(text);
    stubPage(textRepo, [text]);

    const service = new LiteratureService(
      createRepositoryMock<Author>(),
      createRepositoryMock<Line>(),
      textRepo,
      createRepositoryMock<Token>(),
    );

    await expect(service.findTextByLookup("text-1")).resolves.toBe(text);
    await expect(service.findTextByLookup(null, "aeneid")).resolves.toBe(text);
    await expect(service.findTextByLookup(null, null)).resolves.toBeNull();
    await expect(service.findTextByLookup("", "")).resolves.toBeNull();
    await expect(
      service.listTextsConnection(undefined, undefined, { first: 5 }),
    ).resolves.toMatchObject({
      edges: [{ node: text }],
      totalCount: 1,
    });
  });

  it("lists lines with range filters and paginates tokens by line id", async () => {
    expect.hasAssertions();

    const lineRepo = createRepositoryMock<Line>();
    const line = new Line();
    line.id = "line-1";
    line.index = 2;
    line.text = new Text();

    const qb = stubPage(lineRepo, [line]);

    const tokenRepo = createRepositoryMock<Token>();
    const token = new Token();
    token.id = "token-1";
    token.index = 1;
    stubPage(tokenRepo, [token]);

    const service = new LiteratureService(
      createRepositoryMock<Author>(),
      lineRepo,
      createRepositoryMock<Text>(),
      tokenRepo,
    );

    const lines = await service.listLinesConnection(
      "text-1",
      {
        endIndex: 5,
        startIndex: 1,
      },
      { first: 10 },
    );
    const linesWithOnlyStart = await service.listLinesConnection(
      "text-1",
      {
        startIndex: 1,
      },
      { first: 10 },
    );
    const linesWithOnlyEnd = await service.listLinesConnection(
      "text-1",
      {
        endIndex: 5,
      },
      { first: 10 },
    );
    const linesWithNoBounds = await service.listLinesConnection(
      "text-1",
      {},
      { first: 10 },
    );
    const linesWithNoText = await service.listLinesConnection(
      undefined,
      {},
      { first: 10 },
    );
    const tokens = await service.listTokensForLineConnection("line-1", {
      first: 1,
    });

    expect(lines.edges).toHaveLength(1);
    expect(linesWithOnlyStart.edges).toHaveLength(1);
    expect(linesWithOnlyEnd.edges).toHaveLength(1);
    expect(linesWithNoBounds.edges).toHaveLength(1);
    expect(linesWithNoText.edges).toHaveLength(0);
    expect(lines.edges[0]?.node).toBe(line);
    expect(tokens.edges).toHaveLength(1);
    expect(tokens.edges[0]?.node).toBe(token);
    expect(qb.where).toHaveBeenCalledWith("line.text_id = :textId", {
      textId: "text-1",
    });
  });

  it("searches authors, texts, and lines and aggregates the literature search result", async () => {
    expect.hasAssertions();

    const authorRepo = createRepositoryMock<Author>();
    const textRepo = createRepositoryMock<Text>();
    const lineRepo = createRepositoryMock<Line>();

    const author = new Author();
    author.id = "author-1";
    author.name = "Virgil";

    const text = new Text();
    text.id = "text-1";
    text.title = "Aeneid";

    const line = new Line();
    line.id = "line-1";
    line.data = "arma virumque";

    stubPage(authorRepo, [author]);
    stubPage(textRepo, [text]);
    stubPage(lineRepo, [line]);

    const service = new LiteratureService(
      authorRepo,
      lineRepo,
      textRepo,
      createRepositoryMock<Token>(),
    );

    const result = await service.searchLiterature("vir", "author-1");
    const resultWithoutAuthor = await service.searchLiterature("vir");

    expect(result.authors).toStrictEqual([author]);
    expect(result.texts).toStrictEqual([text]);
    expect(result.lines).toStrictEqual([line]);
    expect(resultWithoutAuthor.authors).toStrictEqual([author]);
    expect(resultWithoutAuthor.texts).toStrictEqual([text]);
    expect(resultWithoutAuthor.lines).toStrictEqual([line]);
  });

  it("handles empty queries and null lookups across literature search helpers", async () => {
    expect.hasAssertions();

    const authorRepo = createRepositoryMock<Author>();
    const textRepo = createRepositoryMock<Text>();
    const lineRepo = createRepositoryMock<Line>();
    vi.spyOn(textRepo, "find").mockResolvedValue([]);

    const service = new LiteratureService(
      authorRepo,
      lineRepo,
      textRepo,
      createRepositoryMock<Token>(),
    );

    await expect(service.findAuthorByLookup(null, null)).resolves.toBeNull();
    await expect(service.findTextByLookup(null, null)).resolves.toBeNull();
    await expect(service.searchAuthors("   ")).resolves.toMatchObject({
      edges: [],
      totalCount: 0,
    });
    await expect(service.searchTexts("   ", "author-1")).resolves.toMatchObject(
      {
        edges: [],
        totalCount: 0,
      },
    );
    await expect(service.searchLines("   ", "text-1")).resolves.toMatchObject({
      edges: [],
      totalCount: 0,
    });
    await expect(
      service.searchLiterature("   ", "author-1"),
    ).resolves.toStrictEqual({
      authors: [],
      lines: [],
      texts: [],
    });
  });

  it("keeps text-id filtering active when searching lines by text and avoids null parent text branches", async () => {
    expect.hasAssertions();

    const lineRepo = createRepositoryMock<Line>();
    const line = new Line();
    line.id = "line-1";
    line.data = "arma virumque";

    const qb = stubPage(lineRepo, [line]);

    const service = new LiteratureService(
      createRepositoryMock<Author>(),
      lineRepo,
      createRepositoryMock<Text>(),
      createRepositoryMock<Token>(),
    );

    await expect(service.searchLines("arma", "text-1")).resolves.toMatchObject({
      edges: [{ node: line }],
      totalCount: 1,
    });
    expect(qb.andWhere).toHaveBeenCalledWith("line.text_id = :textId", {
      textId: "text-1",
    });
  });

  it("covers slug-based lookups and empty-query branches for the literature search helpers", async () => {
    expect.hasAssertions();

    const authorRepo = createRepositoryMock<Author>();
    const textRepo = createRepositoryMock<Text>();
    const lineRepo = createRepositoryMock<Line>();

    const author = new Author();
    author.id = "author-1";
    author.slug = "virgil";

    const text = new Text();
    text.id = "text-1";
    text.slug = "aeneid";

    const line = new Line();
    line.id = "line-1";
    line.data = "arma virumque";

    const authorFindOneBy = vi.mocked(authorRepo.findOneBy);
    authorFindOneBy.mockResolvedValue(author);

    const textFindOne = vi.mocked(textRepo.findOne);
    textFindOne.mockResolvedValue(text);

    const lineCreateQueryBuilder = vi.mocked(lineRepo.createQueryBuilder);
    const lineBuilder = {
      addSelect: vi.fn<() => unknown>().mockReturnThis(),
      alias: "line",
      andWhere: vi.fn<() => unknown>().mockReturnThis(),
      getParameters: vi.fn<() => object>().mockReturnValue({}),
      getQuery: vi.fn<() => string>().mockReturnValue("SELECT filtered"),
      select: vi.fn<() => unknown>().mockReturnThis(),
      where: vi.fn<() => unknown>().mockReturnThis(),
    };
    stubPageStatement(lineBuilder, [line]);
    lineCreateQueryBuilder.mockReturnValue(lineBuilder as never);
    vi.mocked(lineRepo.findBy).mockResolvedValue([line]);

    const service = new LiteratureService(
      authorRepo,
      lineRepo,
      textRepo,
      createRepositoryMock<Token>(),
    );

    await expect(service.findAuthorByLookup(undefined, "virgil")).resolves.toBe(
      author,
    );
    await expect(service.findTextByLookup(undefined, "aeneid")).resolves.toBe(
      text,
    );
    await expect(service.searchAuthors(" ")).resolves.toMatchObject({
      edges: [],
      totalCount: 0,
    });
    await expect(service.searchTexts(" ")).resolves.toMatchObject({
      edges: [],
      totalCount: 0,
    });
    await expect(service.searchLines(" ")).resolves.toMatchObject({
      edges: [],
      totalCount: 0,
    });
    await expect(
      service.searchLiterature(" ", "author-1"),
    ).resolves.toStrictEqual({
      authors: [],
      lines: [],
      texts: [],
    });
    await expect(
      service.searchLiterature("arma", "author-1"),
    ).resolves.toStrictEqual({
      authors: [],
      lines: [line],
      texts: [],
    });
  });
});
