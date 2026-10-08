import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import * as cheerio from "cheerio";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { resetCommandTestHarness } from "../../../testing/command-harness";

import { WiktionaryCommand } from "./wiktionary.command";

import type { DeepMocked } from "@golevelup/ts-vitest";
import type { AnyNode, Element } from "domhandler";

const { appendFileSyncMock, existsSyncMock, mkdirSyncMock, writeFileSyncMock } =
  vi.hoisted(() => ({
    appendFileSyncMock: vi.fn<(...parameters: unknown[]) => void>(),
    existsSyncMock: vi.fn<() => boolean>(),
    mkdirSyncMock: vi.fn<(...parameters: unknown[]) => void>(),
    writeFileSyncMock: vi.fn<(...parameters: unknown[]) => void>(),
  }));

vi.mock("node:fs", () => ({
  default: {
    appendFileSync: appendFileSyncMock,
    existsSync: existsSyncMock,
    mkdirSync: mkdirSyncMock,
    writeFileSync: writeFileSyncMock,
  },
}));

describe(WiktionaryCommand, () => {
  let command: WiktionaryCommand;
  let logger: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WiktionaryCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(WiktionaryCommand);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    resetCommandTestHarness();
    existsSyncMock.mockReturnValue(true);
  });

  const getRequiredElement = (element: Element | undefined): Element => {
    if (!element) {
      throw new Error("Expected anchor element");
    }

    return element;
  };

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        WiktionaryCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    await module.resolve(WiktionaryCommand);
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("WiktionaryCommand");
  });

  it("should create output directory when missing", async () => {
    existsSyncMock.mockReturnValueOnce(false);

    const module = await Test.createTestingModule({
      providers: [
        WiktionaryCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    await module.resolve(WiktionaryCommand);
    const isolatedLogger = await module.resolve(LoggerService);

    expect(isolatedLogger).toBeDefined();

    expect(mkdirSyncMock).toHaveBeenCalledTimes(1);
  });

  it("should escape capitals with underscore", () => {
    const escaped = (
      command as unknown as {
        escapeCapitals: (word: string) => string;
      }
    ).escapeCapitals("AbCd");

    expect(escaped).toBe("_ab_cd");
  });

  it("should write wiktionary entry json with html payload", () => {
    const entry = {
      category: "lemma",
      href: "https://en.wiktionary.org/wiki/amo#Latin",
      word: "Amo",
    };
    const $ = cheerio.load('<div id="Latin"><p>latin content</p></div>');
    const section = $("#Latin");

    (
      command as unknown as {
        saveWiktionaryEntry: (
          entryToSave: { category: string; href: string; word: string },
          sectionToSave: cheerio.Cheerio<AnyNode>,
          cheerioApi: cheerio.CheerioAPI,
        ) => void;
      }
    ).saveWiktionaryEntry(entry, section, $);

    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith("💬 Ingested word", undefined, {
      word: "Amo",
    });
  });

  it("should skip reconstruction and appendix links", async () => {
    const ingestWordSpy = vi.spyOn(
      command as unknown as {
        ingestWord: (
          word: string,
          urlPath: string,
          category: string,
        ) => Promise<void>;
      },
      "ingestWord",
    );

    const $ = cheerio.load(
      '<a href="/wiki/Reconstruction:foo">Reconstruction:Foo</a>',
    );
    const a = getRequiredElement($("a").get(0));

    await (
      command as unknown as {
        processWiktionaryCategoryLink: (
          element: Element,
          cheerioApi: cheerio.CheerioAPI,
          category: string,
        ) => Promise<void>;
      }
    ).processWiktionaryCategoryLink(a, $, "lemma");

    expect(ingestWordSpy).not.toHaveBeenCalled();
  });

  it("should skip links with slash in word", async () => {
    const ingestWordSpy = vi.spyOn(
      command as unknown as {
        ingestWord: (
          word: string,
          urlPath: string,
          category: string,
        ) => Promise<void>;
      },
      "ingestWord",
    );

    const $ = cheerio.load('<a href="/wiki/amo">am/o</a>');
    const a = getRequiredElement($("a").get(0));

    await (
      command as unknown as {
        processWiktionaryCategoryLink: (
          element: Element,
          cheerioApi: cheerio.CheerioAPI,
          category: string,
        ) => Promise<void>;
      }
    ).processWiktionaryCategoryLink(a, $, "lemma");

    expect(ingestWordSpy).not.toHaveBeenCalled();
  });

  it("should warn when href points to index page", async () => {
    await (
      command as unknown as {
        ingestWord: (
          word: string,
          urlPath: string,
          category: string,
        ) => Promise<void>;
      }
    ).ingestWord("amo", "/w/index.php?title=amo", "lemma");

    expect(logger.warn).toHaveBeenCalledWith(
      "🌐 Missing wiktionary page for word",
      undefined,
      { word: "amo" },
    );
  });

  it("should warn when latin section is missing", async () => {
    vi.spyOn(
      command as unknown as {
        parseLatinSection: (href: string) => Promise<null | {
          $: cheerio.CheerioAPI;
          section: cheerio.Cheerio<AnyNode>;
        }>;
      },
      "parseLatinSection",
    ).mockResolvedValue(null);

    await (
      command as unknown as {
        ingestWord: (
          word: string,
          urlPath: string,
          category: string,
        ) => Promise<void>;
      }
    ).ingestWord("amo", "/wiki/amo", "lemma");

    expect(logger.warn).toHaveBeenCalledWith(
      "🌐 Missing latin entry for word",
      undefined,
      { word: "amo" },
    );
  });

  it("should save entry when latin section exists", async () => {
    const $ = cheerio.load('<div id="Latin"><p>latin content</p></div>');
    const saveWiktionaryEntrySpy = vi.spyOn(
      command as unknown as {
        saveWiktionaryEntry: (
          entry: { category: string; href: string; word: string },
          section: cheerio.Cheerio<AnyNode>,
          cheerioApi: cheerio.CheerioAPI,
        ) => void;
      },
      "saveWiktionaryEntry",
    );

    vi.spyOn(
      command as unknown as {
        parseLatinSection: (href: string) => Promise<null | {
          $: cheerio.CheerioAPI;
          section: cheerio.Cheerio<AnyNode>;
        }>;
      },
      "parseLatinSection",
    ).mockResolvedValue({ $, section: $("#Latin") });

    await (
      command as unknown as {
        ingestWord: (
          word: string,
          urlPath: string,
          category: string,
        ) => Promise<void>;
      }
    ).ingestWord("amo", "/wiki/amo", "lemma");

    expect(saveWiktionaryEntrySpy).toHaveBeenCalledTimes(1);
  });

  it("should return non-429 response immediately in retry fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(...parameters: unknown[]) => unknown>(
        async () => await Promise.resolve({ status: 200 }),
      ),
    );

    const response = await (
      command as unknown as {
        fetchWithRetry: (
          url: string,
          retries?: number,
        ) => Promise<{ status: number }>;
      }
    ).fetchWithRetry("https://example.com", 2);

    expect(response.status).toBe(200);
  });

  it("should throw when category page response is not ok", async () => {
    vi.spyOn(
      command as unknown as {
        fetchWithRetry: (
          url: string,
          retries?: number,
        ) => Promise<{ ok: boolean; status: number; statusText: string }>;
      },
      "fetchWithRetry",
    ).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(
      (
        command as unknown as {
          fetchCategoryPage: (urlPath: string) => Promise<cheerio.CheerioAPI>;
        }
      ).fetchCategoryPage("/wiki/start"),
    ).rejects.toThrow("HTTP 500 Internal Server Error");
  });

  it("should parse and return category page html when response is ok", async () => {
    vi.spyOn(
      command as unknown as {
        fetchWithRetry: (
          url: string,
          retries?: number,
        ) => Promise<{ ok: boolean; text: () => Promise<string> }>;
      },
      "fetchWithRetry",
    ).mockResolvedValue({
      ok: true,
      text: async () =>
        await Promise.resolve(
          '<div id="mw-pages"><div class="mw-category"></div></div>',
        ),
    });

    const page = await (
      command as unknown as {
        fetchCategoryPage: (urlPath: string) => Promise<cheerio.CheerioAPI>;
      }
    ).fetchCategoryPage("/wiki/start");

    expect(page("#mw-pages")).toHaveLength(1);
  });

  it("should retry after rate limit and then return success response", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockResolvedValueOnce({
        headers: { get: () => "0" },
        status: 429,
      })
      .mockResolvedValueOnce({ status: 200 });

    vi.stubGlobal("fetch", fetchMock);

    const responsePromise = (
      command as unknown as {
        fetchWithRetry: (
          url: string,
          retries?: number,
        ) => Promise<{ status: number }>;
      }
    ).fetchWithRetry("https://example.com", 2);

    await vi.advanceTimersByTimeAsync(1);
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("should perform final fetch when retries are exhausted", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockResolvedValueOnce({
        headers: { get: () => null },
        status: 429,
      })
      .mockResolvedValueOnce({
        headers: { get: () => null },
        status: 429,
      })
      .mockResolvedValueOnce({
        headers: { get: () => null },
        status: 429,
      });

    vi.stubGlobal("fetch", fetchMock);

    const responsePromise = (
      command as unknown as {
        fetchWithRetry: (
          url: string,
          retries?: number,
        ) => Promise<{ status: number }>;
      }
    ).fetchWithRetry("https://example.com", 1);

    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledWith(
      "🚫 Exhausted retries after a rate limit",
      undefined,
      { retries: 1, url: "https://example.com" },
    );

    vi.useRealTimers();
  });

  it("should honor Retry-After and cap delay at maximum retry delay", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<(...parameters: unknown[]) => unknown>()
      .mockResolvedValueOnce({
        headers: { get: () => "120" },
        status: 429,
      })
      .mockResolvedValueOnce({ status: 200 });

    vi.stubGlobal("fetch", fetchMock);

    const responsePromise = (
      command as unknown as {
        fetchWithRetry: (
          url: string,
          retries?: number,
        ) => Promise<{ status: number }>;
      }
    ).fetchWithRetry("https://example.com", 1);

    await vi.advanceTimersByTimeAsync(60_000);
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(logger.warn).toHaveBeenCalledWith(
      "⏳ Waiting after a rate limit",
      undefined,
      { attempt: 0, backoffMilliseconds: 60_000, retries: 1 },
    );

    vi.useRealTimers();
  });

  it("should throw when latin section request is not ok", async () => {
    vi.spyOn(
      command as unknown as {
        fetchWithRetry: (
          url: string,
          retries?: number,
        ) => Promise<{ ok: boolean; status: number; statusText: string }>;
      },
      "fetchWithRetry",
    ).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(
      (
        command as unknown as {
          parseLatinSection: (href: string) => Promise<null | {
            $: cheerio.CheerioAPI;
            section: cheerio.Cheerio<AnyNode>;
          }>;
        }
      ).parseLatinSection("https://en.wiktionary.org/wiki/amo#Latin"),
    ).rejects.toThrow("HTTP 404 Not Found");
  });

  it("should parse latin section when response contains latin heading", async () => {
    vi.spyOn(
      command as unknown as {
        fetchWithRetry: (
          url: string,
          retries?: number,
        ) => Promise<{ ok: boolean; text: () => Promise<string> }>;
      },
      "fetchWithRetry",
    ).mockResolvedValue({
      ok: true,
      text: async () =>
        await Promise.resolve(
          '<h2><span id="Latin">Latin</span></h2><p>amo</p><h2>English</h2>',
        ),
    });

    const parsed = await (
      command as unknown as {
        parseLatinSection: (href: string) => Promise<null | {
          $: cheerio.CheerioAPI;
          section: cheerio.Cheerio<AnyNode>;
        }>;
      }
    ).parseLatinSection("https://en.wiktionary.org/wiki/amo#Latin");

    expect(parsed).not.toBeNull();
    expect(parsed?.section.length).toBeGreaterThan(0);
  });

  it("should return null when latin section cannot be found", async () => {
    vi.spyOn(
      command as unknown as {
        fetchWithRetry: (
          url: string,
          retries?: number,
        ) => Promise<{ ok: boolean; text: () => Promise<string> }>;
      },
      "fetchWithRetry",
    ).mockResolvedValue({
      ok: true,
      text: async () =>
        await Promise.resolve('<h2><span id="English">English</span></h2>'),
    });

    const parsed = await (
      command as unknown as {
        parseLatinSection: (href: string) => Promise<null | {
          $: cheerio.CheerioAPI;
          section: cheerio.Cheerio<AnyNode>;
        }>;
      }
    ).parseLatinSection("https://en.wiktionary.org/wiki/amo#Latin");

    expect(parsed).toBeNull();
  });

  it("should append error log when word ingestion fails", async () => {
    vi.spyOn(
      command as unknown as {
        ingestWord: (
          word: string,
          urlPath: string,
          category: string,
        ) => Promise<void>;
      },
      "ingestWord",
    ).mockRejectedValue(new Error("word failure"));

    const $ = cheerio.load('<a href="/wiki/amo">amo</a>');
    const anchor = $("a").get(0);
    if (!anchor) {
      throw new Error("Expected anchor node");
    }

    await (
      command as unknown as {
        processWiktionaryCategoryLink: (
          element: Element,
          cheerioApi: cheerio.CheerioAPI,
          category: string,
        ) => Promise<void>;
      }
    ).processWiktionaryCategoryLink(anchor, $, "lemma");

    expect(logger.error).toHaveBeenCalledWith(
      "🔤 Failed ingesting word",
      expect.any(String),
      { word: "amo" },
    );
    expect(appendFileSyncMock).toHaveBeenCalledTimes(1);
  });

  it("should append error log when word ingestion fails with non-Error value", async () => {
    vi.spyOn(
      command as unknown as {
        ingestWord: (
          word: string,
          urlPath: string,
          category: string,
        ) => Promise<void>;
      },
      "ingestWord",
    ).mockRejectedValue("word failure string");

    const cheerioApi = cheerio.load('<a href="/wiki/amo">amo</a>');
    const anchor = cheerioApi("a").get(0);
    if (!anchor) {
      throw new Error("Expected anchor node");
    }

    await (
      command as unknown as {
        processWiktionaryCategoryLink: (
          element: Element,
          cheerioApi: cheerio.CheerioAPI,
          category: string,
        ) => Promise<void>;
      }
    ).processWiktionaryCategoryLink(anchor, cheerioApi, "lemma");

    expect(logger.error).toHaveBeenCalledWith(
      "🔤 Failed ingesting word",
      expect.any(String),
      { word: "amo" },
    );
    expect(appendFileSyncMock).toHaveBeenCalledTimes(1);
  });

  it("should process wiktionary category link and wait for request delay", async () => {
    vi.useFakeTimers();

    const ingestWordSpy = vi
      .spyOn(
        command as unknown as {
          ingestWord: (
            word: string,
            urlPath: string,
            category: string,
          ) => Promise<void>;
        },
        "ingestWord",
      )
      .mockResolvedValue(undefined);

    const $ = cheerio.load('<a href="/wiki/amo">amo</a>');
    const anchor = $("a").get(0);
    if (!anchor) {
      throw new Error("Expected anchor node");
    }

    const promise = (
      command as unknown as {
        processWiktionaryCategoryLink: (
          element: Element,
          cheerioApi: cheerio.CheerioAPI,
          category: string,
        ) => Promise<void>;
      }
    ).processWiktionaryCategoryLink(anchor, $, "lemma");

    await vi.advanceTimersByTimeAsync(500);
    await promise;

    expect(ingestWordSpy).toHaveBeenCalledWith("amo", "/wiki/amo", "lemma");

    vi.useRealTimers();
  });

  it("should append error log when category ingestion fails", async () => {
    vi.spyOn(
      command as unknown as {
        fetchCategoryPage: (urlPath: string) => Promise<cheerio.CheerioAPI>;
      },
      "fetchCategoryPage",
    ).mockRejectedValue(new Error("category failure"));

    await (
      command as unknown as {
        ingestCategory: (
          category: "lemma",
          startPath?: string,
        ) => Promise<void>;
      }
    ).ingestCategory("lemma", "/wiki/start");

    expect(logger.error).toHaveBeenCalledWith(
      "🌐 Failed ingesting category",
      expect.any(String),
      expect.objectContaining({ category: "lemma" }),
    );
    expect(appendFileSyncMock).toHaveBeenCalledTimes(1);
  });

  it("should use category error message when error stack is empty", () => {
    const categoryError = new Error("category message fallback");
    categoryError.stack = "";

    (
      command as unknown as {
        handleCategoryError: (
          category: "lemma",
          urlPath: string,
          error: unknown,
        ) => void;
      }
    ).handleCategoryError("lemma", "/wiki/start", categoryError);

    expect(appendFileSyncMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("category message fallback"),
    );
  });

  it("should stringify non-Error category failures", () => {
    (
      command as unknown as {
        handleCategoryError: (
          category: "lemma",
          urlPath: string,
          error: unknown,
        ) => void;
      }
    ).handleCategoryError("lemma", "/wiki/start", "category failure string");

    expect(logger.error).toHaveBeenCalledWith(
      "🌐 Failed ingesting category",
      "category failure string",
      expect.objectContaining({ category: "lemma" }),
    );
  });

  it("should call process link for category page anchors", async () => {
    const firstPage = cheerio.load(`
      <div id="mw-pages">
        <div class="mw-category">
          <div class="mw-category-group">
            <ul><li><a href="/wiki/amo">amo</a></li></ul>
          </div>
        </div>
      </div>
      <a href="">next page</a>
    `);

    vi.spyOn(
      command as unknown as {
        fetchCategoryPage: (urlPath: string) => Promise<cheerio.CheerioAPI>;
      },
      "fetchCategoryPage",
    ).mockResolvedValue(firstPage);

    const processLinkSpy = vi
      .spyOn(
        command as unknown as {
          processWiktionaryCategoryLink: (
            element: Element,
            cheerioApi: cheerio.CheerioAPI,
            category: string,
          ) => Promise<void>;
        },
        "processWiktionaryCategoryLink",
      )
      .mockResolvedValue(undefined);

    await (
      command as unknown as {
        ingestCategory: (
          category: "lemma",
          startPath?: string,
        ) => Promise<void>;
      }
    ).ingestCategory("lemma", "/wiki/start");

    expect(processLinkSpy).toHaveBeenCalledTimes(1);
  });

  it("should follow pagination from default category start path", async () => {
    const firstPage = cheerio.load(`
      <div id="mw-pages">
        <div class="mw-category">
          <div class="mw-category-group">
            <ul><li><a href="/wiki/amo">amo</a></li></ul>
          </div>
        </div>
      </div>
      <a href="/wiki/page-2">next page</a>
    `);
    const secondPage = cheerio.load(`
      <div id="mw-pages">
        <div class="mw-category">
          <div class="mw-category-group">
            <ul><li><a href="/wiki/video">video</a></li></ul>
          </div>
        </div>
      </div>
    `);

    const fetchCategoryPageSpy = vi
      .spyOn(
        command as unknown as {
          fetchCategoryPage: (urlPath: string) => Promise<cheerio.CheerioAPI>;
        },
        "fetchCategoryPage",
      )
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    const processLinkSpy = vi
      .spyOn(
        command as unknown as {
          processWiktionaryCategoryLink: (
            element: Element,
            cheerioApi: cheerio.CheerioAPI,
            category: string,
          ) => Promise<void>;
        },
        "processWiktionaryCategoryLink",
      )
      .mockResolvedValue(undefined);

    await (
      command as unknown as {
        ingestCategory: (
          category: "lemma",
          startPath?: string,
        ) => Promise<void>;
      }
    ).ingestCategory("lemma");

    expect(fetchCategoryPageSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("Category:Latin_lemmas"),
    );
    expect(fetchCategoryPageSpy).toHaveBeenNthCalledWith(2, "/wiki/page-2");
    expect(processLinkSpy).toHaveBeenCalledTimes(2);
  });

  it("should ingest all configured categories", async () => {
    existsSyncMock.mockReturnValue(false);

    const ingestCategorySpy = vi
      .spyOn(
        command as unknown as {
          ingestCategory: (
            category: string,
            startPath?: string,
          ) => Promise<void>;
        },
        "ingestCategory",
      )
      .mockResolvedValue(undefined);

    await command.ingestWiktionary();

    expect(mkdirSyncMock).toHaveBeenCalledTimes(1);
    expect(ingestCategorySpy).toHaveBeenCalledTimes(4);
  });

  it("should not create data directory when it already exists", async () => {
    existsSyncMock.mockReturnValue(true);

    const ingestCategorySpy = vi
      .spyOn(
        command as unknown as {
          ingestCategory: (
            category: string,
            startPath?: string,
          ) => Promise<void>;
        },
        "ingestCategory",
      )
      .mockResolvedValue(undefined);

    await command.ingestWiktionary();

    expect(mkdirSyncMock).not.toHaveBeenCalled();
    expect(ingestCategorySpy).toHaveBeenCalledTimes(4);
  });

  it("should delegate run to ingestWiktionary", async () => {
    const ingestWiktionarySpy = vi
      .spyOn(command, "ingestWiktionary")
      .mockResolvedValue(undefined);

    await command.run();

    expect(ingestWiktionarySpy).toHaveBeenCalledTimes(1);
  });

  it("should not append #Latin when href already includes it", async () => {
    const parseLatinSectionSpy = vi
      .spyOn(
        command as unknown as {
          parseLatinSection: (href: string) => Promise<null | {
            $: cheerio.CheerioAPI;
            section: cheerio.Cheerio<AnyNode>;
          }>;
        },
        "parseLatinSection",
      )
      .mockResolvedValue(null);

    await (
      command as unknown as {
        ingestWord: (
          word: string,
          urlPath: string,
          category: string,
        ) => Promise<void>;
      }
    ).ingestWord("amo", "/wiki/amo#Latin", "lemma");

    expect(parseLatinSectionSpy).toHaveBeenCalledWith(
      "https://en.wiktionary.org/wiki/amo#Latin",
    );
  });

  it("should process category link with missing href using empty fallback", async () => {
    vi.useFakeTimers();

    const ingestWordSpy = vi
      .spyOn(
        command as unknown as {
          ingestWord: (
            word: string,
            urlPath: string,
            category: string,
          ) => Promise<void>;
        },
        "ingestWord",
      )
      .mockResolvedValue(undefined);

    const cheerioApi = cheerio.load("<a>amo</a>");
    const anchor = cheerioApi("a").get(0);
    if (!anchor) {
      throw new Error("Expected anchor node");
    }

    const processPromise = (
      command as unknown as {
        processWiktionaryCategoryLink: (
          element: Element,
          cheerioApi: cheerio.CheerioAPI,
          category: string,
        ) => Promise<void>;
      }
    ).processWiktionaryCategoryLink(anchor, cheerioApi, "lemma");

    await vi.advanceTimersByTimeAsync(500);
    await processPromise;

    expect(ingestWordSpy).toHaveBeenCalledWith("amo", "", "lemma");

    vi.useRealTimers();
  });

  it("should use word error message fallback when stack is empty", async () => {
    const wordError = new Error("word message fallback");
    wordError.stack = "";

    vi.spyOn(
      command as unknown as {
        ingestWord: (
          word: string,
          urlPath: string,
          category: string,
        ) => Promise<void>;
      },
      "ingestWord",
    ).mockRejectedValue(wordError);

    const cheerioApi = cheerio.load('<a href="/wiki/amo">amo</a>');
    const anchor = cheerioApi("a").get(0);
    if (!anchor) {
      throw new Error("Expected anchor node");
    }

    await (
      command as unknown as {
        processWiktionaryCategoryLink: (
          element: Element,
          cheerioApi: cheerio.CheerioAPI,
          category: string,
        ) => Promise<void>;
      }
    ).processWiktionaryCategoryLink(anchor, cheerioApi, "lemma");

    expect(appendFileSyncMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("word message fallback"),
    );
  });
});
