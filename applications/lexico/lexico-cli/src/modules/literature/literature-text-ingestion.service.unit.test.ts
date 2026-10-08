import { appendFile } from "node:fs/promises";

import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { Author, Text } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { LiteratureTextIngestionService } from "./literature-text-ingestion.service";

import type { IngestTextArguments, LibraryEntry } from "./literature.types";

vi.mock("node:fs/promises", () => ({
  appendFile: vi.fn<() => Promise<void>>(),
}));

describe(LiteratureTextIngestionService, () => {
  let service: LiteratureTextIngestionService;
  let logger: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LiteratureTextIngestionService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = await module.resolve(LiteratureTextIngestionService);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    vi.mocked(appendFile).mockResolvedValue(undefined);

    logger.buildErrorLogEntry.mockImplementation((context, error) => {
      const errorMessage =
        error instanceof Error ? error.stack || error.message : String(error);
      return {
        errorMessage,
        logLine: `[${new Date().toISOString()}] ${context}: ${errorMessage}\n`,
      };
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("sets logger context during construction", () => {
    const initializedService = new LiteratureTextIngestionService(logger);

    expect(initializedService).toBeDefined();
    expect(logger.setContext).toHaveBeenCalledWith(
      LiteratureTextIngestionService.name,
    );
  });

  describe("ingestTextWithLogging", () => {
    it("logs start and completion for root text entry", async () => {
      const ingestTextMock = vi.fn<
        (args: IngestTextArguments) => Promise<void>
      >(async (): Promise<void> => {});
      const authorEntity = new Author();
      const textEntry: LibraryEntry = {
        authorSlug: "author",
        fullPath: "data/library/provider/author/work.md",
        pathParts: [],
        provider: "provider",
        textSlug: "work",
        title: "Work",
      };

      await service.ingestTextWithLogging(
        {
          ingestText: ingestTextMock,
        },
        {
          authorEntity,
          authorSlug: "author",
          currentText: 1,
          logFilePath: "/tmp/literature-errors.log",
          parentTexts: new Map<string, Text>(),
          textEntry,
          totalTexts: 2,
        },
      );

      expect(ingestTextMock).toHaveBeenCalledWith({
        author: authorEntity,
        parentText: undefined,
        textPath: "data/library/provider/author/work.md",
        textSlugName: "work",
        title: "Work",
      });
      expect(logger.info).toHaveBeenCalledWith(
        "📜 Ingesting text",
        undefined,
        expect.objectContaining({ hierarchy: "", title: "Work" }),
      );
      expect(logger.info).toHaveBeenCalledWith(
        "📜 Ingested text",
        undefined,
        expect.objectContaining({ hierarchy: "", title: "Work" }),
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("resolves parent text hierarchy in logs and ingest arguments", async () => {
      const ingestTextMock = vi.fn<
        (args: IngestTextArguments) => Promise<void>
      >(async (): Promise<void> => {});
      const authorEntity = new Author();
      const parentText = new Text();
      parentText.slug = "author/book-1";

      const textEntry: LibraryEntry = {
        authorSlug: "author",
        fullPath: "data/library/provider/author/book-1/chapter-1.md",
        pathParts: ["book-1"],
        provider: "provider",
        textSlug: "chapter-1",
        title: "Chapter 1",
      };

      await service.ingestTextWithLogging(
        {
          ingestText: ingestTextMock,
        },
        {
          authorEntity,
          authorSlug: "author",
          currentText: 2,
          logFilePath: "/tmp/literature-errors.log",
          parentTexts: new Map<string, Text>([["author/book-1", parentText]]),
          textEntry,
          totalTexts: 2,
        },
      );

      expect(ingestTextMock).toHaveBeenCalledWith({
        author: authorEntity,
        parentText,
        textPath: "data/library/provider/author/book-1/chapter-1.md",
        textSlugName: "chapter-1",
        title: "Chapter 1",
      });
      expect(logger.info).toHaveBeenCalledWith(
        "📜 Ingesting text",
        undefined,
        expect.objectContaining({ hierarchy: "book-1 / ", title: "Chapter 1" }),
      );
      expect(logger.info).toHaveBeenCalledWith(
        "📜 Ingested text",
        undefined,
        expect.objectContaining({ hierarchy: "book-1 / ", title: "Chapter 1" }),
      );
    });

    it("logs and appends error details when ingestion fails", async () => {
      const ingestTextMock = vi.fn<
        (args: IngestTextArguments) => Promise<void>
      >(
        async (): Promise<void> =>
          await Promise.reject(new Error("ingestion failed")),
      );
      const authorEntity = new Author();
      const textEntry: LibraryEntry = {
        authorSlug: "author",
        fullPath: "data/library/provider/author/work.md",
        pathParts: [],
        provider: "provider",
        textSlug: "work",
        title: "Work",
      };

      await service.ingestTextWithLogging(
        {
          ingestText: ingestTextMock,
        },
        {
          authorEntity,
          authorSlug: "author",
          currentText: 1,
          logFilePath: "/tmp/literature-errors.log",
          parentTexts: new Map<string, Text>(),
          textEntry,
          totalTexts: 1,
        },
      );

      expect(logger.error).toHaveBeenCalledWith(
        "📜 Failed processing text",
        expect.any(String),
        expect.objectContaining({ title: "Work" }),
      );
      expect(appendFile).toHaveBeenCalledWith(
        "/tmp/literature-errors.log",
        expect.stringContaining("data/library/provider/author/work.md"),
      );
      expect(logger.info).toHaveBeenCalledWith(
        "📜 Ingested text",
        undefined,
        expect.objectContaining({ title: "Work" }),
      );
    });

    it("handles rejected ingestion failures in failure handling", async () => {
      const ingestTextMock = vi
        .fn<(_: IngestTextArguments) => Promise<void>>()
        .mockRejectedValue("ingestion failed");
      const authorEntity = new Author();
      const textEntry: LibraryEntry = {
        authorSlug: "author",
        fullPath: "data/library/provider/author/work.md",
        pathParts: [],
        provider: "provider",
        textSlug: "work",
        title: "Work",
      };

      await service.ingestTextWithLogging(
        {
          ingestText: ingestTextMock,
        },
        {
          authorEntity,
          authorSlug: "author",
          currentText: 1,
          logFilePath: "/tmp/literature-errors.log",
          parentTexts: new Map<string, Text>(),
          textEntry,
          totalTexts: 1,
        },
      );

      expect(logger.error).toHaveBeenCalledWith(
        "📜 Failed processing text",
        expect.any(String),
        expect.objectContaining({ title: "Work" }),
      );
      expect(appendFile).toHaveBeenCalledWith(
        "/tmp/literature-errors.log",
        expect.stringContaining(
          "data/library/provider/author/work.md: ingestion failed",
        ),
      );
    });

    it("uses error message fallback when Error stack is empty", async () => {
      const error = new Error("ingestion failed without stack");
      error.stack = "";

      const ingestTextMock = vi.fn<
        (args: IngestTextArguments) => Promise<void>
      >(async (): Promise<void> => await Promise.reject(error));
      const authorEntity = new Author();
      const textEntry: LibraryEntry = {
        authorSlug: "author",
        fullPath: "data/library/provider/author/work.md",
        pathParts: [],
        provider: "provider",
        textSlug: "work",
        title: "Work",
      };

      await service.ingestTextWithLogging(
        {
          ingestText: ingestTextMock,
        },
        {
          authorEntity,
          authorSlug: "author",
          currentText: 1,
          logFilePath: "/tmp/literature-errors.log",
          parentTexts: new Map<string, Text>(),
          textEntry,
          totalTexts: 1,
        },
      );

      expect(appendFile).toHaveBeenCalledWith(
        "/tmp/literature-errors.log",
        expect.stringContaining("ingestion failed without stack"),
      );
    });
  });
});
