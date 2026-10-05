import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import * as cheerio from "cheerio";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Author, Text } from "@codebase/lexico-entities";

import { LatinLibraryProvider } from "./latin-library.provider";

import type { LatinLibraryBuilder } from "./latin-library.builder";
import type { LoggerService } from "@codebase/logging";
import type { AnyNode } from "domhandler";

const { mkdirMock, readFileMock, writeFileMock } = vi.hoisted(() => ({
  mkdirMock: vi.fn<() => Promise<string | undefined>>(),
  readFileMock: vi.fn<() => Promise<string>>(),
  writeFileMock: vi.fn<() => Promise<void>>(),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: mkdirMock,
  readFile: readFileMock,
  writeFile: writeFileMock,
}));

describe(LatinLibraryProvider, () => {
  const logger: DeepMocked<LoggerService> = createMock<LoggerService>();

  const latinLibraryBuilder = {
    buildCategoryAuthor:
      vi.fn<
        (html: string, authorUrl: URL, $: cheerio.CheerioAPI) => Author | null
      >(),
    buildRootAuthors: vi.fn<(html: string) => Author[]>(),
    buildTextEntityForLink: vi.fn<(href: string, author: Author) => Text>(),
    buildWorkMarkdownContent: vi.fn<() => Record<string, unknown>>(),
    extractAuthorPageMetadata: vi.fn<() => Record<string, unknown>>(),
    findRawBookHeading:
      vi.fn<(anchorElement: AnyNode, $: cheerio.CheerioAPI) => string>(),
    getTextSlug: vi.fn<(work: Text, author: Author) => string>(),
    isExternalOrSelfLink:
      vi.fn<(absoluteUrl: string, authorUrlObject: URL) => boolean>(),
    isSkippedHref: vi.fn<(href: string) => boolean>(),
    isTextFileHref: vi.fn<(href: string) => boolean>(),
    parseWorkParagraphs: vi.fn<($work: cheerio.CheerioAPI) => string[]>(),
  } as unknown as LatinLibraryBuilder;

  const latinLibraryProvider = new LatinLibraryProvider(
    latinLibraryBuilder,
    logger,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("should initialize the provider instance", () => {
    expect(latinLibraryProvider).toBeDefined();
    expect(latinLibraryProvider.name).toBe("thelatinlibrary");
  });

  it("should add texts into grouped books", () => {
    const author = new Author();
    author.texts = [];

    const textEntity = new Text();
    textEntity.childTexts = [];
    textEntity.metadata = { sourceUrl: "aeneid.html" };
    textEntity.slug = "aeneid";
    textEntity.title = "Aeneid";
    textEntity.type = "text";

    (
      latinLibraryProvider as unknown as {
        addTextToBook: (args: {
          author: Author;
          book: string;
          booksMap: Map<string, Text>;
          textEntity: Text;
        }) => void;
      }
    ).addTextToBook({
      author,
      book: "Book I",
      booksMap: new Map<string, Text>(),
      textEntity,
    });

    expect(author.texts).toHaveLength(1);
    expect(author.texts[0]?.type).toBe("book");
    expect(author.texts[0]?.childTexts[0]?.title).toBe("Aeneid");
    expect(author.texts[0]?.childTexts[0]?.metadata).toStrictEqual(
      expect.objectContaining({ book: "Book I" }),
    );
  });

  it("should initialize metadata when adding text to book", () => {
    const author = new Author();
    author.texts = [];

    const textEntity = new Text();
    textEntity.childTexts = [];
    textEntity.slug = "georgics";
    textEntity.title = "Georgics";
    textEntity.type = "text";

    (
      latinLibraryProvider as unknown as {
        addTextToBook: (args: {
          author: Author;
          book: string;
          booksMap: Map<string, Text>;
          textEntity: Text;
        }) => void;
      }
    ).addTextToBook({
      author,
      book: "Book II",
      booksMap: new Map<string, Text>(),
      textEntity,
    });

    expect(textEntity.metadata).toStrictEqual({ book: "Book II" });
  });

  it("should cleanup author and child metadata", () => {
    const author = new Author();
    const childText = new Text();
    childText.metadata = { book: "Book I", sourceUrl: "aeneid.html" };
    childText.type = "text";

    const bookText = new Text();
    bookText.childTexts = [childText];
    bookText.metadata = { sourceUrl: "book.html" };
    bookText.type = "book";

    author.metadata = { nickname: "vergil", sourceUrl: "vergil.html" };
    author.texts = [bookText];

    (
      latinLibraryProvider as unknown as {
        cleanupAuthorMetadata: (author: Author) => void;
      }
    ).cleanupAuthorMetadata(author);

    expect(author.metadata["nickname"]).toBeUndefined();
    expect(childText.metadata["book"]).toBeUndefined();
  });

  it("should process text links and add book-grouped text", () => {
    const page = cheerio.load(
      `<h3>book i</h3><div><a href="aeneid.html">Aeneid</a></div>`,
    );
    const anchorElement = page("a").first().get(0);

    if (!anchorElement) {
      throw new Error("Expected anchor element");
    }

    const author = new Author();
    author.slug = "vergil";
    author.texts = [];

    latinLibraryBuilder.isSkippedHref = vi
      .fn<(href: string) => boolean>()
      .mockReturnValue(false);
    latinLibraryBuilder.isTextFileHref = vi
      .fn<(href: string) => boolean>()
      .mockReturnValue(true);
    latinLibraryBuilder.isExternalOrSelfLink = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue(false) as never;
    latinLibraryBuilder.findRawBookHeading = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue("book i") as never;

    const textEntity = new Text();
    textEntity.childTexts = [];
    textEntity.metadata = { sourceUrl: "aeneid.html" };
    textEntity.slug = "aeneid";
    textEntity.title = "Aeneid";
    textEntity.type = "text";

    latinLibraryBuilder.buildTextEntityForLink = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue(textEntity) as never;

    (
      latinLibraryProvider as unknown as {
        processTextLink: (args: {
          $: cheerio.CheerioAPI;
          anchor: Parameters<cheerio.CheerioAPI>[0];
          author: Author;
          authorUrlObject: URL;
          booksMap: Map<string, Text>;
        }) => void;
      }
    ).processTextLink({
      $: page,
      anchor: anchorElement,
      author,
      authorUrlObject: new URL("https://www.thelatinlibrary.com/vergil.html"),
      booksMap: new Map<string, Text>(),
    });

    expect(author.texts).toHaveLength(1);
    expect(author.texts[0]?.type).toBe("book");
    expect(author.texts[0]?.childTexts).toHaveLength(1);
  });

  it("should process author page without merging metadata when no additions found", async () => {
    const author = new Author();
    author.name = "Vergil";
    author.metadata = { nickname: "vergil", sourceUrl: "vergil.html" };
    author.slug = "vergil";
    author.texts = [];

    vi.spyOn(
      latinLibraryProvider as unknown as {
        readSourceCacheFile: (
          urlString: string,
          host: string,
        ) => Promise<string>;
      },
      "readSourceCacheFile",
    ).mockResolvedValue("<html><body></body></html>");

    latinLibraryBuilder.extractAuthorPageMetadata = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue({}) as never;

    const collectAuthorTextsSpy = vi
      .spyOn(
        latinLibraryProvider as unknown as {
          collectAuthorTexts: (
            authorToCollect: Author,
            cheerioApi: cheerio.CheerioAPI,
            authorUrlObject: URL,
          ) => void;
        },
        "collectAuthorTexts",
      )
      .mockImplementation(() => {});

    await (
      latinLibraryProvider as unknown as {
        processAuthorPage: (
          authorToProcess: Author,
          host: string,
        ) => Promise<void>;
      }
    ).processAuthorPage(author, "https://www.thelatinlibrary.com/");

    expect(author.metadata).toStrictEqual({
      nickname: "vergil",
      sourceUrl: "vergil.html",
    });
    expect(collectAuthorTextsSpy).toHaveBeenCalledTimes(1);
  });

  it("should merge additional author metadata when extracted metadata is non-empty", async () => {
    const author = new Author();
    author.name = "Vergil";
    author.metadata = { nickname: "vergil", sourceUrl: "vergil.html" };
    author.slug = "vergil";
    author.texts = [];

    vi.spyOn(
      latinLibraryProvider as unknown as {
        readSourceCacheFile: (
          urlString: string,
          host: string,
        ) => Promise<string>;
      },
      "readSourceCacheFile",
    ).mockResolvedValue("<html><body></body></html>");

    latinLibraryBuilder.extractAuthorPageMetadata = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue({ period: "Classical" }) as never;

    vi.spyOn(
      latinLibraryProvider as unknown as {
        collectAuthorTexts: (
          authorToCollect: Author,
          cheerioApi: cheerio.CheerioAPI,
          authorUrlObject: URL,
        ) => void;
      },
      "collectAuthorTexts",
    ).mockImplementation(() => {});

    await (
      latinLibraryProvider as unknown as {
        processAuthorPage: (
          authorToProcess: Author,
          host: string,
        ) => Promise<void>;
      }
    ).processAuthorPage(author, "https://www.thelatinlibrary.com/");

    expect(author.metadata).toStrictEqual({
      nickname: "vergil",
      period: "Classical",
      sourceUrl: "vergil.html",
    });
  });

  it("should skip invalid text links", () => {
    const page = cheerio.load(`<a href="index.html">Index</a>`);
    const anchorElement = page("a").first().get(0);

    if (!anchorElement) {
      throw new Error("Expected anchor element");
    }

    const author = new Author();
    author.slug = "vergil";
    author.texts = [];

    latinLibraryBuilder.isSkippedHref = vi
      .fn<(href: string) => boolean>()
      .mockReturnValue(true);

    (
      latinLibraryProvider as unknown as {
        processTextLink: (args: {
          $: cheerio.CheerioAPI;
          anchor: Parameters<cheerio.CheerioAPI>[0];
          author: Author;
          authorUrlObject: URL;
          booksMap: Map<string, Text>;
        }) => void;
      }
    ).processTextLink({
      $: page,
      anchor: anchorElement,
      author,
      authorUrlObject: new URL("https://www.thelatinlibrary.com/vergil.html"),
      booksMap: new Map<string, Text>(),
    });

    expect(author.texts).toHaveLength(0);
  });

  it("should skip processTextLink when href is missing", () => {
    const page = cheerio.load(`<a>No href</a>`);
    const anchorElement = page("a").first().get(0);

    if (!anchorElement) {
      throw new Error("Expected anchor element");
    }

    const author = new Author();
    author.slug = "vergil";
    author.texts = [];

    (
      latinLibraryProvider as unknown as {
        processTextLink: (args: {
          $: cheerio.CheerioAPI;
          anchor: Parameters<cheerio.CheerioAPI>[0];
          author: Author;
          authorUrlObject: URL;
          booksMap: Map<string, Text>;
        }) => void;
      }
    ).processTextLink({
      $: page,
      anchor: anchorElement,
      author,
      authorUrlObject: new URL("https://www.thelatinlibrary.com/vergil.html"),
      booksMap: new Map<string, Text>(),
    });

    expect(author.texts).toHaveLength(0);
  });

  it("should delegate root author building to the builder", () => {
    const author = new Author();
    author.slug = "vergil";
    author.texts = [];

    latinLibraryBuilder.buildRootAuthors = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue([author]) as never;

    const authors = (
      latinLibraryProvider as unknown as {
        buildRootAuthors: (html: string) => Author[];
      }
    ).buildRootAuthors("<html></html>");

    expect(authors).toStrictEqual([author]);
    expect(latinLibraryBuilder.buildRootAuthors).toHaveBeenCalledWith(
      "<html></html>",
    );
  });

  it("should delegate category author building to the builder", () => {
    const page = cheerio.load(
      `<table><tr><td><a href="vergil.html">Vergil</a></td></tr></table>`,
    );
    const anchorElement = page("a").first().get(0);

    if (!anchorElement) {
      throw new Error("Expected anchor element");
    }

    const author = new Author();
    author.slug = "vergil";
    author.texts = [];

    latinLibraryBuilder.buildCategoryAuthor = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue(author) as never;

    const result = (
      latinLibraryProvider as unknown as {
        buildCategoryAuthor: (
          anchorElement: AnyNode,
          cheerioApi: cheerio.CheerioAPI,
        ) => Author | null;
      }
    ).buildCategoryAuthor(anchorElement, page);

    expect(result).toBe(author);
    expect(latinLibraryBuilder.buildCategoryAuthor).toHaveBeenCalledWith(
      anchorElement,
      page,
    );
  });

  it("should skip processTextLink for external links", () => {
    const page = cheerio.load(`<a href="aeneid.html">Aeneid</a>`);
    const anchorElement = page("a").first().get(0);

    if (!anchorElement) {
      throw new Error("Expected anchor element");
    }

    const author = new Author();
    author.slug = "vergil";
    author.texts = [];

    latinLibraryBuilder.isSkippedHref = vi
      .fn<(href: string) => boolean>()
      .mockReturnValue(false);
    latinLibraryBuilder.isTextFileHref = vi
      .fn<(href: string) => boolean>()
      .mockReturnValue(true);
    latinLibraryBuilder.isExternalOrSelfLink = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue(true) as never;

    (
      latinLibraryProvider as unknown as {
        processTextLink: (args: {
          $: cheerio.CheerioAPI;
          anchor: Parameters<cheerio.CheerioAPI>[0];
          author: Author;
          authorUrlObject: URL;
          booksMap: Map<string, Text>;
        }) => void;
      }
    ).processTextLink({
      $: page,
      anchor: anchorElement,
      author,
      authorUrlObject: new URL("https://www.thelatinlibrary.com/vergil.html"),
      booksMap: new Map<string, Text>(),
    });

    expect(author.texts).toHaveLength(0);
  });

  it("should add text directly when no book heading exists", () => {
    const page = cheerio.load(`<a href="aeneid.html">Aeneid</a>`);
    const anchorElement = page("a").first().get(0);

    if (!anchorElement) {
      throw new Error("Expected anchor element");
    }

    const author = new Author();
    author.slug = "vergil";
    author.texts = [];

    latinLibraryBuilder.isSkippedHref = vi
      .fn<(href: string) => boolean>()
      .mockReturnValue(false);
    latinLibraryBuilder.isTextFileHref = vi
      .fn<(href: string) => boolean>()
      .mockReturnValue(true);
    latinLibraryBuilder.isExternalOrSelfLink = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue(false) as never;
    latinLibraryBuilder.findRawBookHeading = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue(undefined) as never;

    const textEntity = new Text();
    textEntity.type = "text";
    textEntity.title = "Aeneid";
    textEntity.slug = "aeneid";
    textEntity.metadata = { sourceUrl: "aeneid.html" };

    latinLibraryBuilder.buildTextEntityForLink = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue(textEntity) as never;

    (
      latinLibraryProvider as unknown as {
        processTextLink: (args: {
          $: cheerio.CheerioAPI;
          anchor: Parameters<cheerio.CheerioAPI>[0];
          author: Author;
          authorUrlObject: URL;
          booksMap: Map<string, Text>;
        }) => void;
      }
    ).processTextLink({
      $: page,
      anchor: anchorElement,
      author,
      authorUrlObject: new URL("https://www.thelatinlibrary.com/vergil.html"),
      booksMap: new Map<string, Text>(),
    });

    expect(author.texts).toHaveLength(1);
    expect(author.texts[0]?.type).toBe("text");
  });

  it("should skip writing work when no valid content exists", async () => {
    const author = new Author();
    author.slug = "vergil";

    const work = new Text();
    work.slug = "vergil/aeneid";
    work.title = "Aeneid";
    work.metadata = { sourceUrl: "aeneid.html" };

    const readSourceCacheFileSpy = vi
      .spyOn(
        latinLibraryProvider as unknown as {
          readSourceCacheFile: (
            urlString: string,
            host: string,
          ) => Promise<string>;
        },
        "readSourceCacheFile",
      )
      .mockResolvedValue("<html><body></body></html>");

    latinLibraryBuilder.parseWorkParagraphs = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue([]) as never;

    const result = await (
      latinLibraryProvider as unknown as {
        writeWorkText: (args: {
          author: Author;
          authorPath: string;
          host: string;
          work: Text;
        }) => Promise<boolean>;
      }
    ).writeWorkText({
      author,
      authorPath: "/tmp/vergil",
      host: "https://www.thelatinlibrary.com/",
      work,
    });

    expect(result).toBe(false);
    expect(readSourceCacheFileSpy).toHaveBeenCalledTimes(1);
  });

  it("should write work markdown when content is valid", async () => {
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);

    const author = new Author();
    author.slug = "vergil";

    const work = new Text();
    work.slug = "vergil/aeneid";
    work.title = "Aeneid";
    work.metadata = { sourceUrl: "aeneid.html" };

    vi.spyOn(
      latinLibraryProvider as unknown as {
        readSourceCacheFile: (
          urlString: string,
          host: string,
        ) => Promise<string>;
      },
      "readSourceCacheFile",
    ).mockResolvedValue("<html><body><p>arma virumque cano</p></body></html>");

    latinLibraryBuilder.parseWorkParagraphs = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue(["arma virumque cano"]) as never;
    latinLibraryBuilder.buildWorkMarkdownContent = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue("# Aeneid\n\narma virumque cano") as never;

    const saveWorkTextMarkdownSpy = vi
      .spyOn(
        latinLibraryProvider as unknown as {
          saveWorkTextMarkdown: (args: {
            authorPath: string;
            markdown: string;
            work: Text;
            workBook: string | undefined;
          }) => Promise<void>;
        },
        "saveWorkTextMarkdown",
      )
      .mockResolvedValue(undefined);

    const result = await (
      latinLibraryProvider as unknown as {
        writeWorkText: (args: {
          author: Author;
          authorPath: string;
          host: string;
          work: Text;
        }) => Promise<boolean>;
      }
    ).writeWorkText({
      author,
      authorPath: "/tmp/vergil",
      host: "https://www.thelatinlibrary.com/",
      work,
    });

    expect(result).toBe(true);
    expect(saveWorkTextMarkdownSpy).toHaveBeenCalledTimes(1);
  });

  it("should process work and log completion progress", async () => {
    latinLibraryBuilder.getTextSlug = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue("vergil/aeneid") as never;

    vi.spyOn(
      latinLibraryProvider as unknown as {
        writeWorkText: (args: {
          author: Author;
          authorPath: string;
          host: string;
          work: Text;
        }) => Promise<boolean>;
      },
      "writeWorkText",
    ).mockResolvedValue(true);

    const author = new Author();
    author.slug = "vergil";

    const work = new Text();
    work.slug = "vergil/aeneid";
    work.title = "Aeneid";

    await (
      latinLibraryProvider as unknown as {
        processWork: (args: {
          author: Author;
          authorPath: string;
          host: string;
          index: number;
          textFilter: string | undefined;
          total: number;
          work: Text;
        }) => Promise<void>;
      }
    ).processWork({
      author,
      authorPath: "/tmp/vergil",
      host: "https://www.thelatinlibrary.com/",
      index: 0,
      textFilter: undefined,
      total: 2,
      work,
    });

    expect((logger.info as ReturnType<typeof vi.fn>).mock.calls).toStrictEqual(
      expect.arrayContaining([
        ["📜 Starting work", undefined, { textSlug: "vergil/aeneid" }],
        [
          "📜 Completed work",
          undefined,
          { current: 1, percent: 50, textSlug: "vergil/aeneid", total: 2 },
        ],
      ]),
    );
  });

  it("should stop processWork before completion log when writeWorkText returns false", async () => {
    latinLibraryBuilder.getTextSlug = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue("vergil/aeneid") as never;

    vi.spyOn(
      latinLibraryProvider as unknown as {
        writeWorkText: (args: {
          author: Author;
          authorPath: string;
          host: string;
          work: Text;
        }) => Promise<boolean>;
      },
      "writeWorkText",
    ).mockResolvedValue(false);

    const author = new Author();
    author.slug = "vergil";

    const work = new Text();
    work.slug = "vergil/aeneid";
    work.title = "Aeneid";

    await (
      latinLibraryProvider as unknown as {
        processWork: (args: {
          author: Author;
          authorPath: string;
          host: string;
          index: number;
          textFilter: string | undefined;
          total: number;
          work: Text;
        }) => Promise<void>;
      }
    ).processWork({
      author,
      authorPath: "/tmp/vergil",
      host: "https://www.thelatinlibrary.com/",
      index: 0,
      textFilter: undefined,
      total: 2,
      work,
    });

    expect((logger.info as ReturnType<typeof vi.fn>).mock.calls).toStrictEqual(
      expect.arrayContaining([
        ["📜 Starting work", undefined, { textSlug: "vergil/aeneid" }],
      ]),
    );
    expect(
      (logger.info as ReturnType<typeof vi.fn>).mock.calls,
    ).not.toStrictEqual(
      expect.arrayContaining([
        [
          "📜 Completed work",
          undefined,
          { current: 1, percent: 50, textSlug: "vergil/aeneid", total: 2 },
        ],
      ]),
    );
  });

  it("should skip processWork when text filter does not match", async () => {
    latinLibraryBuilder.getTextSlug = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue("vergil/aeneid") as never;

    const writeWorkTextSpy = vi.spyOn(
      latinLibraryProvider as unknown as {
        writeWorkText: (args: {
          author: Author;
          authorPath: string;
          host: string;
          work: Text;
        }) => Promise<boolean>;
      },
      "writeWorkText",
    );

    const author = new Author();
    author.slug = "vergil";

    const work = new Text();
    work.slug = "vergil/aeneid";
    work.title = "Aeneid";

    await (
      latinLibraryProvider as unknown as {
        processWork: (args: {
          author: Author;
          authorPath: string;
          host: string;
          index: number;
          textFilter: string | undefined;
          total: number;
          work: Text;
        }) => Promise<void>;
      }
    ).processWork({
      author,
      authorPath: "/tmp/vergil",
      host: "https://www.thelatinlibrary.com/",
      index: 0,
      textFilter: "vergil/georgics",
      total: 2,
      work,
    });

    expect(writeWorkTextSpy).not.toHaveBeenCalled();
  });

  it("should log error when processWork write step throws", async () => {
    latinLibraryBuilder.getTextSlug = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue("vergil/aeneid") as never;

    vi.spyOn(
      latinLibraryProvider as unknown as {
        writeWorkText: (args: {
          author: Author;
          authorPath: string;
          host: string;
          work: Text;
        }) => Promise<boolean>;
      },
      "writeWorkText",
    ).mockRejectedValue(new Error("boom"));

    const author = new Author();
    author.slug = "vergil";

    const work = new Text();
    work.slug = "vergil/aeneid";
    work.title = "Aeneid";

    await (
      latinLibraryProvider as unknown as {
        processWork: (args: {
          author: Author;
          authorPath: string;
          host: string;
          index: number;
          textFilter: string | undefined;
          total: number;
          work: Text;
        }) => Promise<void>;
      }
    ).processWork({
      author,
      authorPath: "/tmp/vergil",
      host: "https://www.thelatinlibrary.com/",
      index: 0,
      textFilter: undefined,
      total: 2,
      work,
    });

    expect((logger.error as ReturnType<typeof vi.fn>).mock.calls).toStrictEqual(
      expect.arrayContaining([
        ["📕 Failed fetching work", expect.any(String), { title: "Aeneid" }],
      ]),
    );
  });

  it("should log provider errors without stack when processWork rejects with non-Error", async () => {
    latinLibraryBuilder.getTextSlug = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue("vergil/aeneid") as never;

    vi.spyOn(
      latinLibraryProvider as unknown as {
        writeWorkText: (args: {
          author: Author;
          authorPath: string;
          host: string;
          work: Text;
        }) => Promise<boolean>;
      },
      "writeWorkText",
    ).mockRejectedValue("boom");

    const author = new Author();
    author.slug = "vergil";

    const work = new Text();
    work.slug = "vergil/aeneid";
    work.title = "Aeneid";

    await (
      latinLibraryProvider as unknown as {
        processWork: (args: {
          author: Author;
          authorPath: string;
          host: string;
          index: number;
          textFilter: string | undefined;
          total: number;
          work: Text;
        }) => Promise<void>;
      }
    ).processWork({
      author,
      authorPath: "/tmp/vergil",
      host: "https://www.thelatinlibrary.com/",
      index: 0,
      textFilter: undefined,
      total: 2,
      work,
    });

    expect(logger.error).toHaveBeenCalledWith(
      "📕 Failed fetching work",
      undefined,
      { title: "Aeneid" },
    );
  });

  it("should write markdown under book subdirectory when workBook exists", async () => {
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);

    const work = new Text();
    work.title = "Aeneid";

    await (
      latinLibraryProvider as unknown as {
        saveWorkTextMarkdown: (args: {
          authorPath: string;
          markdown: string;
          work: Text;
          workBook: string | undefined;
        }) => Promise<void>;
      }
    ).saveWorkTextMarkdown({
      authorPath: "/tmp/vergil",
      markdown: "# Aeneid",
      work,
      workBook: "Book I",
    });

    expect(mkdirMock).toHaveBeenCalledTimes(1);
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining("book-i/aeneid.md"),
      "# Aeneid",
      "utf8",
    );
  });

  it("should normalize cache source paths for root and trailing-slash urls", async () => {
    readFileMock.mockResolvedValue("<html></html>");

    await (
      latinLibraryProvider as unknown as {
        readSourceCacheFile: (
          urlString: string,
          host: string,
        ) => Promise<string>;
      }
    ).readSourceCacheFile(
      "https://www.thelatinlibrary.com/",
      "https://www.thelatinlibrary.com/",
    );

    await (
      latinLibraryProvider as unknown as {
        readSourceCacheFile: (
          urlString: string,
          host: string,
        ) => Promise<string>;
      }
    ).readSourceCacheFile(
      "https://www.thelatinlibrary.com/authors/",
      "https://www.thelatinlibrary.com/",
    );

    expect(readFileMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("data/latin-library-source/index.html"),
      "utf8",
    );
    expect(readFileMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("data/latin-library-source/authors/index.html"),
      "utf8",
    );
  });

  it("should write markdown directly under author directory when no book exists", async () => {
    writeFileMock.mockResolvedValue(undefined);

    const work = new Text();
    work.title = "Georgics";

    await (
      latinLibraryProvider as unknown as {
        saveWorkTextMarkdown: (args: {
          authorPath: string;
          markdown: string;
          work: Text;
          workBook: string | undefined;
        }) => Promise<void>;
      }
    ).saveWorkTextMarkdown({
      authorPath: "/tmp/vergil",
      markdown: "# Georgics",
      work,
      workBook: undefined,
    });

    expect(mkdirMock).not.toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining("/tmp/vergil/georgics.md"),
      "# Georgics",
      "utf8",
    );
  });

  it("should add fallback text when author has no links", () => {
    const author = new Author();
    author.metadata = { nickname: "Vergil", sourceUrl: "vergil.html" };
    author.texts = [];

    (
      latinLibraryProvider as unknown as {
        collectAuthorTexts: (
          author: Author,
          $: cheerio.CheerioAPI,
          authorUrlObject: URL,
        ) => void;
      }
    ).collectAuthorTexts(
      author,
      cheerio.load("<html><body></body></html>"),
      new URL("https://www.thelatinlibrary.com/vergil.html"),
    );

    expect(author.texts).toHaveLength(1);
    expect(author.texts[0]?.title).toBe("Vergil");
    expect(author.texts[0]?.metadata).toStrictEqual(
      expect.objectContaining({
        sourceUrl: "https://www.thelatinlibrary.com/vergil.html",
      }),
    );
  });

  it("should cleanup book metadata on direct text entries", () => {
    const author = new Author();
    author.metadata = null;

    const text = new Text();
    text.metadata = { book: "Book I", sourceUrl: "georgics.html" };
    text.slug = "georgics";
    text.title = "Georgics";
    text.type = "text";

    author.texts = [text];

    (
      latinLibraryProvider as unknown as {
        cleanupAuthorMetadata: (author: Author) => void;
      }
    ).cleanupAuthorMetadata(author);

    expect(text.metadata).toStrictEqual({ sourceUrl: "georgics.html" });
  });

  it("should skip cleanup when child and direct text metadata are missing", () => {
    const author = new Author();
    author.metadata = { nickname: "Vergil" };

    const childText = new Text();
    childText.metadata = null;
    childText.slug = "aeneid";
    childText.title = "Aeneid";
    childText.type = "text";

    const bookText = new Text();
    bookText.childTexts = [childText];
    bookText.type = "book";

    const directText = new Text();
    directText.metadata = null;
    directText.slug = "georgics";
    directText.title = "Georgics";
    directText.type = "text";

    author.texts = [bookText, directText];

    (
      latinLibraryProvider as unknown as {
        cleanupAuthorMetadata: (authorToClean: Author) => void;
      }
    ).cleanupAuthorMetadata(author);

    expect(author.metadata["nickname"]).toBeUndefined();
    expect(childText.metadata).toBeNull();
    expect(directText.metadata).toBeNull();
  });

  it("should process each anchor while collecting author texts", () => {
    const author = new Author();
    author.metadata = { nickname: "Vergil", sourceUrl: "vergil.html" };
    author.slug = "vergil";
    author.texts = [new Text()];

    const page = cheerio.load(`
      <body>
        <a href="aeneid.html">Aeneid</a>
        <a href="georgics.html">Georgics</a>
      </body>
    `);

    const processTextLinkSpy = vi
      .spyOn(
        latinLibraryProvider as unknown as {
          processTextLink: (args: {
            $: cheerio.CheerioAPI;
            anchor: AnyNode;
            author: Author;
            authorUrlObject: URL;
            booksMap: Map<string, Text>;
          }) => void;
        },
        "processTextLink",
      )
      .mockImplementation(() => {});

    (
      latinLibraryProvider as unknown as {
        collectAuthorTexts: (
          author: Author,
          cheerioApi: cheerio.CheerioAPI,
          authorUrlObject: URL,
        ) => void;
      }
    ).collectAuthorTexts(
      author,
      page,
      new URL("https://www.thelatinlibrary.com/vergil.html"),
    );

    expect(processTextLinkSpy).toHaveBeenCalledTimes(2);
  });

  it("should expand category authors from category pages", async () => {
    const categoryAuthor = new Author();
    categoryAuthor.metadata = {
      nickname: "Category",
      sourceUrl: "christian.html",
    };
    categoryAuthor.slug = "category";
    categoryAuthor.texts = [];

    const expandedAuthor = new Author();
    expandedAuthor.metadata = { nickname: "Expanded", sourceUrl: "exp.html" };
    expandedAuthor.slug = "expanded";
    expandedAuthor.texts = [];

    vi.spyOn(
      latinLibraryProvider as unknown as {
        readSourceCacheFile: (
          urlString: string,
          host: string,
        ) => Promise<string>;
      },
      "readSourceCacheFile",
    ).mockResolvedValue(
      `<table><tr><td><a href="exp.html">Expanded</a></td></tr></table>`,
    );

    latinLibraryBuilder.buildCategoryAuthor = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue(expandedAuthor) as never;

    const authors = await (
      latinLibraryProvider as unknown as {
        expandCategoryAuthors: (
          rootAuthors: Author[],
          host: string,
        ) => Promise<Author[]>;
      }
    ).expandCategoryAuthors(
      [categoryAuthor],
      "https://www.thelatinlibrary.com/",
    );

    expect(authors).toHaveLength(1);
    expect(authors[0]?.slug).toBe("expanded");
  });

  it("should skip null category author results during expansion", async () => {
    const categoryAuthor = new Author();
    categoryAuthor.metadata = {
      nickname: "Category",
      sourceUrl: "christian.html",
    };
    categoryAuthor.slug = "category";
    categoryAuthor.texts = [];

    vi.spyOn(
      latinLibraryProvider as unknown as {
        readSourceCacheFile: (
          urlString: string,
          host: string,
        ) => Promise<string>;
      },
      "readSourceCacheFile",
    ).mockResolvedValue(
      `<table><tr><td><a href="exp.html">Expanded</a></td></tr></table>`,
    );

    latinLibraryBuilder.buildCategoryAuthor = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockReturnValue(null) as never;

    const authors = await (
      latinLibraryProvider as unknown as {
        expandCategoryAuthors: (
          rootAuthors: Author[],
          host: string,
        ) => Promise<Author[]>;
      }
    ).expandCategoryAuthors(
      [categoryAuthor],
      "https://www.thelatinlibrary.com/",
    );

    expect(authors).toStrictEqual([]);
  });

  it("should keep non-category authors without category expansion", async () => {
    const directAuthor = new Author();
    directAuthor.metadata = {
      nickname: "Vergil",
      sourceUrl: "vergil.html",
    };
    directAuthor.slug = "vergil";
    directAuthor.texts = [];

    const buildCategoryAuthorSpy = vi.spyOn(
      latinLibraryProvider as unknown as {
        buildCategoryAuthor: (
          anchorElement: AnyNode,
          cheerioApi: cheerio.CheerioAPI,
        ) => Author | null;
      },
      "buildCategoryAuthor",
    );

    const authors = await (
      latinLibraryProvider as unknown as {
        expandCategoryAuthors: (
          rootAuthors: Author[],
          host: string,
        ) => Promise<Author[]>;
      }
    ).expandCategoryAuthors([directAuthor], "https://www.thelatinlibrary.com/");

    expect(authors).toHaveLength(1);
    expect(authors[0]).toBe(directAuthor);
    expect(buildCategoryAuthorSpy).not.toHaveBeenCalled();
  });

  it("should skip writeAuthorTexts when author option does not match", async () => {
    const processWorkSpy = vi.spyOn(
      latinLibraryProvider as unknown as {
        processWork: (args: {
          author: Author;
          authorPath: string;
          host: string;
          index: number;
          textFilter: string | undefined;
          total: number;
          work: Text;
        }) => Promise<void>;
      },
      "processWork",
    );

    const author = new Author();
    author.slug = "vergil";
    author.texts = [];

    await (
      latinLibraryProvider as unknown as {
        writeAuthorTexts: (args: {
          author: Author;
          dataPath: string;
          host: string;
          options?: { author?: string; text?: string };
        }) => Promise<void>;
      }
    ).writeAuthorTexts({
      author,
      dataPath: "/tmp/library",
      host: "https://www.thelatinlibrary.com/",
      options: { author: "other" },
    });

    expect(processWorkSpy).not.toHaveBeenCalled();
  });

  it("should write and flatten author texts when options author matches", async () => {
    mkdirMock.mockResolvedValue(undefined);

    const processWorkSpy = vi
      .spyOn(
        latinLibraryProvider as unknown as {
          processWork: (args: {
            author: Author;
            authorPath: string;
            host: string;
            index: number;
            textFilter: string | undefined;
            total: number;
            work: Text;
          }) => Promise<void>;
        },
        "processWork",
      )
      .mockResolvedValue(undefined);

    const bookWork = new Text();
    bookWork.slug = "vergil/aeneid";
    bookWork.title = "Aeneid";
    bookWork.type = "text";

    const directWork = new Text();
    directWork.slug = "vergil/georgics";
    directWork.title = "Georgics";
    directWork.type = "text";

    const book = new Text();
    book.type = "book";
    book.childTexts = [bookWork];

    const author = new Author();
    author.slug = "vergil";
    author.texts = [book, directWork];

    await (
      latinLibraryProvider as unknown as {
        writeAuthorTexts: (args: {
          author: Author;
          dataPath: string;
          host: string;
          options?: { author?: string; text?: string };
        }) => Promise<void>;
      }
    ).writeAuthorTexts({
      author,
      dataPath: "/tmp/library",
      host: "https://www.thelatinlibrary.com/",
      options: { author: "vergil", text: "vergil/aeneid" },
    });

    expect(mkdirMock).toHaveBeenCalledWith("/tmp/library/vergil", {
      recursive: true,
    });
    expect(processWorkSpy).toHaveBeenCalledTimes(2);
    expect(processWorkSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        index: 0,
        textFilter: "vergil/aeneid",
        total: 2,
        work: bookWork,
      }),
    );
    expect(processWorkSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        index: 1,
        textFilter: "vergil/aeneid",
        total: 2,
        work: directWork,
      }),
    );
  });

  it("should write author texts without filter options", async () => {
    mkdirMock.mockResolvedValue(undefined);

    const processWorkSpy = vi
      .spyOn(
        latinLibraryProvider as unknown as {
          processWork: (args: {
            author: Author;
            authorPath: string;
            host: string;
            index: number;
            textFilter: string | undefined;
            total: number;
            work: Text;
          }) => Promise<void>;
        },
        "processWork",
      )
      .mockResolvedValue(undefined);

    const directWork = new Text();
    directWork.slug = "vergil/georgics";
    directWork.title = "Georgics";
    directWork.type = "text";

    const author = new Author();
    author.slug = "vergil";
    author.texts = [directWork];

    await (
      latinLibraryProvider as unknown as {
        writeAuthorTexts: (args: {
          author: Author;
          dataPath: string;
          host: string;
          options?: { author?: string; text?: string };
        }) => Promise<void>;
      }
    ).writeAuthorTexts({
      author,
      dataPath: "/tmp/library",
      host: "https://www.thelatinlibrary.com/",
    });

    expect(processWorkSpy).toHaveBeenCalledTimes(1);
    expect(processWorkSpy).toHaveBeenCalledWith(
      expect.objectContaining({ textFilter: undefined, total: 1 }),
    );
  });

  it("should ingest from cache and cleanup metadata", async () => {
    mkdirMock.mockResolvedValue(undefined);
    readFileMock.mockResolvedValue("<html></html>");

    const author = new Author();
    author.metadata = { nickname: "vergil", sourceUrl: "vergil.html" };
    author.slug = "vergil";
    author.texts = [];

    vi.spyOn(
      latinLibraryProvider as unknown as {
        buildRootAuthors: (html: string) => Author[];
      },
      "buildRootAuthors",
    ).mockReturnValue([author]);

    vi.spyOn(
      latinLibraryProvider as unknown as {
        expandCategoryAuthors: (
          rootAuthors: Author[],
          host: string,
        ) => Promise<Author[]>;
      },
      "expandCategoryAuthors",
    ).mockResolvedValue([author]);

    vi.spyOn(
      latinLibraryProvider as unknown as {
        processAuthorPage: (author: Author, host: string) => Promise<void>;
      },
      "processAuthorPage",
    ).mockResolvedValue(undefined);

    vi.spyOn(
      latinLibraryProvider as unknown as {
        writeAuthorTexts: (args: {
          author: Author;
          dataPath: string;
          host: string;
          options?: { author?: string; text?: string };
        }) => Promise<void>;
      },
      "writeAuthorTexts",
    ).mockResolvedValue(undefined);

    const authors = await latinLibraryProvider.ingest({ author: "vergil" });

    expect(authors).toHaveLength(1);
    expect(authors[0]?.metadata?.["nickname"]).toBeUndefined();
  });

  it("should ingest without options and call writeAuthorTexts without options", async () => {
    mkdirMock.mockResolvedValue(undefined);
    readFileMock.mockResolvedValue("<html></html>");

    const authorWithNickname = new Author();
    authorWithNickname.metadata = {
      nickname: "Vergil",
      sourceUrl: "vergil.html",
    };
    authorWithNickname.slug = "vergil";
    authorWithNickname.texts = [];

    const authorWithoutNickname = new Author();
    authorWithoutNickname.metadata = { sourceUrl: "unknown.html" };
    authorWithoutNickname.slug = "unknown";
    authorWithoutNickname.texts = [];

    vi.spyOn(
      latinLibraryProvider as unknown as {
        buildRootAuthors: (html: string) => Author[];
      },
      "buildRootAuthors",
    ).mockReturnValue([authorWithNickname, authorWithoutNickname]);

    vi.spyOn(
      latinLibraryProvider as unknown as {
        expandCategoryAuthors: (
          rootAuthors: Author[],
          host: string,
        ) => Promise<Author[]>;
      },
      "expandCategoryAuthors",
    ).mockResolvedValue([authorWithNickname, authorWithoutNickname]);

    vi.spyOn(
      latinLibraryProvider as unknown as {
        processAuthorPage: (author: Author, host: string) => Promise<void>;
      },
      "processAuthorPage",
    ).mockResolvedValue(undefined);

    const writeAuthorTextsSpy = vi
      .spyOn(
        latinLibraryProvider as unknown as {
          writeAuthorTexts: (args: {
            author: Author;
            dataPath: string;
            host: string;
            options?: { author?: string; text?: string };
          }) => Promise<void>;
        },
        "writeAuthorTexts",
      )
      .mockResolvedValue(undefined);

    await latinLibraryProvider.ingest();

    expect(writeAuthorTextsSpy).toHaveBeenCalledTimes(2);

    for (const callArguments of writeAuthorTextsSpy.mock.calls) {
      const argumentObject = callArguments[0];

      expect(argumentObject.options).toBeUndefined();
    }
  });

  it("should only process matching author metadata when ingest receives author option", async () => {
    mkdirMock.mockResolvedValue(undefined);
    readFileMock.mockResolvedValue("<html></html>");

    const vergil = new Author();
    vergil.metadata = { nickname: "Vergil", sourceUrl: "vergil.html" };
    vergil.slug = "vergil";
    vergil.texts = [];

    const cicero = new Author();
    cicero.metadata = { nickname: "Cicero", sourceUrl: "cicero.html" };
    cicero.slug = "cicero";
    cicero.texts = [];

    vi.spyOn(
      latinLibraryProvider as unknown as {
        buildRootAuthors: (html: string) => Author[];
      },
      "buildRootAuthors",
    ).mockReturnValue([vergil, cicero]);

    vi.spyOn(
      latinLibraryProvider as unknown as {
        expandCategoryAuthors: (
          rootAuthors: Author[],
          host: string,
        ) => Promise<Author[]>;
      },
      "expandCategoryAuthors",
    ).mockResolvedValue([vergil, cicero]);

    const processAuthorPageSpy = vi
      .spyOn(
        latinLibraryProvider as unknown as {
          processAuthorPage: (author: Author, host: string) => Promise<void>;
        },
        "processAuthorPage",
      )
      .mockResolvedValue(undefined);

    vi.spyOn(
      latinLibraryProvider as unknown as {
        writeAuthorTexts: (args: {
          author: Author;
          dataPath: string;
          host: string;
          options?: { author?: string; text?: string };
        }) => Promise<void>;
      },
      "writeAuthorTexts",
    ).mockResolvedValue(undefined);

    await latinLibraryProvider.ingest({ author: "vergil" });

    expect(processAuthorPageSpy).toHaveBeenCalledTimes(1);
    expect(processAuthorPageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "vergil" }),
      "https://www.thelatinlibrary.com/",
    );
  });
});
