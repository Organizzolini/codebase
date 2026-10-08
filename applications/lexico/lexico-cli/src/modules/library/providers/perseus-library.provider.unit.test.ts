import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import * as cheerio from "cheerio";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Author } from "@codebase/lexico-entities";

import { PerseusLibraryProvider } from "./perseus-library.provider";

import type {
  PerseusLibraryTextExtractionProvider,
  PerseusMarkdownFile,
} from "./perseus-library-text-extraction.provider";
import type { LoggerService } from "@codebase/logging";
import type { AnyNode } from "domhandler";

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

describe(PerseusLibraryProvider, () => {
  const logger: DeepMocked<LoggerService> = createMock<LoggerService>();

  const perseusLibraryTextExtractionProvider = {
    extractTextNodes:
      vi.fn<
        (args: {
          $: cheerio.CheerioAPI;
          $element: cheerio.Cheerio<AnyNode>;
          currentPath: string[];
          currentTitle: string;
          filesToWrite: PerseusMarkdownFile[];
          rawTitle: string;
        }) => void
      >(),
  } as unknown as PerseusLibraryTextExtractionProvider;

  const perseusLibraryProvider = new PerseusLibraryProvider(
    perseusLibraryTextExtractionProvider,
    logger,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("should initialize the provider instance", () => {
    expect(perseusLibraryProvider).toBeDefined();
    expect(perseusLibraryProvider.name).toBe("perseus");
  });

  it("should filter by author and text options", () => {
    const isFilteredOut = (
      perseusLibraryProvider as unknown as {
        isFilteredOut: (
          rawAuthor: string,
          rawTitle: string,
          options?: { author?: string; text?: string },
        ) => boolean;
      }
    ).isFilteredOut.bind(perseusLibraryProvider);

    expect(isFilteredOut("Vergil", "Aeneid", { author: "other" })).toBe(true);
    expect(isFilteredOut("Vergil", "Aeneid", { text: "vergil/georgics" })).toBe(
      true,
    );
    expect(isFilteredOut("Vergil", "Aeneid", { author: "vergil" })).toBe(false);
  });

  it("should extract perseus metadata from xml and path", () => {
    const page = cheerio.load(
      `<TEI>
        <titleStmt><editor>Editor One</editor></titleStmt>
        <sourceDesc><biblStruct><publisher>Publisher</publisher><date>1901</date></biblStruct></sourceDesc>
      </TEI>`,
      { xml: true },
    );

    const extractPerseusMetadata = (
      perseusLibraryProvider as unknown as {
        extractPerseusMetadata: (
          page: cheerio.CheerioAPI,
          relativeSourcePath: string,
        ) => Record<string, unknown>;
      }
    ).extractPerseusMetadata.bind(perseusLibraryProvider);

    const metadata = extractPerseusMetadata(
      page,
      "phi0959/phi006/perseus-lat2/phi0959.phi006.perseus-lat2.xml",
    );

    expect(metadata).toStrictEqual(
      expect.objectContaining({
        cts_urn: "urn:cts:latinLit:phi0959.phi006.perseus-lat2",
        editors: ["Editor One"],
        print_publication_date: "1901",
        publisher: "Publisher",
      }),
    );
  });

  it("should collect source xml paths and handle directory read errors", async () => {
    readdirMock.mockResolvedValueOnce([
      {
        isFile: () => true,
        name: "aeneid.xml",
        parentPath: "/tmp/perseus",
      },
      {
        isFile: () => false,
        name: "folder",
        parentPath: "/tmp/perseus",
      },
    ] as unknown[]);

    const collectSourceXmlPaths = (
      perseusLibraryProvider as unknown as {
        collectSourceXmlPaths: (
          sourceDataDirectory: string,
        ) => Promise<string[]>;
      }
    ).collectSourceXmlPaths.bind(perseusLibraryProvider);

    const paths = await collectSourceXmlPaths("/tmp/perseus");

    readdirMock.mockRejectedValueOnce(new Error("missing"));
    const missing = await collectSourceXmlPaths("/tmp/missing");

    expect(paths).toStrictEqual(["/tmp/perseus/aeneid.xml"]);
    expect(missing).toStrictEqual([]);
  });

  it("should load source xml file and extract author and title", async () => {
    readFileMock.mockResolvedValueOnce(
      `<TEI><titleStmt><author>Vergil</author><title>Aeneid</title></titleStmt></TEI>`,
    );

    const loadSourceXmlFile = (
      perseusLibraryProvider as unknown as {
        loadSourceXmlFile: (args: { xmlPath: string }) => Promise<{
          $: cheerio.CheerioAPI;
          rawAuthor: string;
          rawTitle: string;
        }>;
      }
    ).loadSourceXmlFile.bind(perseusLibraryProvider);

    const loaded = await loadSourceXmlFile({
      xmlPath: "/tmp/perseus/aeneid.xml",
    });

    expect(loaded.rawAuthor).toBe("Vergil");
    expect(loaded.rawTitle).toBe("Aeneid");
  });

  it("should get or create author entities", () => {
    const getOrCreatePerseusAuthor = (
      perseusLibraryProvider as unknown as {
        getOrCreatePerseusAuthor: (args: {
          authorSlug: string;
          authorsMap: Map<string, Author>;
          rawAuthor: string;
          relativeSourcePath: string;
        }) => Author;
      }
    ).getOrCreatePerseusAuthor.bind(perseusLibraryProvider);

    const authorsMap = new Map<string, Author>();
    const first = getOrCreatePerseusAuthor({
      authorSlug: "vergil",
      authorsMap,
      rawAuthor: "Vergil",
      relativeSourcePath: "aeneid.xml",
    });
    const second = getOrCreatePerseusAuthor({
      authorSlug: "vergil",
      authorsMap,
      rawAuthor: "Vergil",
      relativeSourcePath: "aeneid.xml",
    });

    expect(first).toBe(second);
    expect(authorsMap.size).toBe(1);
  });

  it("should process source xml files and skip missing metadata", async () => {
    vi.spyOn(
      perseusLibraryProvider as unknown as {
        loadSourceXmlFile: (args: { xmlPath: string }) => Promise<{
          $: cheerio.CheerioAPI;
          rawAuthor: string;
          rawTitle: string;
        }>;
      },
      "loadSourceXmlFile",
    ).mockResolvedValueOnce({
      $: cheerio.load("<TEI></TEI>", { xml: true }),
      rawAuthor: "",
      rawTitle: "",
    });

    const writeSourceTextForAuthorSpy = vi.spyOn(
      perseusLibraryProvider as unknown as {
        writeSourceTextForAuthor: (args: {
          $: cheerio.CheerioAPI;
          author: Author;
          authorSlug: string;
          dataPath: string;
          metadata: Record<string, unknown>;
          rawTitle: string;
          relativeSourcePath: string;
          titleSlug: string;
        }) => Promise<void>;
      },
      "writeSourceTextForAuthor",
    );

    await (
      perseusLibraryProvider as unknown as {
        processSourceXmlFile: (args: {
          authorsMap: Map<string, Author>;
          dataPath: string;
          options?: { author?: string; text?: string };
          sourceDataDirectory: string;
          xmlPath: string;
        }) => Promise<void>;
      }
    ).processSourceXmlFile({
      authorsMap: new Map<string, Author>(),
      dataPath: "/tmp/library",
      sourceDataDirectory: "/tmp/perseus",
      xmlPath: "/tmp/perseus/aeneid.xml",
    });

    expect(writeSourceTextForAuthorSpy).not.toHaveBeenCalled();
  });

  it("should skip source xml file when filter excludes author or text", async () => {
    vi.spyOn(
      perseusLibraryProvider as unknown as {
        loadSourceXmlFile: (args: { xmlPath: string }) => Promise<{
          $: cheerio.CheerioAPI;
          rawAuthor: string;
          rawTitle: string;
        }>;
      },
      "loadSourceXmlFile",
    ).mockResolvedValueOnce({
      $: cheerio.load("<TEI></TEI>", { xml: true }),
      rawAuthor: "Vergil",
      rawTitle: "Aeneid",
    });

    const writeSourceTextForAuthorSpy = vi.spyOn(
      perseusLibraryProvider as unknown as {
        writeSourceTextForAuthor: (args: {
          $: cheerio.CheerioAPI;
          author: Author;
          authorSlug: string;
          dataPath: string;
          metadata: Record<string, unknown>;
          rawTitle: string;
          relativeSourcePath: string;
          titleSlug: string;
        }) => Promise<void>;
      },
      "writeSourceTextForAuthor",
    );

    await (
      perseusLibraryProvider as unknown as {
        processSourceXmlFile: (args: {
          authorsMap: Map<string, Author>;
          dataPath: string;
          options?: { author?: string; text?: string };
          sourceDataDirectory: string;
          xmlPath: string;
        }) => Promise<void>;
      }
    ).processSourceXmlFile({
      authorsMap: new Map<string, Author>(),
      dataPath: "/tmp/library",
      options: { author: "other" },
      sourceDataDirectory: "/tmp/perseus",
      xmlPath: "/tmp/perseus/aeneid.xml",
    });

    expect(writeSourceTextForAuthorSpy).not.toHaveBeenCalled();
  });

  it("should process source xml file and forward resolved values", async () => {
    const page = cheerio.load(
      `<TEI><titleStmt><author>Vergil</author><title>Aeneid</title></titleStmt><body/></TEI>`,
      { xml: true },
    );

    vi.spyOn(
      perseusLibraryProvider as unknown as {
        loadSourceXmlFile: (args: { xmlPath: string }) => Promise<{
          $: cheerio.CheerioAPI;
          rawAuthor: string;
          rawTitle: string;
        }>;
      },
      "loadSourceXmlFile",
    ).mockResolvedValueOnce({
      $: page,
      rawAuthor: "Vergil",
      rawTitle: "Aeneid",
    });

    const writeSourceTextForAuthorSpy = vi
      .spyOn(
        perseusLibraryProvider as unknown as {
          writeSourceTextForAuthor: (args: {
            $: cheerio.CheerioAPI;
            author: Author;
            authorSlug: string;
            dataPath: string;
            metadata: Record<string, unknown>;
            rawTitle: string;
            relativeSourcePath: string;
            titleSlug: string;
          }) => Promise<void>;
        },
        "writeSourceTextForAuthor",
      )
      .mockResolvedValue(undefined);

    const authorsMap = new Map<string, Author>();
    await (
      perseusLibraryProvider as unknown as {
        processSourceXmlFile: (args: {
          authorsMap: Map<string, Author>;
          dataPath: string;
          options?: { author?: string; text?: string };
          sourceDataDirectory: string;
          xmlPath: string;
        }) => Promise<void>;
      }
    ).processSourceXmlFile({
      authorsMap,
      dataPath: "/tmp/library",
      sourceDataDirectory: "/tmp/perseus-source",
      xmlPath: "/tmp/perseus-source/phi0959/phi006/perseus-lat2/source.xml",
    });

    expect(writeSourceTextForAuthorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        authorSlug: "vergil",
        dataPath: "/tmp/library",
        rawTitle: "Aeneid",
        relativeSourcePath: "phi0959/phi006/perseus-lat2/source.xml",
        titleSlug: "aeneid",
      }),
    );
    expect(authorsMap.get("vergil")).toBeDefined();
  });

  it("should write text files with frontmatter", async () => {
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);

    await (
      perseusLibraryProvider as unknown as {
        writeTextFiles: (
          filesToWrite: {
            content: string;
            relativePath: string;
            title: string;
          }[],
          authorDirectory: string,
          frontmatterObject: Record<string, unknown>,
        ) => Promise<void>;
      }
    ).writeTextFiles(
      [
        {
          content: "sample content verse",
          relativePath: "aeneid/book-1.md",
          title: "Book 1",
        },
      ],
      "/tmp/library/vergil",
      { author: "vergil", type: "text" },
    );

    expect(mkdirMock).toHaveBeenCalledTimes(1);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });

  it("should process perseus file and log progress", async () => {
    vi.spyOn(
      perseusLibraryProvider as unknown as {
        processSourceXmlFile: (args: {
          authorsMap: Map<string, Author>;
          dataPath: string;
          options?: { author?: string; text?: string };
          sourceDataDirectory: string;
          xmlPath: string;
        }) => Promise<void>;
      },
      "processSourceXmlFile",
    ).mockResolvedValue(undefined);

    await (
      perseusLibraryProvider as unknown as {
        processPerseusFile: (args: {
          authorsMap: Map<string, Author>;
          dataPath: string;
          index: number;
          options?: { author?: string; text?: string };
          sourceDataDirectory: string;
          total: number;
          xmlPath: string;
        }) => Promise<void>;
      }
    ).processPerseusFile({
      authorsMap: new Map<string, Author>(),
      dataPath: "/tmp/library",
      index: 0,
      sourceDataDirectory: "/tmp/perseus",
      total: 2,
      xmlPath: "/tmp/perseus/aeneid.xml",
    });

    expect((logger.info as ReturnType<typeof vi.fn>).mock.calls).toStrictEqual(
      expect.arrayContaining([
        [
          "📜 Starting processing",
          undefined,
          { xmlPath: "/tmp/perseus/aeneid.xml" },
        ],
        [
          "📜 Completed processing",
          undefined,
          {
            current: 1,
            percent: 50,
            total: 2,
            xmlPath: "/tmp/perseus/aeneid.xml",
          },
        ],
      ]),
    );
  });

  it("should log warning when processing a file fails", async () => {
    vi.spyOn(
      perseusLibraryProvider as unknown as {
        processSourceXmlFile: (args: {
          authorsMap: Map<string, Author>;
          dataPath: string;
          options?: { author?: string; text?: string };
          sourceDataDirectory: string;
          xmlPath: string;
        }) => Promise<void>;
      },
      "processSourceXmlFile",
    ).mockRejectedValue(new Error("boom"));

    await (
      perseusLibraryProvider as unknown as {
        processPerseusFile: (args: {
          authorsMap: Map<string, Author>;
          dataPath: string;
          index: number;
          options?: { author?: string; text?: string };
          sourceDataDirectory: string;
          total: number;
          xmlPath: string;
        }) => Promise<void>;
      }
    ).processPerseusFile({
      authorsMap: new Map<string, Author>(),
      dataPath: "/tmp/library",
      index: 1,
      sourceDataDirectory: "/tmp/perseus",
      total: 2,
      xmlPath: "/tmp/perseus/bad.xml",
    });

    expect((logger.warn as ReturnType<typeof vi.fn>).mock.calls).toStrictEqual(
      expect.arrayContaining([
        [
          "📜 Failed processing",
          undefined,
          expect.objectContaining({ xmlPath: "/tmp/perseus/bad.xml" }),
        ],
      ]),
    );
  });

  it("should write source markdown files with extraction metadata", async () => {
    const page = cheerio.load(
      `<TEI><body><div><head>Section</head><p>Sample text</p></div></body></TEI>`,
      { xml: true },
    );

    const writeTextFilesSpy = vi
      .spyOn(
        perseusLibraryProvider as unknown as {
          writeTextFiles: (
            filesToWrite: {
              content: string;
              relativePath: string;
              title: string;
            }[],
            authorDirectory: string,
            frontmatterObject: Record<string, unknown>,
          ) => Promise<void>;
        },
        "writeTextFiles",
      )
      .mockResolvedValue(undefined);

    vi.useFakeTimers();

    const extractTextNodesSpy = vi
      .spyOn(perseusLibraryTextExtractionProvider, "extractTextNodes")
      .mockImplementation(
        ({
          filesToWrite,
        }: {
          filesToWrite: {
            content: string;
            relativePath: string;
            title: string;
          }[];
        }) => {
          filesToWrite.push({
            content: "Sample text",
            relativePath: "aeneid/book-1.md",
            title: "Book 1",
          });
        },
      );

    const writePromise = (
      perseusLibraryProvider as unknown as {
        writeSourceMarkdownFiles: (args: {
          $: cheerio.CheerioAPI;
          authorSlug: string;
          dataPath: string;
          metadata: Record<string, unknown>;
          rawTitle: string;
          relativeSourcePath: string;
          titleSlug: string;
        }) => Promise<void>;
      }
    ).writeSourceMarkdownFiles({
      $: page,
      authorSlug: "vergil",
      dataPath: "/tmp/library/perseus",
      metadata: { editors: ["Editor One"] },
      rawTitle: "Aeneid",
      relativeSourcePath: "phi0959/source.xml",
      titleSlug: "aeneid",
    });

    await vi.runAllTimersAsync();
    await writePromise;

    const firstCallArguments = writeTextFilesSpy.mock.calls[0];

    expect(extractTextNodesSpy).toHaveBeenCalledTimes(1);
    expect(firstCallArguments).toBeDefined();
    expect(firstCallArguments?.[1]).toBe("/tmp/library/perseus/vergil");
    expect(firstCallArguments?.[0]).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relativePath: "aeneid/book-1.md",
          title: "Book 1",
        }),
      ]),
    );

    const metadata = firstCallArguments?.[2] as {
      author?: string;
      text_metadata?: { source_url?: string };
      type?: string;
    };

    expect(metadata).toBeDefined();

    expect(metadata.author).toBe("vergil");

    expect(metadata.type).toBe("text");
    expect(metadata.text_metadata?.source_url).toBe(
      "https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/phi0959/source.xml",
    );

    vi.useRealTimers();
  });

  it("should add text entity and write markdown in source-text flow", async () => {
    const writeSourceMarkdownFilesSpy = vi
      .spyOn(
        perseusLibraryProvider as unknown as {
          writeSourceMarkdownFiles: (args: {
            $: cheerio.CheerioAPI;
            authorSlug: string;
            dataPath: string;
            metadata: Record<string, unknown>;
            rawTitle: string;
            relativeSourcePath: string;
            titleSlug: string;
          }) => Promise<void>;
        },
        "writeSourceMarkdownFiles",
      )
      .mockResolvedValue(undefined);

    const author = new Author();
    author.slug = "vergil";
    author.texts = [];

    await (
      perseusLibraryProvider as unknown as {
        writeSourceTextForAuthor: (args: {
          $: cheerio.CheerioAPI;
          author: Author;
          authorSlug: string;
          dataPath: string;
          metadata: Record<string, unknown>;
          rawTitle: string;
          relativeSourcePath: string;
          titleSlug: string;
        }) => Promise<void>;
      }
    ).writeSourceTextForAuthor({
      $: cheerio.load("<TEI><body /></TEI>", { xml: true }),
      author,
      authorSlug: "vergil",
      dataPath: "/tmp/library",
      metadata: { publisher: "Publisher" },
      rawTitle: "Aeneid",
      relativeSourcePath: "perseus/aeneid.xml",
      titleSlug: "aeneid",
    });

    expect(author.texts).toHaveLength(1);
    expect(author.texts[0]?.slug).toBe("aeneid");
    expect(writeSourceMarkdownFilesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        authorSlug: "vergil",
        rawTitle: "Aeneid",
        titleSlug: "aeneid",
      }),
    );
  });

  it("should ingest from source cache and return authors", async () => {
    mkdirMock.mockResolvedValue(undefined);

    vi.spyOn(
      perseusLibraryProvider as unknown as {
        collectSourceXmlPaths: (
          sourceDataDirectory: string,
        ) => Promise<string[]>;
      },
      "collectSourceXmlPaths",
    ).mockResolvedValue(["/tmp/perseus/aeneid.xml"]);

    vi.spyOn(
      perseusLibraryProvider as unknown as {
        processPerseusFile: (args: {
          authorsMap: Map<string, Author>;
          dataPath: string;
          index: number;
          options?: { author?: string; text?: string };
          sourceDataDirectory: string;
          total: number;
          xmlPath: string;
        }) => Promise<void>;
      },
      "processPerseusFile",
    ).mockImplementation(async ({ authorsMap }): Promise<void> => {
      await Promise.resolve();
      const author = new Author();
      author.slug = "vergil";
      author.texts = [];
      authorsMap.set("vergil", author);
    });

    const authors = await perseusLibraryProvider.ingest();

    expect(authors).toHaveLength(1);
    expect(authors[0]?.slug).toBe("vergil");
  });

  it("should continue ingest loop when xml path entry is undefined", async () => {
    mkdirMock.mockResolvedValue(undefined);

    vi.spyOn(
      perseusLibraryProvider as unknown as {
        collectSourceXmlPaths: (
          sourceDataDirectory: string,
        ) => Promise<string[]>;
      },
      "collectSourceXmlPaths",
    ).mockResolvedValue([
      "/tmp/perseus/aeneid.xml",
      undefined as unknown as string,
    ]);

    const processPerseusFileSpy = vi
      .spyOn(
        perseusLibraryProvider as unknown as {
          processPerseusFile: (args: {
            authorsMap: Map<string, Author>;
            dataPath: string;
            index: number;
            options?: { author?: string; text?: string };
            sourceDataDirectory: string;
            total: number;
            xmlPath: string;
          }) => Promise<void>;
        },
        "processPerseusFile",
      )
      .mockResolvedValue(undefined);

    await perseusLibraryProvider.ingest({ author: "vergil" });

    expect(processPerseusFileSpy).toHaveBeenCalledTimes(1);
    expect(processPerseusFileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { author: "vergil" },
        xmlPath: "/tmp/perseus/aeneid.xml",
      }),
    );
  });
});
