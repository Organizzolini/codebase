import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Author, In, Line, Text, Token, Word } from "@codebase/lexico-entities";

import { createRepositoryMock } from "../../../testing/mocks";

import { LiteratureService } from "./literature.service";

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
        {
          provide: getRepositoryToken(Word),
          useValue: createRepositoryMock<Word>(),
        },
      ],
    }).compile();

    service = await module.resolve(LiteratureService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("finds an author by id and slug with related text rows", async () => {
    expect.hasAssertions();

    const author = new Author();
    author.id = "author-1";
    author.slug = "virgil";
    author.texts = [Object.assign(new Text(), { id: "text-1" })];

    const authorRepo = createRepositoryMock<Author>();
    vi.spyOn(authorRepo, "findOne").mockResolvedValue(author);

    const service = new LiteratureService(
      authorRepo,
      createRepositoryMock<Line>(),
      createRepositoryMock<Text>(),
      createRepositoryMock<Token>(),
      createRepositoryMock<Word>(),
    );

    await expect(service.findAuthorByLookup("author-1")).resolves.toBe(author);
    await expect(service.findAuthorByLookup(null, "virgil")).resolves.toBe(
      author,
    );
    await expect(service.findAuthorByLookup(null, null)).resolves.toBeNull();
    await expect(service.findAuthorByLookup("", "")).resolves.toBeNull();

    expect(authorRepo.findOne).toHaveBeenCalledWith({
      relations: { texts: true },
      where: { id: "author-1" },
    });
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
    vi.spyOn(authorRepo, "find").mockResolvedValue(authors);

    const service = new LiteratureService(
      authorRepo,
      createRepositoryMock<Line>(),
      createRepositoryMock<Text>(),
      createRepositoryMock<Token>(),
      createRepositoryMock<Word>(),
    );

    const result = await service.listAuthorsConnection({ first: 10 });

    expect(result.totalCount).toBe(1);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.node).toBe(firstAuthor);
  });

  it("finds a text by id or slug and lists paginated text results", async () => {
    expect.hasAssertions();

    const textRepo = createRepositoryMock<Text>();
    const text = Object.assign(new Text(), { id: "text-1", slug: "aeneid" });
    vi.spyOn(textRepo, "findOne").mockResolvedValue(text);
    vi.spyOn(textRepo, "find").mockResolvedValue([text]);

    const service = new LiteratureService(
      createRepositoryMock<Author>(),
      createRepositoryMock<Line>(),
      textRepo,
      createRepositoryMock<Token>(),
      createRepositoryMock<Word>(),
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

    const qb = lineRepo.createQueryBuilder();
    vi.spyOn(qb, "getMany").mockResolvedValue([line]);

    const tokenRepo = createRepositoryMock<Token>();
    const token = new Token();
    token.id = "token-1";
    token.index = 1;
    vi.spyOn(tokenRepo, "find").mockResolvedValue([token]);

    const service = new LiteratureService(
      createRepositoryMock<Author>(),
      lineRepo,
      createRepositoryMock<Text>(),
      tokenRepo,
      createRepositoryMock<Word>(),
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

  it("resolves token words using the word repository and handles punctuation gracefully", async () => {
    expect.hasAssertions();

    const tokenRepo = createRepositoryMock<Token>();
    const wordRepo = createRepositoryMock<Word>();
    const token = new Token();
    token.id = "token-1";
    token.data = "amo";
    token.isPunctuation = false;

    const word = new Word();
    word.id = "word-1";
    word.data = "amo";
    vi.spyOn(tokenRepo, "find").mockResolvedValue([token]);
    vi.spyOn(wordRepo, "findOne").mockResolvedValue(word);

    const service = new LiteratureService(
      createRepositoryMock<Author>(),
      createRepositoryMock<Line>(),
      createRepositoryMock<Text>(),
      tokenRepo,
      wordRepo,
    );

    await expect(service.findTokensByIds(["token-1"])).resolves.toStrictEqual([
      token,
    ]);
    await expect(service.resolveTokenWord(token)).resolves.toBe(word);

    const emptyToken = Object.assign(new Token(), {
      data: "",
      id: token.id,
      isPunctuation: false,
      word: token.word,
    });
    const punctuationToken = Object.assign(new Token(), {
      data: "!",
      id: token.id,
      isPunctuation: true,
      word: token.word,
    });

    const noDataToken = Object.assign(new Token(), {
      data: undefined as unknown as string,
      id: token.id,
      isPunctuation: false,
      word: token.word,
    });

    await expect(service.resolveTokenWord(emptyToken)).resolves.toBeNull();
    await expect(
      service.resolveTokenWord(punctuationToken),
    ).resolves.toBeNull();
    await expect(service.resolveTokenWord(noDataToken)).resolves.toBeNull();

    expect(wordRepo.findOne).toHaveBeenCalledWith({
      where: { data: "amo" },
    });
    expect(tokenRepo.find).toHaveBeenCalledWith({
      relations: { word: true },
      where: { id: In(["token-1"]) },
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

    const authorQb = authorRepo.createQueryBuilder();
    vi.spyOn(authorQb, "getMany").mockResolvedValue([author]);
    const textQb = textRepo.createQueryBuilder();
    vi.spyOn(textQb, "getMany").mockResolvedValue([text]);
    const lineQb = lineRepo.createQueryBuilder();
    vi.spyOn(lineQb, "getMany").mockResolvedValue([line]);

    const service = new LiteratureService(
      authorRepo,
      lineRepo,
      textRepo,
      createRepositoryMock<Token>(),
      createRepositoryMock<Word>(),
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
      createRepositoryMock<Word>(),
    );

    await expect(service.findAuthorByLookup(null, null)).resolves.toBeNull();
    await expect(service.findTextByLookup(null, null)).resolves.toBeNull();
    await expect(service.findTokensByIds([])).resolves.toStrictEqual([]);
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
    await expect(
      service.listTexts("author-1", "parent-1"),
    ).resolves.toStrictEqual([]);
    await expect(
      service.listTexts(undefined, "parent-1"),
    ).resolves.toStrictEqual([]);
    await expect(
      service.listTexts(undefined, undefined),
    ).resolves.toStrictEqual([]);
  });

  it("keeps text-id filtering active when searching lines by text and avoids null parent text branches", async () => {
    expect.hasAssertions();

    const lineRepo = createRepositoryMock<Line>();
    const line = new Line();
    line.id = "line-1";
    line.data = "arma virumque";

    const qb = lineRepo.createQueryBuilder();
    vi.spyOn(qb, "getMany").mockResolvedValue([line]);

    const service = new LiteratureService(
      createRepositoryMock<Author>(),
      lineRepo,
      createRepositoryMock<Text>(),
      createRepositoryMock<Token>(),
      createRepositoryMock<Word>(),
    );

    await expect(service.searchLines("arma", "text-1")).resolves.toMatchObject({
      edges: [{ node: line }],
      totalCount: 1,
    });
    expect(qb.andWhere).toHaveBeenCalledWith("text.id = :textId", {
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

    const authorFindOne = vi.mocked(authorRepo.findOne);
    authorFindOne.mockResolvedValue(author);

    const textFindOne = vi.mocked(textRepo.findOne);
    textFindOne.mockResolvedValue(text);

    const lineCreateQueryBuilder = vi.mocked(lineRepo.createQueryBuilder);
    lineCreateQueryBuilder.mockReturnValue({
      andWhere: vi.fn<() => unknown>().mockReturnThis(),
      getMany: vi.fn<() => Promise<Line[]>>().mockResolvedValue([line]),
      leftJoinAndSelect: vi.fn<() => unknown>().mockReturnThis(),
      orderBy: vi.fn<() => unknown>().mockReturnThis(),
      where: vi.fn<() => unknown>().mockReturnThis(),
    } as never);

    const service = new LiteratureService(
      authorRepo,
      lineRepo,
      textRepo,
      createRepositoryMock<Token>(),
      createRepositoryMock<Word>(),
    );

    await expect(service.findAuthorByLookup(undefined, "virgil")).resolves.toBe(
      author,
    );
    await expect(service.findTextByLookup(undefined, "aeneid")).resolves.toBe(
      text,
    );
    await expect(service.listLines()).resolves.toStrictEqual([]);
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
