import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { createRepositoryMock } from "../../../testing/mocks";
import { NumeralsService } from "../numerals/numerals.service";

import { LiteratureLibraryScanService } from "./literature-library-scan.service";
import { LiteratureTextIngestionService } from "./literature-text-ingestion.service";
import { LiteratureWordNormalizationService } from "./literature-word-normalization.service";
import { LiteratureService } from "./literature.service";

import type { IngestTextArguments, LibraryEntry } from "./literature.types";
import type { InsertResult, Repository } from "typeorm";

const fixedDate = new Date("2026-01-01T00:00:00.000Z");

function createAuthorFixture(overrides: Partial<Author> = {}): Author {
  const author = new Author();
  author.createdAt = fixedDate;
  author.id = "author-id";
  author.name = "Vergil";
  author.slug = "vergil";
  author.texts = [];
  author.updatedAt = fixedDate;
  Object.assign(author, overrides);
  return author;
}

function createTextFixture(overrides: Partial<Text> = {}): Text {
  const author = overrides.author ?? createAuthorFixture();

  const text = new Text();
  text.author = author;
  text.childTexts = [];
  text.createdAt = fixedDate;
  text.id = "text-id";
  text.lines = [];
  text.slug = "vergil/aeneid";
  text.title = "Aeneid";
  text.type = "text";
  text.updatedAt = fixedDate;
  Object.assign(text, overrides);
  return text;
}

const { existsSyncMock, mkdirSyncMock, readFileMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn<() => boolean>(),
  mkdirSyncMock: vi.fn<(...parameters: unknown[]) => void>(),
  readFileMock: vi.fn<() => Promise<string>>(),
}));
const { existsSync, mkdirSync } = vi.hoisted(() => ({
  existsSync: existsSyncMock,
  mkdirSync: mkdirSyncMock,
}));

vi.mock("node:fs", () => ({
  existsSync,
  mkdirSync,
}));

vi.mock("node:fs/promises", () => ({
  readFile: readFileMock,
}));

describe(LiteratureService, () => {
  let service: LiteratureService;

  let authorRepository: DeepMocked<Repository<Author>>;
  let lineRepository: DeepMocked<Repository<Line>>;
  let textRepository: DeepMocked<Repository<Text>>;
  let tokenRepository: DeepMocked<Repository<Token>>;
  let wordRepository: DeepMocked<Repository<Word>>;
  let logger: DeepMocked<LoggerService>;

  const numeralsService = createMock<NumeralsService>();

  const literatureLibraryScanService =
    createMock<LiteratureLibraryScanService>();

  const literatureTextIngestionService =
    createMock<LiteratureTextIngestionService>();
  const literatureWordNormalizationService =
    new LiteratureWordNormalizationService();

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
          provide: NumeralsService,
          useValue: numeralsService,
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
        {
          provide: LiteratureLibraryScanService,
          useValue: literatureLibraryScanService,
        },
        {
          provide: LiteratureTextIngestionService,
          useValue: literatureTextIngestionService,
        },
        {
          provide: LiteratureWordNormalizationService,
          useValue: literatureWordNormalizationService,
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = await module.resolve(LiteratureService);
    logger = await module.resolve(LoggerService);
    authorRepository = module.get(getRepositoryToken(Author));
    lineRepository = module.get(getRepositoryToken(Line));
    textRepository = module.get(getRepositoryToken(Text));
    tokenRepository = module.get(getRepositoryToken(Token));
    wordRepository = module.get(getRepositoryToken(Word));

    authorRepository.findOneOrFail.mockResolvedValue(createAuthorFixture());
    authorRepository.save.mockResolvedValue(createAuthorFixture());
    authorRepository.upsert.mockResolvedValue({
      generatedMaps: [],
      identifiers: [],
      raw: [],
    });
    lineRepository.find.mockResolvedValue([]);
    lineRepository.upsert.mockResolvedValue({
      generatedMaps: [],
      identifiers: [],
      raw: [],
    });
    textRepository.findOneOrFail.mockResolvedValue(createTextFixture());
    textRepository.upsert.mockResolvedValue({
      generatedMaps: [],
      identifiers: [],
      raw: [],
    });
    tokenRepository.upsert.mockResolvedValue({
      generatedMaps: [],
      identifiers: [],
      raw: [],
    });
    wordRepository.find.mockResolvedValue([]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    existsSyncMock.mockReturnValue(true);

    authorRepository.findOneOrFail.mockResolvedValue(createAuthorFixture());
    authorRepository.save.mockResolvedValue(createAuthorFixture());
    authorRepository.upsert.mockResolvedValue({} as InsertResult);

    lineRepository.find.mockResolvedValue([]);
    lineRepository.upsert.mockResolvedValue({} as InsertResult);

    textRepository.findOneOrFail.mockResolvedValue(createTextFixture());
    textRepository.upsert.mockResolvedValue({} as InsertResult);

    tokenRepository.upsert.mockResolvedValue({} as InsertResult);
    wordRepository.find.mockResolvedValue([]);

    numeralsService.toDecimal.mockReturnValue(4);
    literatureLibraryScanService.scanLibrary.mockResolvedValue([]);
    literatureTextIngestionService.ingestTextWithLogging.mockResolvedValue(
      undefined,
    );

    (
      service as unknown as {
        memoizedWordCache: Map<string, null | string>;
        wordsCache: Map<string, string> | null;
      }
    ).memoizedWordCache.clear();
    (
      service as unknown as {
        memoizedWordCache: Map<string, null | string>;
        wordsCache: Map<string, string> | null;
      }
    ).wordsCache = null;

    readFileMock.mockResolvedValue("# heading");
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("should set logger context on construction", () => {
    const initializedService = new LiteratureService(
      authorRepository,
      lineRepository,
      numeralsService,
      textRepository,
      tokenRepository,
      wordRepository,
      literatureLibraryScanService,
      literatureTextIngestionService,
      literatureWordNormalizationService,
      logger,
    );

    expect(initializedService).toBeDefined();
    expect(logger.setContext).toHaveBeenCalledWith("LiteratureService");
  });

  it("should create output directory when it does not exist", async () => {
    existsSyncMock.mockReturnValue(false);

    const module = await Test.createTestingModule({
      providers: [
        LiteratureService,
        { provide: getRepositoryToken(Author), useValue: authorRepository },
        { provide: getRepositoryToken(Line), useValue: lineRepository },
        { provide: NumeralsService, useValue: numeralsService },
        { provide: getRepositoryToken(Text), useValue: textRepository },
        { provide: getRepositoryToken(Token), useValue: tokenRepository },
        { provide: getRepositoryToken(Word), useValue: wordRepository },
        {
          provide: LiteratureLibraryScanService,
          useValue: literatureLibraryScanService,
        },
        {
          provide: LiteratureTextIngestionService,
          useValue: literatureTextIngestionService,
        },
        {
          provide: LiteratureWordNormalizationService,
          useValue: literatureWordNormalizationService,
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    module.get(LiteratureService);

    expect(mkdirSyncMock).toHaveBeenCalledWith(expect.any(String), {
      recursive: true,
    });
  });

  it("should parse frontmatter and tolerate invalid yaml", () => {
    const parseFrontmatter = (
      service as unknown as {
        parseFrontmatter: (ast: {
          children: { type: string; value?: string }[];
          type: string;
        }) => Record<string, unknown>;
      }
    ).parseFrontmatter.bind(service);

    const parsed = parseFrontmatter({
      children: [
        { type: "yaml", value: "text_metadata:\n  genre: epic" },
        { type: "paragraph" },
      ],
      type: "root",
    });

    const fallback = parseFrontmatter({
      children: [{ type: "yaml", value: "invalid: [" }],
      type: "root",
    });

    expect(parsed).toStrictEqual({ text_metadata: { genre: "epic" } });
    expect(fallback).toStrictEqual({});
  });

  it("should return empty frontmatter when yaml node is missing", () => {
    const parseFrontmatter = (
      service as unknown as {
        parseFrontmatter: (ast: {
          children: { type: string; value?: string }[];
          type: string;
        }) => Record<string, unknown>;
      }
    ).parseFrontmatter.bind(service);

    const parsed = parseFrontmatter({
      children: [{ type: "paragraph" }],
      type: "root",
    });

    expect(parsed).toStrictEqual({});
  });

  it("should return empty frontmatter when yaml parses to null", () => {
    const parseFrontmatter = (
      service as unknown as {
        parseFrontmatter: (ast: {
          children: { type: string; value?: string }[];
          type: string;
        }) => Record<string, unknown>;
      }
    ).parseFrontmatter.bind(service);

    const parsed = parseFrontmatter({
      children: [{ type: "yaml", value: "null" }],
      type: "root",
    });

    expect(parsed).toStrictEqual({});
  });

  it("should parse labels from strong nodes", () => {
    const parseLabelFromStrongNode = (
      service as unknown as {
        parseLabelFromStrongNode: (
          strongNode: {
            children: { type: string; value: string }[];
            type: string;
          },
          lineNodes: { children?: unknown[]; type: string; value?: string }[],
        ) => {
          label: string;
          lineNodes: { children?: unknown[]; type: string; value?: string }[];
        };
      }
    ).parseLabelFromStrongNode.bind(service);

    const standard = parseLabelFromStrongNode(
      {
        children: [{ type: "text", value: "IV. arma" }],
        type: "strong",
      },
      [
        {
          children: [{ type: "text", value: "IV. arma" }],
          type: "strong",
        },
        { type: "text", value: " virumque" },
      ],
    );

    const nonStandard = parseLabelFromStrongNode(
      {
        children: [{ type: "text", value: "proemium" }],
        type: "strong",
      },
      [
        {
          children: [{ type: "text", value: "proemium" }],
          type: "strong",
        },
        { type: "text", value: "  cano" },
      ],
    );

    expect(standard.label).toBe("4");
    expect(nonStandard.label).toBe("proemium");
    expect(nonStandard.lineNodes[0]).toStrictEqual({
      type: "text",
      value: "cano",
    });
  });

  it("should keep oversized non-standard label as line content", () => {
    const parseLabelFromStrongNode = (
      service as unknown as {
        parseLabelFromStrongNode: (
          strongNode: {
            children: { type: string; value: string }[];
            type: string;
          },
          lineNodes: { children?: unknown[]; type: string; value?: string }[],
        ) => {
          label: string;
          lineNodes: { children?: unknown[]; type: string; value?: string }[];
        };
      }
    ).parseLabelFromStrongNode.bind(service);

    const longLabel = "a".repeat(40);
    const parsed = parseLabelFromStrongNode(
      {
        children: [{ type: "text", value: longLabel }],
        type: "strong",
      },
      [
        {
          children: [{ type: "text", value: longLabel }],
          type: "strong",
        },
        { type: "text", value: " tail" },
      ],
    );

    expect(parsed.label).toBe("3");
    expect(parsed.lineNodes[0]).toStrictEqual({
      type: "text",
      value: `${longLabel} `,
    });
  });

  it("should preserve standard label remainder as text", () => {
    const parseLabelFromStrongNode = (
      service as unknown as {
        parseLabelFromStrongNode: (
          strongNode: {
            children: { type: string; value: string }[];
            type: string;
          },
          lineNodes: { children?: unknown[]; type: string; value?: string }[],
        ) => {
          label: string;
          lineNodes: { children?: unknown[]; type: string; value?: string }[];
        };
      }
    ).parseLabelFromStrongNode.bind(service);

    const parsed = parseLabelFromStrongNode(
      {
        children: [{ type: "text", value: "12) remainder" }],
        type: "strong",
      },
      [
        {
          children: [{ type: "text", value: "12) remainder" }],
          type: "strong",
        },
        { type: "text", value: " content" },
      ],
    );

    expect(parsed.label).toBe("12");
    expect(parsed.lineNodes[0]).toStrictEqual({
      type: "text",
      value: ") remainder ",
    });
  });

  it("should parse non-standard roman numeral label", () => {
    const parseLabelFromStrongNode = (
      service as unknown as {
        parseLabelFromStrongNode: (
          strongNode: {
            children: { type: string; value: string }[];
            type: string;
          },
          lineNodes: { children?: unknown[]; type: string; value?: string }[],
        ) => {
          label: string;
          lineNodes: { children?: unknown[]; type: string; value?: string }[];
        };
      }
    ).parseLabelFromStrongNode.bind(service);

    const parsed = parseLabelFromStrongNode(
      {
        children: [{ type: "text", value: "IV" }],
        type: "strong",
      },
      [
        {
          children: [{ type: "text", value: "IV" }],
          type: "strong",
        },
        { type: "text", value: " next" },
      ],
    );

    expect(parsed.label).toBe("4");
    expect(parsed.lineNodes[0]).toStrictEqual({ type: "text", value: " next" });
  });

  it("should parse roman numeral through parseNonStandardLabel", () => {
    const parseNonStandardLabel = (
      service as unknown as {
        parseNonStandardLabel: (
          rawLabel: string,
          lineNodes: { type: string; value?: string }[],
        ) => {
          label: string;
          lineNodes: { type: string; value?: string }[];
        };
      }
    ).parseNonStandardLabel.bind(service);

    const parsed = parseNonStandardLabel("X", [
      { type: "text", value: "X" },
      { type: "text", value: " next" },
    ]);

    expect(parsed.label).toBe("4");
  });

  it("should fallback to empty label when parseStandardLabel receives missing capture", () => {
    const parseStandardLabel = (
      service as unknown as {
        parseStandardLabel: (
          labelMatch: RegExpExecArray,
          lineNodes: { type: string; value?: string }[],
        ) => {
          label: string;
          lineNodes: { type: string; value?: string }[];
        };
      }
    ).parseStandardLabel.bind(service);

    const missingCaptureMatch = [
      "",
      undefined,
      "tail",
    ] as unknown as RegExpExecArray;
    const parsed = parseStandardLabel(missingCaptureMatch, [
      { type: "text", value: "head" },
      { type: "text", value: "content" },
    ]);

    expect(parsed.label).toBe("");
    expect(parsed.lineNodes[0]).toStrictEqual({ type: "text", value: "tail " });
  });

  it("should preserve nodes when next parsed node is not text", () => {
    const parseLabelFromStrongNode = (
      service as unknown as {
        parseLabelFromStrongNode: (
          strongNode: {
            children: { type: string; value: string }[];
            type: string;
          },
          lineNodes: { children?: unknown[]; type: string; value?: string }[],
        ) => {
          label: string;
          lineNodes: { children?: unknown[]; type: string; value?: string }[];
        };
      }
    ).parseLabelFromStrongNode.bind(service);

    const parsed = parseLabelFromStrongNode(
      {
        children: [{ type: "text", value: "proemium" }],
        type: "strong",
      },
      [
        {
          children: [{ type: "text", value: "proemium" }],
          type: "strong",
        },
        {
          children: [{ type: "text", value: "not-text-node" }],
          type: "strong",
        },
      ],
    );

    expect(parsed.label).toBe("proemium");
    expect(parsed.lineNodes[0]).toStrictEqual({
      children: [{ type: "text", value: "not-text-node" }],
      type: "strong",
    });
  });

  it("should build line entity from paragraph nodes", () => {
    const buildLineEntityFromParagraph = (
      service as unknown as {
        buildLineEntityFromParagraph: (
          paragraph: {
            children: { children?: unknown[]; type: string; value?: string }[];
            type: string;
          },
          index: number,
          text: Text,
        ) => { data: string; index: number; label: string; text: Text };
      }
    ).buildLineEntityFromParagraph.bind(service);

    const text = createTextFixture({
      author: createAuthorFixture({ slug: "vergil" }),
      id: "text-id",
      slug: "vergil/aeneid",
      title: "Aeneid",
    });

    const line = buildLineEntityFromParagraph(
      {
        children: [
          {
            children: [{ type: "text", value: "I. arma" }],
            type: "strong",
          },
          { type: "text", value: " virumque cano" },
        ],
        type: "paragraph",
      },
      0,
      text,
    );

    expect(line.label).toBe("4");
    expect(line.data).toContain("arma");
    expect(line.data).toContain("virumque cano");
    expect(line.index).toBe(0);
  });

  it("should cache dictionary words only once", async () => {
    wordRepository.find.mockResolvedValueOnce([
      { data: "amo", id: "word-1" } as Word,
      { data: "cano", id: "word-2" } as Word,
    ]);

    const getWordsCache = (
      service as unknown as {
        getWordsCache: () => Promise<Map<string, string>>;
      }
    ).getWordsCache.bind(service);

    const first = await getWordsCache();
    const second = await getWordsCache();

    expect(first.get("amo")).toBe("word-1");
    expect(second.get("cano")).toBe("word-2");
    expect(wordRepository.find).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith("📖 Cached words", undefined, {
      count: 2,
    });
  });

  it("should extract tokens and attach mapped word ids", () => {
    const extractTokensFromLine = (
      service as unknown as {
        extractTokensFromLine: (
          line: Line,
          text: Text,
          wordMap: Map<string, string>,
        ) => {
          data: string;
          isPunctuation: boolean;
          word: null | { id: string };
        }[];
      }
    ).extractTokensFromLine.bind(service);

    const text = createTextFixture({
      author: createAuthorFixture({ slug: "vergil" }),
      id: "text-id",
      slug: "vergil/aeneid",
      title: "Aeneid",
    });

    const line = {
      data: "amo, cano",
      id: "line-id",
      index: 0,
    } as unknown as Line;

    const tokens = extractTokensFromLine(
      line,
      text,
      new Map([
        ["amo", "word-1"],
        ["cano", "word-2"],
      ]),
    );

    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.some((token) => token.word?.id === "word-1")).toBe(true);
    expect(tokens.some((token) => token.isPunctuation)).toBe(true);
  });

  it("should return an empty token list when line data has no token matches", () => {
    const extractTokensFromLine = (
      service as unknown as {
        extractTokensFromLine: (
          line: Line,
          text: Text,
          wordMap: Map<string, string>,
        ) => {
          data: string;
          isPunctuation: boolean;
          word: null | { id: string };
        }[];
      }
    ).extractTokensFromLine.bind(service);

    const text = createTextFixture({
      author: createAuthorFixture({ slug: "vergil" }),
      id: "text-id",
      slug: "vergil/aeneid",
      title: "Aeneid",
    });

    const line = {
      data: "",
      id: "line-id",
      index: 0,
    } as unknown as Line;

    const tokens = extractTokensFromLine(line, text, new Map());

    expect(tokens).toStrictEqual([]);
  });

  it("should leave token word null when normalized word is missing from map", () => {
    const extractTokensFromLine = (
      service as unknown as {
        extractTokensFromLine: (
          line: Line,
          text: Text,
          wordMap: Map<string, string>,
        ) => {
          data: string;
          isPunctuation: boolean;
          word: null | { id: string };
        }[];
      }
    ).extractTokensFromLine.bind(service);

    const text = createTextFixture({
      author: createAuthorFixture({ slug: "vergil" }),
      id: "text-id",
      slug: "vergil/aeneid",
      title: "Aeneid",
    });

    const line = {
      data: "amo",
      id: "line-id",
      index: 0,
    } as unknown as Line;

    const tokens = extractTokensFromLine(line, text, new Map());

    expect(tokens[0]?.word).toBeNull();
  });

  it("should normalize and escape capitals when mapping tokens", () => {
    const extractTokensFromLine = (
      service as unknown as {
        extractTokensFromLine: (
          line: Line,
          text: Text,
          wordMap: Map<string, string>,
        ) => {
          data: string;
          isPunctuation: boolean;
          word: null | { id: string };
        }[];
      }
    ).extractTokensFromLine.bind(service);

    const text = createTextFixture({
      author: createAuthorFixture({ slug: "vergil" }),
      id: "text-id",
      slug: "vergil/aeneid",
      title: "Aeneid",
    });

    const line = {
      data: "Amo",
      id: "line-id",
      index: 0,
    } as unknown as Line;

    const tokens = extractTokensFromLine(
      line,
      text,
      new Map([["amo", "word-9"]]),
    );

    expect(tokens[0]?.word).toStrictEqual({ id: "word-9" });
  });

  it("should memoize token lookup results across repeated token extraction", () => {
    const extractTokensFromLine = (
      service as unknown as {
        extractTokensFromLine: (
          line: Line,
          text: Text,
          wordMap: Map<string, string>,
        ) => {
          data: string;
          isPunctuation: boolean;
          word: null | { id: string };
        }[];
      }
    ).extractTokensFromLine.bind(service);

    const text = createTextFixture({
      author: createAuthorFixture({ slug: "vergil" }),
      id: "text-id",
      slug: "vergil/aeneid",
      title: "Aeneid",
    });

    const wordMap = new Map([["amo", "word-1"]]);

    const firstTokens = extractTokensFromLine(
      { data: "amo", id: "line-1", index: 0 } as unknown as Line,
      text,
      wordMap,
    );

    wordMap.clear();

    const secondTokens = extractTokensFromLine(
      { data: "amo", id: "line-2", index: 1 } as unknown as Line,
      text,
      wordMap,
    );

    expect(firstTokens[0]?.word).toStrictEqual({ id: "word-1" });
    expect(secondTokens[0]?.word).toStrictEqual({ id: "word-1" });
  });

  it("should upsert lines and then upsert token chunks", async () => {
    lineRepository.find.mockResolvedValueOnce([
      { data: "amo", id: "line-1", index: 0 } as Line,
      { data: "cano", id: "line-2", index: 1 } as Line,
    ]);

    const text = createTextFixture({
      author: createAuthorFixture(),
      id: "text-id",
      slug: "vergil/aeneid",
      title: "Aeneid",
    });

    const upsertAndFetchLines = (
      service as unknown as {
        upsertAndFetchLines: (
          lineEntities: {
            data: string;
            index: number;
            label: string;
            text: Text;
          }[],
          text: Text,
        ) => Promise<Line[]>;
      }
    ).upsertAndFetchLines.bind(service);

    const savedLines = await upsertAndFetchLines(
      [
        { data: "amo", index: 0, label: "1", text },
        { data: "cano", index: 1, label: "2", text },
      ],
      text,
    );

    expect(savedLines).toHaveLength(2);

    await (
      service as unknown as {
        upsertTokens: (
          tokenEntities: { data: string; index: number }[],
          text: Text,
        ) => Promise<void>;
      }
    ).upsertTokens(
      [
        { data: "amo", index: 0 },
        { data: ",", index: 1 },
      ],
      text,
    );

    expect(tokenRepository.upsert).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      "💾 Saving tokens for text",
      undefined,
      { count: 2, title: "Aeneid" },
    );
  });

  it("should warn when ingesting text without paragraphs", async () => {
    const getWordsCacheSpy = vi
      .spyOn(
        service as unknown as {
          getWordsCache: () => Promise<Map<string, string>>;
        },
        "getWordsCache",
      )
      .mockResolvedValue(new Map());

    const text = createTextFixture({
      author: createAuthorFixture({ slug: "vergil" }),
      id: "text-id",
      slug: "vergil/aeneid",
      title: "Aeneid",
    });

    await (
      service as unknown as {
        ingestLines: (
          textToIngest: Text,
          ast: { children: unknown[]; type: string },
        ) => Promise<void>;
      }
    ).ingestLines(text, { children: [], type: "root" });

    expect(getWordsCacheSpy).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "📜 Missing lines in text",
      undefined,
      { slug: "vergil/aeneid" },
    );
  });

  it("should extract and upsert tokens when ingesting lines", async () => {
    const getWordsCacheSpy = vi
      .spyOn(
        service as unknown as {
          getWordsCache: () => Promise<Map<string, string>>;
        },
        "getWordsCache",
      )
      .mockResolvedValue(new Map([["amo", "word-1"]]));

    const upsertAndFetchLinesSpy = vi
      .spyOn(
        service as unknown as {
          upsertAndFetchLines: (
            lineEntities: unknown[],
            text: Text,
          ) => Promise<Line[]>;
        },
        "upsertAndFetchLines",
      )
      .mockResolvedValue([
        {
          data: "amo",
          id: "line-1",
          index: 0,
        } as Line,
      ]);

    const extractTokensFromLineSpy = vi
      .spyOn(
        service as unknown as {
          extractTokensFromLine: (
            line: Line,
            text: Text,
            wordMap: Map<string, string>,
          ) => unknown[];
        },
        "extractTokensFromLine",
      )
      .mockReturnValue([{ data: "amo", index: 0 }]);

    const upsertTokensSpy = vi
      .spyOn(
        service as unknown as {
          upsertTokens: (tokenEntities: unknown[], text: Text) => Promise<void>;
        },
        "upsertTokens",
      )
      .mockResolvedValue(undefined);

    const text = createTextFixture({
      author: createAuthorFixture({ slug: "vergil" }),
      id: "text-id",
      slug: "vergil/aeneid",
      title: "Aeneid",
    });

    await (
      service as unknown as {
        ingestLines: (
          textToIngest: Text,
          ast: { children: unknown[]; type: string },
        ) => Promise<void>;
      }
    ).ingestLines(text, {
      children: [
        {
          children: [{ type: "text", value: "amo" }],
          type: "paragraph",
        },
      ],
      type: "root",
    });

    expect(getWordsCacheSpy).toHaveBeenCalledTimes(1);
    expect(upsertAndFetchLinesSpy).toHaveBeenCalledTimes(1);
    expect(extractTokensFromLineSpy).toHaveBeenCalledTimes(1);
    expect(upsertTokensSpy).toHaveBeenCalledWith(
      [{ data: "amo", index: 0 }],
      text,
    );
    expect(logger.info).toHaveBeenCalledWith(
      "📜 Parsing lines for text",
      undefined,
      { title: "Aeneid" },
    );
  });

  it("should ensure parent texts for nested path parts", async () => {
    textRepository.findOneOrFail
      .mockResolvedValueOnce(
        createTextFixture({
          author: createAuthorFixture({ slug: "vergil" }),
          id: "book-1-id",
          slug: "vergil/book-1",
          title: "Book 1",
        }),
      )
      .mockResolvedValueOnce(
        createTextFixture({
          author: createAuthorFixture({ slug: "vergil" }),
          id: "book-1-a-id",
          slug: "vergil/book-1/section-a",
          title: "Section A",
        }),
      );

    const parentTexts = await (
      service as unknown as {
        ensureParentTexts: (
          authorEntity: Author,
          authorSlug: string,
          texts: LibraryEntry[],
        ) => Promise<Map<string, Text>>;
      }
    ).ensureParentTexts(createAuthorFixture({ slug: "vergil" }), "vergil", [
      {
        authorSlug: "vergil",
        fullPath: "/tmp/vergil/book-1/section-a.md",
        pathParts: ["book-1", "section-a"],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
    ]);

    expect(textRepository.upsert).toHaveBeenCalledTimes(2);
    expect(parentTexts.has("vergil/book-1/section-a")).toBe(true);
  });

  it("should skip duplicate and empty parent path parts", async () => {
    textRepository.findOneOrFail
      .mockResolvedValueOnce(
        createTextFixture({
          author: createAuthorFixture({ slug: "vergil" }),
          id: "book-1-id",
          slug: "vergil/book-1",
          title: "Book 1",
        }),
      )
      .mockResolvedValueOnce(
        createTextFixture({
          author: createAuthorFixture({ slug: "vergil" }),
          id: "book-1-a-id",
          slug: "vergil/book-1/section-a",
          title: "Section A",
        }),
      );

    const parentTexts = await (
      service as unknown as {
        ensureParentTexts: (
          authorEntity: Author,
          authorSlug: string,
          texts: LibraryEntry[],
        ) => Promise<Map<string, Text>>;
      }
    ).ensureParentTexts(createAuthorFixture({ slug: "vergil" }), "vergil", [
      {
        authorSlug: "vergil",
        fullPath: "/tmp/vergil/book-1/section-a.md",
        pathParts: ["book-1", "section-a"],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "vergil",
        fullPath: "/tmp/vergil/book-1/section-a-duplicate.md",
        pathParts: ["book-1", "section-a"],
        provider: "perseus",
        textSlug: "aeneid-duplicate",
        title: "Aeneid Duplicate",
      },
      {
        authorSlug: "vergil",
        fullPath: "/tmp/vergil/root.md",
        pathParts: [],
        provider: "perseus",
        textSlug: "root",
        title: "Root",
      },
    ]);

    expect(textRepository.upsert).toHaveBeenCalledTimes(2);
    expect(parentTexts.has("vergil/book-1")).toBe(true);
    expect(parentTexts.has("vergil/book-1/section-a")).toBe(true);
  });

  it("should use start-case author name fallback when ingesting unknown author group", async () => {
    const ensureParentTextsSpy = vi
      .spyOn(
        service as unknown as {
          ensureParentTexts: (
            authorEntity: Author,
            authorSlug: string,
            texts: LibraryEntry[],
          ) => Promise<Map<string, Text>>;
        },
        "ensureParentTexts",
      )
      .mockResolvedValue(new Map());

    const ingestTextChunksSpy = vi
      .spyOn(
        service as unknown as {
          ingestTextChunks: (args: {
            authorEntity: Author;
            authorSlug: string;
            parentTexts: Map<string, Text>;
            texts: LibraryEntry[];
          }) => Promise<void>;
        },
        "ingestTextChunks",
      )
      .mockResolvedValue(undefined);

    authorRepository.findOneOrFail.mockResolvedValueOnce(
      createAuthorFixture({
        id: "author-id",
        slug: "unknown-author",
      }),
    );

    await (
      service as unknown as {
        ingestAuthorGroup: (
          authorSlug: string,
          texts: LibraryEntry[],
        ) => Promise<void>;
      }
    ).ingestAuthorGroup("unknown-author", []);

    expect(authorRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Unknown Author",
        slug: "unknown-author",
      }),
      expect.objectContaining({}),
    );
    expect(ensureParentTextsSpy).toHaveBeenCalledTimes(1);
    expect(ingestTextChunksSpy).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith("👤 Starting author", undefined, {
      authorSlug: "unknown-author",
    });
  });

  it("should save text metadata and parent relation when present", async () => {
    textRepository.findOneOrFail.mockResolvedValueOnce(
      createTextFixture({
        author: createAuthorFixture({ slug: "vergil" }),
        id: "text-id",
        slug: "vergil/book-1/aeneid",
        title: "Aeneid",
      }),
    );

    await (
      service as unknown as {
        saveTextToDatabase: (args: {
          author: Author;
          frontmatterData: Record<string, unknown>;
          parentText: Text | undefined;
          textSlug: string;
          title: string;
        }) => Promise<Text>;
      }
    ).saveTextToDatabase({
      author: createAuthorFixture({ slug: "vergil" }),
      frontmatterData: { text_metadata: { meter: "dactylic hexameter" } },
      parentText: createTextFixture({
        id: "parent-id",
        slug: "vergil/book-1",
      }),
      textSlug: "vergil/book-1/aeneid",
      title: "Aeneid",
    });

    const upsertCallArguments = textRepository.upsert.mock.calls[0] as
      | [
          {
            parentText?: { id?: string };
          },
          unknown,
        ]
      | undefined;

    const saveCallArguments = textRepository.save.mock.calls[0] as
      | [
          {
            metadata?: { meter?: string };
          },
        ]
      | undefined;

    expect(upsertCallArguments).toBeDefined();
    expect(upsertCallArguments?.[0].parentText?.id).toBe("parent-id");
    expect(upsertCallArguments?.[1]).toBeDefined();
    expect(saveCallArguments).toBeDefined();
    expect(saveCallArguments?.[0].metadata?.meter).toBe("dactylic hexameter");
  });

  it("should ingest text by parsing frontmatter and lines", async () => {
    const ingestLinesSpy = vi
      .spyOn(
        service as unknown as {
          ingestLines: (
            text: Text,
            ast: { children: unknown[]; type: string },
          ) => Promise<void>;
        },
        "ingestLines",
      )
      .mockResolvedValue(undefined);

    textRepository.findOneOrFail.mockResolvedValueOnce(
      createTextFixture({
        author: createAuthorFixture({ slug: "vergil" }),
        id: "text-id",
        slug: "vergil/aeneid",
        title: "Aeneid",
      }),
    );

    readFileMock.mockResolvedValueOnce(
      `---\ntext_metadata:\n  genre: epic\n---\n\nI. arma virumque cano`,
    );

    await (
      service as unknown as {
        ingestText: (args: {
          author: Author;
          parentText?: Text;
          textPath: string;
          textSlugName: string;
          title: string;
        }) => Promise<void>;
      }
    ).ingestText({
      author: createAuthorFixture({ slug: "vergil" }),
      textPath: "/tmp/aeneid.md",
      textSlugName: "aeneid",
      title: "Aeneid",
    });

    expect(textRepository.upsert).toHaveBeenCalledTimes(1);
    expect(ingestLinesSpy).toHaveBeenCalledTimes(1);
  });

  it("should merge and save author metadata from frontmatter", async () => {
    const ingestLinesSpy = vi
      .spyOn(
        service as unknown as {
          ingestLines: (
            text: Text,
            ast: { children: unknown[]; type: string },
          ) => Promise<void>;
        },
        "ingestLines",
      )
      .mockResolvedValue(undefined);

    readFileMock.mockResolvedValueOnce(
      `---\nauthor_metadata:\n  era: classical\n---\n\nI. amo`,
    );

    const author = createAuthorFixture({
      metadata: { region: "italy" },
      slug: "vergil",
    });

    await (
      service as unknown as {
        ingestText: (args: {
          author: Author;
          parentText?: Text;
          textPath: string;
          textSlugName: string;
          title: string;
        }) => Promise<void>;
      }
    ).ingestText({
      author,
      textPath: "/tmp/vergil/amo.md",
      textSlugName: "amo",
      title: "Amo",
    });

    expect(authorRepository.save).toHaveBeenCalledWith(author);
    expect(author.metadata).toStrictEqual({
      era: "classical",
      region: "italy",
    });
    expect(ingestLinesSpy).toHaveBeenCalledTimes(1);
  });

  it("should delegate ingest text chunks through text ingestion service", async () => {
    const ingestTextSpy = vi
      .spyOn(
        service as unknown as {
          ingestText: (args: {
            author: Author;
            parentText?: Text;
            textPath: string;
            textSlugName: string;
            title: string;
          }) => Promise<void>;
        },
        "ingestText",
      )
      .mockResolvedValue(undefined);

    literatureTextIngestionService.ingestTextWithLogging.mockImplementation(
      async (
        ingestTextDelegate: {
          ingestText: (args: IngestTextArguments) => Promise<void>;
        },
        payload: {
          authorEntity: Author;
          authorSlug: string;
          currentText: number;
          logFilePath: string;
          parentTexts: Map<string, Text>;
          textEntry: LibraryEntry;
          totalTexts: number;
        },
      ) => {
        const parentText = payload.parentTexts.get("vergil");
        await ingestTextDelegate.ingestText({
          author: payload.authorEntity,
          parentText,
          textPath: payload.textEntry.fullPath,
          textSlugName: payload.textEntry.textSlug,
          title: payload.textEntry.title,
        });
      },
    );

    const ingestTextChunks = (
      LiteratureService.prototype as unknown as {
        ingestTextChunks: (
          this: LiteratureService,
          args: {
            authorEntity: Author;
            authorSlug: string;
            parentTexts: Map<string, Text>;
            texts: LibraryEntry[];
          },
        ) => Promise<void>;
      }
    ).ingestTextChunks.bind(service);

    await ingestTextChunks({
      authorEntity: createAuthorFixture(),
      authorSlug: "vergil",
      parentTexts: new Map(),
      texts: [
        {
          authorSlug: "vergil",
          fullPath: "/tmp/vergil/aeneid.md",
          pathParts: [],
          provider: "perseus",
          textSlug: "aeneid",
          title: "Aeneid",
        },
      ],
    });

    expect(
      literatureTextIngestionService.ingestTextWithLogging,
    ).toHaveBeenCalledTimes(1);
    expect(ingestTextSpy).toHaveBeenCalledTimes(1);
  });

  it("should delegate scanLibrary and ingest grouped authors", async () => {
    const entries: LibraryEntry[] = [
      {
        authorSlug: "vergil",
        fullPath: "/tmp/vergil/aeneid.md",
        pathParts: ["book-1"],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "ovid",
        fullPath: "/tmp/ovid/metamorphoses.md",
        pathParts: [],
        provider: "perseus",
        textSlug: "metamorphoses",
        title: "Metamorphoses",
      },
    ];

    literatureLibraryScanService.scanLibrary.mockResolvedValueOnce(entries);

    const ingestAuthorGroupSpy = vi
      .spyOn(
        service as unknown as {
          ingestAuthorGroup: (
            authorSlug: string,
            texts: LibraryEntry[],
          ) => Promise<void>;
        },
        "ingestAuthorGroup",
      )
      .mockResolvedValue(undefined);

    const result = await service.scanLibrary();
    await service.ingestAllAuthors(entries);

    expect(result).toStrictEqual(entries);
    expect(ingestAuthorGroupSpy).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith("👤 Completed author", undefined, {
      authorSlug: "ovid",
      current: 2,
      percent: 100,
      total: 2,
    });
  });
});
