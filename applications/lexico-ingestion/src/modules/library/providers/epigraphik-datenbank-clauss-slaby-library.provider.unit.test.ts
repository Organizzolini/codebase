// `obj` is the field name the EDCS API returns, not an abbreviation this code chose.
// cspell:ignore obj

import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { describe, expect, it, vi } from "vitest";

import { Author, type Text } from "@codebase/lexico-entities";

import { EpigraphikDatenbankClaussSlabyLibraryProvider } from "./epigraphik-datenbank-clauss-slaby-library.provider";

import type { LoggerService } from "@codebase/logging";

const { mkdirMock, readdirMock, readFileMock, writeFileMock } = vi.hoisted(
  () => ({
    mkdirMock: vi.fn<() => Promise<string | undefined>>(),
    readdirMock: vi.fn<() => Promise<string[]>>(),
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

describe(EpigraphikDatenbankClaussSlabyLibraryProvider, () => {
  const logger: DeepMocked<LoggerService> = createMock<LoggerService>();

  const epigraphikDatenbankClaussSlabyLibraryProvider =
    new EpigraphikDatenbankClaussSlabyLibraryProvider(logger);

  it("should initialize the provider instance", () => {
    expect(epigraphikDatenbankClaussSlabyLibraryProvider).toBeDefined();
    expect(epigraphikDatenbankClaussSlabyLibraryProvider.name).toBe(
      "epigraphik-datenbank-clauss-slaby",
    );
  });

  it("should create source author metadata", () => {
    const createSourceAuthor = (
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        createSourceAuthor: (authorSlug: string, host: string) => Author;
      }
    ).createSourceAuthor.bind(epigraphikDatenbankClaussSlabyLibraryProvider);

    const author = createSourceAuthor(
      "epigraphik-datenbank-clauss-slaby",
      "https://edcs.hist.uzh.ch/api/query",
    );

    expect(author.slug).toBe("epigraphik-datenbank-clauss-slaby");
    expect(author.name).toBe("Epigraphik-Datenbank Clauss-Slaby");
    expect(author.metadata).toStrictEqual(
      expect.objectContaining({
        sourceUrl: "https://edcs.hist.uzh.ch/api/query",
      }),
    );
  });

  it("should process EDCS records and strip html tags", () => {
    const provinceData = new Map<string, string[]>();

    (
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        processEdcsRecord: (
          item: {
            obj: {
              "edcs-id"?: string;
              edcsId?: string;
              inschriften: [string, unknown, string[], string[]][];
              provinz: null | string;
            };
          },
          provinceData: Map<string, string[]>,
        ) => void;
      }
    ).processEdcsRecord(
      {
        obj: {
          "edcs-id": "EDCS-1",
          inschriften: [["<p>AVE <b>ROMA</b></p>", null, [], []]],
          provinz: "Roma",
        },
      },
      provinceData,
    );

    expect(provinceData.get("Roma")).toStrictEqual(["**EDCS-1** AVE ROMA"]);
  });

  it("should skip EDCS record when inscription text is missing", () => {
    const provinceData = new Map<string, string[]>();

    (
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        processEdcsRecord: (
          item: {
            obj: {
              "edcs-id"?: string;
              edcsId?: string;
              inschriften: [string, unknown, string[], string[]][];
              provinz: null | string;
            };
          },
          provinceDataToUpdate: Map<string, string[]>,
        ) => void;
      }
    ).processEdcsRecord(
      {
        obj: {
          "edcs-id": "EDCS-2",
          inschriften: [["", null, [], []]],
          provinz: "Roma",
        },
      },
      provinceData,
    );

    expect(provinceData.size).toBe(0);
  });

  it("should create or reuse province book text", () => {
    const author = new Author();
    author.texts = [];

    const booksMap = new Map<string, Text>();

    const getOrCreateBookText = (
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        getOrCreateBookText: (args: {
          author: Author;
          bookSlug: string;
          booksMap: Map<string, Text>;
          province: string;
        }) => Text;
      }
    ).getOrCreateBookText.bind(epigraphikDatenbankClaussSlabyLibraryProvider);

    const first = getOrCreateBookText({
      author,
      bookSlug: "roma",
      booksMap,
      province: "Roma",
    });
    const second = getOrCreateBookText({
      author,
      bookSlug: "roma",
      booksMap,
      province: "Roma",
    });

    expect(first).toBe(second);
    expect(author.texts).toHaveLength(1);
    expect(author.texts[0]?.type).toBe("book");
  });

  it("should read chunk files and handle missing source directory", async () => {
    readdirMock.mockResolvedValueOnce([
      "chunk-0.json",
      "chunk-1.json",
      "readme.md",
    ]);

    const readSourceChunkFiles = (
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        readSourceChunkFiles: (
          sourceDataDirectory: string,
        ) => Promise<null | string[]>;
      }
    ).readSourceChunkFiles.bind(epigraphikDatenbankClaussSlabyLibraryProvider);

    const files = await readSourceChunkFiles("/tmp/edcs");

    readdirMock.mockRejectedValueOnce(new Error("missing"));
    const missing = await readSourceChunkFiles("/tmp/missing");

    expect(files).toStrictEqual(["chunk-0.json", "chunk-1.json"]);
    expect(missing).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(expect.any(String), undefined, {
      sourceDataDirectory: "/tmp/missing",
    });
  });

  it("should process chunk file and log progress", async () => {
    readFileMock.mockResolvedValueOnce(
      JSON.stringify({
        data: [
          {
            obj: {
              "edcs-id": "EDCS-1",
              inschriften: [["<p>AVE ROMA</p>", null, [], []]],
              provinz: "Roma",
            },
          },
        ],
      }),
    );

    const provinceData = new Map<string, string[]>();

    await (
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        processSourceChunkFile: (args: {
          file: string;
          index: number;
          provinceData: Map<string, string[]>;
          sourceDataDirectory: string;
          total: number;
        }) => Promise<void>;
      }
    ).processSourceChunkFile({
      file: "chunk-0.json",
      index: 0,
      provinceData,
      sourceDataDirectory: "/tmp/edcs",
      total: 2,
    });

    expect(provinceData.get("Roma")?.[0]).toContain("EDCS-1");
  });

  it("should warn when chunk file cannot be parsed", async () => {
    readFileMock.mockRejectedValueOnce(new Error("cannot read"));

    await (
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        processSourceChunkFile: (args: {
          file: string;
          index: number;
          provinceData: Map<string, string[]>;
          sourceDataDirectory: string;
          total: number;
        }) => Promise<void>;
      }
    ).processSourceChunkFile({
      file: "chunk-1.json",
      index: 0,
      provinceData: new Map(),
      sourceDataDirectory: "/tmp/edcs",
      total: 1,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      "📄 Failed reading chunk file",
      undefined,
      expect.objectContaining({ file: "chunk-1.json" }),
    );
  });

  it("should skip undefined entries in chunk phase", async () => {
    const processSourceChunkFileSpy = vi
      .spyOn(
        epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
          processSourceChunkFile: (args: {
            file: string;
            index: number;
            provinceData: Map<string, string[]>;
            sourceDataDirectory: string;
            total: number;
          }) => Promise<void>;
        },
        "processSourceChunkFile",
      )
      .mockResolvedValue(undefined);

    await (
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        processSourceChunkPhase: (
          chunkFiles: string[],
          sourceDataDirectory: string,
        ) => Promise<Map<string, string[]>>;
      }
    ).processSourceChunkPhase(
      ["chunk-0.json", undefined as unknown as string],
      "/tmp/edcs",
    );

    expect(processSourceChunkFileSpy).toHaveBeenCalledTimes(1);
    expect(processSourceChunkFileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        file: "chunk-0.json",
        total: 2,
      }),
    );
  });

  it("should save province chunks and honor text filter", async () => {
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);

    const author = new Author();
    author.slug = "epigraphik-datenbank-clauss-slaby";
    author.texts = [];

    await (
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        saveEdcsProvince: (args: {
          author: Author;
          authorDirectory: string;
          authorSlug: string;
          booksMap: Map<string, Text>;
          inscriptions: string[];
          options: undefined | { text?: string };
          province: string;
        }) => Promise<void>;
      }
    ).saveEdcsProvince({
      author,
      authorDirectory: "/tmp/library/edcs",
      authorSlug: "epigraphik-datenbank-clauss-slaby",
      booksMap: new Map<string, Text>(),
      inscriptions: ["**1** inscription"],
      options: { text: "epigraphik-datenbank-clauss-slaby/roma/roma-part-1" },
      province: "Roma",
    });

    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });

  it("should skip all province chunks when text filter does not match", async () => {
    vi.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);

    const author = new Author();
    author.slug = "epigraphik-datenbank-clauss-slaby";
    author.texts = [];

    await (
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        saveEdcsProvince: (args: {
          author: Author;
          authorDirectory: string;
          authorSlug: string;
          booksMap: Map<string, Text>;
          inscriptions: string[];
          options: undefined | { text?: string };
          province: string;
        }) => Promise<void>;
      }
    ).saveEdcsProvince({
      author,
      authorDirectory: "/tmp/library/edcs",
      authorSlug: "epigraphik-datenbank-clauss-slaby",
      booksMap: new Map<string, Text>(),
      inscriptions: ["**1** inscription"],
      options: {
        text: "epigraphik-datenbank-clauss-slaby/africa/africa-part-1",
      },
      province: "Roma",
    });

    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("should ingest data by processing chunks and saving provinces", async () => {
    mkdirMock.mockResolvedValue(undefined);

    vi.spyOn(
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        readSourceChunkFiles: (
          sourceDataDirectory: string,
        ) => Promise<null | string[]>;
      },
      "readSourceChunkFiles",
    ).mockResolvedValue(["chunk-0.json"]);

    vi.spyOn(
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        processSourceChunkPhase: (
          chunkFiles: string[],
          sourceDataDirectory: string,
        ) => Promise<Map<string, string[]>>;
      },
      "processSourceChunkPhase",
    ).mockResolvedValue(new Map([["Roma", ["**EDCS-1** AVE ROMA"]]]));

    vi.spyOn(
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        saveEdcsProvincePhase: (args: {
          author: Author;
          authorDirectory: string;
          authorSlug: string;
          options: undefined | { text?: string };
          provinceData: Map<string, string[]>;
        }) => Promise<void>;
      },
      "saveEdcsProvincePhase",
    ).mockResolvedValue(undefined);

    const authors =
      await epigraphikDatenbankClaussSlabyLibraryProvider.ingest();

    expect(authors).toHaveLength(1);
    expect(authors[0]?.slug).toBe("epigraphik-datenbank-clauss-slaby");
  });

  it("should return empty when chunk files cannot be read", async () => {
    mkdirMock.mockResolvedValue(undefined);

    vi.spyOn(
      epigraphikDatenbankClaussSlabyLibraryProvider as unknown as {
        readSourceChunkFiles: (
          sourceDataDirectory: string,
        ) => Promise<null | string[]>;
      },
      "readSourceChunkFiles",
    ).mockResolvedValue(null);

    const authors =
      await epigraphikDatenbankClaussSlabyLibraryProvider.ingest();

    expect(authors).toStrictEqual([]);
  });

  it("should return empty when author filter does not match", async () => {
    const authors = await epigraphikDatenbankClaussSlabyLibraryProvider.ingest({
      author: "other-provider",
    });

    expect(authors).toStrictEqual([]);
  });
});
