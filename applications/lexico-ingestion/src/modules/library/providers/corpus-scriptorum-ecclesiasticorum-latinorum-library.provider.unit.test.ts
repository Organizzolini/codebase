import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import * as cheerio from "cheerio";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Author, type Text } from "@codebase/lexico-entities";

import { CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider } from "./corpus-scriptorum-ecclesiasticorum-latinorum-library.provider";

import type { LoggerService } from "@codebase/logging";

const { mkdirMock, readdirMock, readFileMock, writeFileMock } = vi.hoisted(
  () => ({
    mkdirMock: vi.fn<() => Promise<string | undefined>>(),
    readdirMock: vi.fn<() => Promise<unknown[]>>(),
    readFileMock: vi.fn<() => Promise<string>>(),
    writeFileMock: vi.fn<() => Promise<void>>(),
  }),
);

vi.mock("node:fs/promises", () => ({
  mkdir: mkdirMock,
  readdir: readdirMock,
  readFile: readFileMock,
  writeFile: writeFileMock,
}));

describe(CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider, () => {
  const logger: DeepMocked<LoggerService> = createMock<LoggerService>();

  const corpusScriptorumEcclesiasticorumLatinorumLibraryProvider =
    new CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider(logger);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize the provider instance", () => {
    expect(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
    ).toBeDefined();
    expect(corpusScriptorumEcclesiasticorumLatinorumLibraryProvider.name).toBe(
      "corpus-scriptorum-ecclesiasticorum-latinorum",
    );
  });

  it("should check author and text filters", () => {
    const checkTextFilter = (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        checkTextFilter: (
          options: undefined | { author?: string; text?: string },
          authorSlug: string,
          textSlug: string,
        ) => boolean;
      }
    ).checkTextFilter.bind(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
    );

    expect(
      checkTextFilter({ author: "other" }, "vergil", "vergil/aeneid"),
    ).toBe(true);
    expect(
      checkTextFilter({ text: "vergil/georgics" }, "vergil", "vergil/aeneid"),
    ).toBe(true);
    expect(
      checkTextFilter({ author: "vergil" }, "vergil", "vergil/aeneid"),
    ).toBe(false);
  });

  it("should extract metadata and paragraphs from xml", () => {
    const page = cheerio.load(
      `<TEI>
        <titleStmt>
          <editor>Editor One</editor>
          <editor>Editor Two</editor>
        </titleStmt>
        <sourceDesc>
          <biblStruct>
            <publisher>Publisher</publisher>
            <date>1900</date>
          </biblStruct>
        </sourceDesc>
        <body>
          <p n="1">sample <note>ignore</note> content</p>
          <l>verse</l>
        </body>
      </TEI>`,
      { xml: true },
    );

    const getMetadata = (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        getMetadata: (page: cheerio.CheerioAPI) => Record<string, string>;
      }
    ).getMetadata.bind(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
    );

    const extractParagraphs = (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        extractParagraphs: (page: cheerio.CheerioAPI) => string[];
      }
    ).extractParagraphs.bind(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
    );

    const metadata = getMetadata(page);
    const paragraphs = extractParagraphs(page);

    expect(metadata).toStrictEqual(
      expect.objectContaining({
        editors: "Editor One, Editor Two",
        print_publication_date: "1900",
        publisher: "Publisher",
      }),
    );
    expect(paragraphs).toStrictEqual(["**1** sample content", "verse"]);
  });

  it("should skip empty paragraphs after note cleanup", () => {
    const page = cheerio.load(
      `<TEI>
        <body>
          <p><note>remove me</note></p>
          <p>kept line</p>
        </body>
      </TEI>`,
      { xml: true },
    );

    const extractParagraphs = (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        extractParagraphs: (cheerioApi: cheerio.CheerioAPI) => string[];
      }
    ).extractParagraphs.bind(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
    );

    const paragraphs = extractParagraphs(page);

    expect(paragraphs).toStrictEqual(["kept line"]);
  });

  it("should extract metadata using fallback sourceDesc selectors", () => {
    const page = cheerio.load(
      `<TEI>
        <titleStmt><editor>Editor</editor></titleStmt>
        <sourceDesc>
          <publisher>Fallback Publisher</publisher>
          <date>1899</date>
        </sourceDesc>
      </TEI>`,
      { xml: true },
    );

    const getMetadata = (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        getMetadata: (cheerioApi: cheerio.CheerioAPI) => Record<string, string>;
      }
    ).getMetadata.bind(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
    );

    const metadata = getMetadata(page);

    expect(metadata).toStrictEqual(
      expect.objectContaining({
        editors: "Editor",
        print_publication_date: "1899",
        publisher: "Fallback Publisher",
      }),
    );
  });

  it("should skip textpart div wrappers that contain child p or l nodes", () => {
    const page = cheerio.load(
      `<TEI>
        <body>
          <div type="textpart"><p>nested</p></div>
          <div type="textpart">outer text</div>
        </body>
      </TEI>`,
      { xml: true },
    );

    const extractParagraphs = (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        extractParagraphs: (cheerioApi: cheerio.CheerioAPI) => string[];
      }
    ).extractParagraphs.bind(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
    );

    const paragraphs = extractParagraphs(page);

    expect(paragraphs).toStrictEqual(["nested", "outer text"]);
  });

  it("should build markdown content and return null for invalid text", () => {
    const buildCselTextContent = (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        buildCselTextContent: (args: {
          authorSlug: string;
          metadata: Record<string, string>;
          paragraphs: string[];
          rawTitle: string;
          relativeSourcePath: string;
        }) => null | string;
      }
    ).buildCselTextContent.bind(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
    );

    const markdown = buildCselTextContent({
      authorSlug: "vergil",
      metadata: { publisher: "Publisher" },
      paragraphs: ["sample content verse"],
      rawTitle: "Aeneid",
      relativeSourcePath: "data/aeneid.xml",
    });

    const invalid = buildCselTextContent({
      authorSlug: "vergil",
      metadata: {},
      paragraphs: ["12345"],
      rawTitle: "Aeneid",
      relativeSourcePath: "data/aeneid.xml",
    });

    expect(markdown).toContain("title: Aeneid");
    expect(markdown).toContain("source_url");
    expect(invalid).toBeNull();
  });

  it("should create text entity and attach source metadata", () => {
    const createCselTextEntity = (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        createCselTextEntity: (args: {
          metadata: Record<string, string>;
          rawTitle: string;
          relativeSourcePath: string;
          titleSlug: string;
        }) => Text;
      }
    ).createCselTextEntity.bind(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
    );

    const textEntity = createCselTextEntity({
      metadata: { publisher: "Publisher" },
      rawTitle: "Aeneid",
      relativeSourcePath: "data/aeneid.xml",
      titleSlug: "aeneid",
    });

    expect(textEntity.title).toBe("Aeneid");
    expect(textEntity.slug).toBe("aeneid");
    expect(textEntity.metadata).toStrictEqual(
      expect.objectContaining({
        publisher: "Publisher",
        sourceUrl: "data/aeneid.xml",
      }),
    );
  });

  it("should collect source xml paths and handle read failures", async () => {
    readdirMock.mockResolvedValueOnce([
      {
        isFile: () => true,
        name: "aeneid.xml",
        parentPath: "/tmp/csel/data",
      },
      {
        isFile: () => false,
        name: "folder",
        parentPath: "/tmp/csel/data",
      },
    ] as unknown[]);

    const collectSourceXmlPaths = (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        collectSourceXmlPaths: (
          sourceDataDirectory: string,
        ) => Promise<null | string[]>;
      }
    ).collectSourceXmlPaths.bind(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
    );

    const paths = await collectSourceXmlPaths("/tmp/csel/data");

    readdirMock.mockRejectedValueOnce(new Error("missing"));
    const missing = await collectSourceXmlPaths("/tmp/csel/missing");

    expect(paths).toStrictEqual(["/tmp/csel/data/aeneid.xml"]);
    expect(missing).toBeNull();
  });

  it("should parse source xml metadata and apply filters", async () => {
    readFileMock.mockResolvedValueOnce(
      `<TEI><titleStmt><author>Vergil</author><title>Aeneid</title></titleStmt><body><p>sample</p></body></TEI>`,
    );

    const parseSourceXmlFile = (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        parseSourceXmlFile: (args: {
          options: undefined | { author?: string; text?: string };
          sourceDataDirectory: string;
          xmlPath: string;
        }) => Promise<null | {
          $: cheerio.CheerioAPI;
          resolved: {
            authorSlug: string;
            metadata: Record<string, string>;
            rawAuthor: string;
            rawTitle: string;
            relativeSourcePath: string;
            textSlug: string;
            titleSlug: string;
          };
        }>;
      }
    ).parseSourceXmlFile.bind(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
    );

    const parsed = await parseSourceXmlFile({
      options: { author: "vergil" },
      sourceDataDirectory: "/tmp/csel",
      xmlPath: "/tmp/csel/data/aeneid.xml",
    });

    readFileMock.mockResolvedValueOnce(
      `<TEI><titleStmt><author>Vergil</author><title>Aeneid</title></titleStmt><body><p>sample</p></body></TEI>`,
    );
    const filtered = await parseSourceXmlFile({
      options: { author: "other" },
      sourceDataDirectory: "/tmp/csel",
      xmlPath: "/tmp/csel/data/aeneid.xml",
    });

    expect(parsed?.resolved.authorSlug).toBe("vergil");
    expect(parsed?.resolved.titleSlug).toBe("aeneid");
    expect(filtered).toBeNull();
  });

  it("should resolve missing author and title using unknown fallbacks", () => {
    const page = cheerio.load(`<TEI><titleStmt></titleStmt></TEI>`, {
      xml: true,
    });

    const resolveSourceXmlMetadata = (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        resolveSourceXmlMetadata: (args: {
          $: cheerio.CheerioAPI;
          options: undefined | { author?: string; text?: string };
          sourceDataDirectory: string;
          xmlPath: string;
        }) => null | {
          authorSlug: string;
          metadata: Record<string, string>;
          rawAuthor: string;
          rawTitle: string;
          relativeSourcePath: string;
          textSlug: string;
          titleSlug: string;
        };
      }
    ).resolveSourceXmlMetadata.bind(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
    );

    const resolved = resolveSourceXmlMetadata({
      $: page,
      options: undefined,
      sourceDataDirectory: "/tmp/csel",
      xmlPath: "/tmp/csel/data/unknown.xml",
    });

    expect(resolved).toStrictEqual(
      expect.objectContaining({
        authorSlug: "unknown-author",
        rawAuthor: "Unknown Author",
        rawTitle: "Unknown Title",
        titleSlug: "unknown-title",
      }),
    );
  });

  it("should reuse existing author from map when creating source entries", () => {
    const existingAuthor = new Author();
    existingAuthor.name = "Vergil";
    existingAuthor.slug = "vergil";
    existingAuthor.texts = [];

    const authorsMap = new Map<string, Author>([["vergil", existingAuthor]]);

    const author = (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        getOrCreateAuthor: (args: {
          authorSlug: string;
          authorsMap: Map<string, Author>;
          rawAuthor: string;
          relativeSourcePath: string;
        }) => Author;
      }
    ).getOrCreateAuthor({
      authorSlug: "vergil",
      authorsMap,
      rawAuthor: "Vergil",
      relativeSourcePath: "data/aeneid.xml",
    });

    expect(author).toBe(existingAuthor);
    expect(authorsMap.size).toBe(1);
  });

  it("should stop processing source file when parsed metadata is null", async () => {
    const parseSourceXmlFileSpy = vi
      .spyOn(
        corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
          parseSourceXmlFile: (args: {
            options: undefined | { author?: string; text?: string };
            sourceDataDirectory: string;
            xmlPath: string;
          }) => Promise<null | Record<string, unknown>>;
        },
        "parseSourceXmlFile",
      )
      .mockResolvedValue(null);

    const writeSourceTextForAuthorSpy = vi.spyOn(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        writeSourceTextForAuthor: (args: {
          $: cheerio.CheerioAPI;
          author: Author;
          dataPath: string;
          resolved: {
            authorSlug: string;
            metadata: Record<string, string>;
            rawTitle: string;
            relativeSourcePath: string;
            titleSlug: string;
          };
        }) => Promise<boolean>;
      },
      "writeSourceTextForAuthor",
    );

    await (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        processSourceXmlFile: (args: {
          authorsMap: Map<string, Author>;
          dataPath: string;
          index: number;
          options: undefined | { author?: string; text?: string };
          sourceDataDirectory: string;
          totalFiles: number;
          xmlPath: string;
        }) => Promise<void>;
      }
    ).processSourceXmlFile({
      authorsMap: new Map(),
      dataPath: "/tmp/library",
      index: 0,
      options: undefined,
      sourceDataDirectory: "/tmp/csel",
      totalFiles: 1,
      xmlPath: "/tmp/csel/aeneid.xml",
    });

    expect(parseSourceXmlFileSpy).toHaveBeenCalledTimes(1);
    expect(writeSourceTextForAuthorSpy).not.toHaveBeenCalled();
  });

  it("should log warning when processing source file throws", async () => {
    vi.spyOn(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        parseSourceXmlFile: (args: {
          options: undefined | { author?: string; text?: string };
          sourceDataDirectory: string;
          xmlPath: string;
        }) => Promise<null | Record<string, unknown>>;
      },
      "parseSourceXmlFile",
    ).mockRejectedValue(new Error("parse failure"));

    await (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        processSourceXmlFile: (args: {
          authorsMap: Map<string, Author>;
          dataPath: string;
          index: number;
          options: undefined | { author?: string; text?: string };
          sourceDataDirectory: string;
          totalFiles: number;
          xmlPath: string;
        }) => Promise<void>;
      }
    ).processSourceXmlFile({
      authorsMap: new Map(),
      dataPath: "/tmp/library",
      index: 0,
      options: undefined,
      sourceDataDirectory: "/tmp/csel",
      totalFiles: 1,
      xmlPath: "/tmp/csel/aeneid.xml",
    });

    expect(logger.warn).toHaveBeenCalledWith(
      "📜 Failed processing",
      undefined,
      expect.objectContaining({ xmlPath: "/tmp/csel/aeneid.xml" }),
    );
  });

  it("should process source file, append text, and log completion", async () => {
    vi.useFakeTimers();

    const page = cheerio.load(
      `<TEI><body><p>sample content verse</p></body></TEI>`,
      { xml: true },
    );

    vi.spyOn(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        parseSourceXmlFile: (args: {
          options: undefined | { author?: string; text?: string };
          sourceDataDirectory: string;
          xmlPath: string;
        }) => Promise<null | {
          $: cheerio.CheerioAPI;
          resolved: {
            authorSlug: string;
            metadata: Record<string, string>;
            rawAuthor: string;
            rawTitle: string;
            relativeSourcePath: string;
            textSlug: string;
            titleSlug: string;
          };
        }>;
      },
      "parseSourceXmlFile",
    ).mockResolvedValue({
      $: page,
      resolved: {
        authorSlug: "vergil",
        metadata: {},
        rawAuthor: "Vergil",
        rawTitle: "Aeneid",
        relativeSourcePath: "data/aeneid.xml",
        textSlug: "vergil/aeneid",
        titleSlug: "aeneid",
      },
    });

    vi.spyOn(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        writeSourceTextForAuthor: (args: {
          $: cheerio.CheerioAPI;
          author: Author;
          dataPath: string;
          resolved: {
            authorSlug: string;
            metadata: Record<string, string>;
            rawTitle: string;
            relativeSourcePath: string;
            titleSlug: string;
          };
        }) => Promise<boolean>;
      },
      "writeSourceTextForAuthor",
    ).mockResolvedValue(true);

    const promise = (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        processSourceXmlFile: (args: {
          authorsMap: Map<string, Author>;
          dataPath: string;
          index: number;
          options: undefined | { author?: string; text?: string };
          sourceDataDirectory: string;
          totalFiles: number;
          xmlPath: string;
        }) => Promise<void>;
      }
    ).processSourceXmlFile({
      authorsMap: new Map(),
      dataPath: "/tmp/library",
      index: 0,
      options: undefined,
      sourceDataDirectory: "/tmp/csel",
      totalFiles: 2,
      xmlPath: "/tmp/csel/aeneid.xml",
    });

    await vi.runAllTimersAsync();
    await promise;

    expect(logger.info).toHaveBeenCalledWith(
      "📜 Completed processing",
      undefined,
      expect.objectContaining({ xmlPath: "/tmp/csel/aeneid.xml" }),
    );

    vi.useRealTimers();
  });

  it("should warn and stop source processing when author text write returns false", async () => {
    const page = cheerio.load(`<TEI><body><p>sample</p></body></TEI>`, {
      xml: true,
    });

    vi.spyOn(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        parseSourceXmlFile: (args: {
          options: undefined | { author?: string; text?: string };
          sourceDataDirectory: string;
          xmlPath: string;
        }) => Promise<null | {
          $: cheerio.CheerioAPI;
          resolved: {
            authorSlug: string;
            metadata: Record<string, string>;
            rawAuthor: string;
            rawTitle: string;
            relativeSourcePath: string;
            textSlug: string;
            titleSlug: string;
          };
        }>;
      },
      "parseSourceXmlFile",
    ).mockResolvedValue({
      $: page,
      resolved: {
        authorSlug: "vergil",
        metadata: {},
        rawAuthor: "Vergil",
        rawTitle: "Aeneid",
        relativeSourcePath: "data/aeneid.xml",
        textSlug: "vergil/aeneid",
        titleSlug: "aeneid",
      },
    });

    vi.spyOn(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        writeSourceTextForAuthor: (args: {
          $: cheerio.CheerioAPI;
          author: Author;
          dataPath: string;
          resolved: {
            authorSlug: string;
            metadata: Record<string, string>;
            rawTitle: string;
            relativeSourcePath: string;
            titleSlug: string;
          };
        }) => Promise<boolean>;
      },
      "writeSourceTextForAuthor",
    ).mockResolvedValue(false);

    await (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        processSourceXmlFile: (args: {
          authorsMap: Map<string, Author>;
          dataPath: string;
          index: number;
          options: undefined | { author?: string; text?: string };
          sourceDataDirectory: string;
          totalFiles: number;
          xmlPath: string;
        }) => Promise<void>;
      }
    ).processSourceXmlFile({
      authorsMap: new Map(),
      dataPath: "/tmp/library",
      index: 0,
      options: undefined,
      sourceDataDirectory: "/tmp/csel",
      totalFiles: 1,
      xmlPath: "/tmp/csel/aeneid.xml",
    });

    expect(logger.warn).toHaveBeenCalledWith(
      "📜 Skipping empty or invalid text",
      undefined,
      { textSlug: "vergil/aeneid" },
    );
  });

  it("should return false from writeSourceTextForAuthor when no paragraphs are extracted", async () => {
    const author = new Author();
    author.slug = "vergil";
    author.texts = [];

    vi.spyOn(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        extractParagraphs: (cheerioApi: cheerio.CheerioAPI) => string[];
      },
      "extractParagraphs",
    ).mockReturnValue([]);

    const success = await (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        writeSourceTextForAuthor: (args: {
          $: cheerio.CheerioAPI;
          author: Author;
          dataPath: string;
          resolved: {
            authorSlug: string;
            metadata: Record<string, string>;
            rawTitle: string;
            relativeSourcePath: string;
            titleSlug: string;
          };
        }) => Promise<boolean>;
      }
    ).writeSourceTextForAuthor({
      $: cheerio.load(`<TEI></TEI>`, { xml: true }),
      author,
      dataPath: "/tmp/library",
      resolved: {
        authorSlug: "vergil",
        metadata: {},
        rawTitle: "Aeneid",
        relativeSourcePath: "data/aeneid.xml",
        titleSlug: "aeneid",
      },
    });

    expect(success).toBe(false);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("should write source text for author", async () => {
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);

    const author = new Author();
    author.slug = "vergil";
    author.texts = [];

    const page = cheerio.load(
      `<TEI><body><p>sample content verse</p></body></TEI>`,
      {
        xml: true,
      },
    );

    const result = await (
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        writeSourceTextForAuthor: (args: {
          $: cheerio.CheerioAPI;
          author: Author;
          dataPath: string;
          resolved: {
            authorSlug: string;
            metadata: Record<string, string>;
            rawTitle: string;
            relativeSourcePath: string;
            titleSlug: string;
          };
        }) => Promise<boolean>;
      }
    ).writeSourceTextForAuthor({
      $: page,
      author,
      dataPath: "/tmp/library",
      resolved: {
        authorSlug: "vergil",
        metadata: {},
        rawTitle: "Aeneid",
        relativeSourcePath: "data/aeneid.xml",
        titleSlug: "aeneid",
      },
    });

    expect(result).toBe(true);
  });

  it("should ingest xml files from local source cache", async () => {
    mkdirMock.mockResolvedValue(undefined);

    vi.spyOn(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        collectSourceXmlPaths: (
          sourceDataDirectory: string,
        ) => Promise<null | string[]>;
      },
      "collectSourceXmlPaths",
    ).mockResolvedValue(["/tmp/csel/aeneid.xml"]);

    vi.spyOn(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        processSourceXmlFile: (args: {
          authorsMap: Map<string, Author>;
          dataPath: string;
          index: number;
          options: undefined | { author?: string; text?: string };
          sourceDataDirectory: string;
          totalFiles: number;
          xmlPath: string;
        }) => Promise<void>;
      },
      "processSourceXmlFile",
    ).mockImplementation(async ({ authorsMap }): Promise<void> => {
      await Promise.resolve();
      const author = new Author();
      author.slug = "vergil";
      author.texts = [];
      authorsMap.set("vergil", author);
    });

    const authors =
      await corpusScriptorumEcclesiasticorumLatinorumLibraryProvider.ingest();

    expect(authors).toHaveLength(1);
    expect(authors[0]?.slug).toBe("vergil");
  });

  it("should return empty authors when source xml collection fails", async () => {
    vi.spyOn(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        collectSourceXmlPaths: (
          sourceDataDirectory: string,
        ) => Promise<null | string[]>;
      },
      "collectSourceXmlPaths",
    ).mockResolvedValueOnce(null);

    const authors =
      await corpusScriptorumEcclesiasticorumLatinorumLibraryProvider.ingest();

    expect(authors).toStrictEqual([]);
  });

  it("should skip undefined xml entries during ingest loop", async () => {
    vi.spyOn(
      corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
        collectSourceXmlPaths: (
          sourceDataDirectory: string,
        ) => Promise<null | string[]>;
      },
      "collectSourceXmlPaths",
    ).mockResolvedValueOnce([
      undefined as unknown as string,
      "/tmp/csel/data/aeneid.xml",
    ]);

    const processSourceXmlFileSpy = vi
      .spyOn(
        corpusScriptorumEcclesiasticorumLatinorumLibraryProvider as unknown as {
          processSourceXmlFile: (args: {
            authorsMap: Map<string, Author>;
            dataPath: string;
            index: number;
            options: undefined | { author?: string; text?: string };
            sourceDataDirectory: string;
            totalFiles: number;
            xmlPath: string;
          }) => Promise<void>;
        },
        "processSourceXmlFile",
      )
      .mockResolvedValue(undefined);

    const authors =
      await corpusScriptorumEcclesiasticorumLatinorumLibraryProvider.ingest();

    expect(processSourceXmlFileSpy).toHaveBeenCalledTimes(1);
    expect(processSourceXmlFileSpy).toHaveBeenCalledWith(
      expect.objectContaining({ xmlPath: "/tmp/csel/data/aeneid.xml" }),
    );
    expect(authors).toStrictEqual([]);
  });
});
