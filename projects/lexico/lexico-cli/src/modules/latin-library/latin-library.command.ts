import * as fs from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import * as cheerio from "cheerio";
import cheerioTableParser from "cheerio-tableparser";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

/**
 * Crawls The Latin Library and stores source HTML pages under `data/latin-library-source`.
 */
@Command({
  description: "Run the latin-library command",
  name: "latin-library",
})
@Injectable()
export class LatinLibraryCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    super();
    this.logger.setContext(LatinLibraryCommand.name);

    this.errorLogFilePath =
      this.logger.createTimestampedOutputLogFilePath("latin-library");
  }

  // 🔐 Private Fields

  private readonly errorLogFilePath: string;
  private readonly sourceDataDirectory = path.resolve(
    "data",
    "latin-library-source",
  );
  private readonly sourceHost = "https://www.thelatinlibrary.com/";

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Handles an internal workflow step for Latin Library source crawling.
   */
  private async downloadAndSaveLatinLibraryFile(
    parsedUrl: URL,
    targetPath: string,
  ): Promise<string> {
    const response = await fetch(parsedUrl.href);
    if (!response.ok) {
      this.logger.warn("📥 Failed fetching", undefined, {
        url: parsedUrl.href,
      });
      return "";
    }
    const text = await response.text();
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, text, "utf8");
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    return text;
  }

  /**
   * Handles an internal workflow step for Latin Library source crawling.
   */
  private enqueueAuthorUrls(
    finalAuthorUrls: string[],
    host: string,
    enqueue: (url: string) => void,
  ): void {
    for (const authorHref of finalAuthorUrls) {
      let authorUrl = new URL(authorHref, host).href;
      if (!authorHref.endsWith("/") && !path.extname(authorHref)) {
        authorUrl += "/";
      }
      enqueue(authorUrl);
    }
  }

  /**
   * Loads source data required by Latin Library source crawling.
   */
  private async fetchAndCachePage(
    urlString: string,
    host: string,
  ): Promise<string> {
    const parsed = new URL(urlString, host);
    const relative = this.getRelativePath(urlString, host);
    const targetPath = path.join(this.sourceDataDirectory, relative);

    try {
      return await fs.readFile(targetPath, "utf8");
    } catch {
      // File does not exist, continue to download
    }

    this.logger.info("📥 Downloading", undefined, { url: parsed.href });
    try {
      return await this.downloadAndSaveLatinLibraryFile(parsed, targetPath);
    } catch (error) {
      this.logger.error("📥 Failed downloading", String(error), {
        url: parsed.href,
      });
      return "";
    }
  }

  /**
   * Resolves derived values needed by Latin Library source crawling.
   */
  private getAuthorUrls(indexHtml: string): string[] {
    const $index = cheerio.load(indexHtml);
    cheerioTableParser($index);

    const authorUrls: string[] = [];

    $index("p>table")
      .first()
      .find("a")
      .each((_index, a) => {
        const href = $index(a).attr("href")?.trim();
        if (href && !href.includes("index.html")) {
          authorUrls.push(href);
        }
      });

    return authorUrls;
  }

  /**
   * Resolves derived values needed by Latin Library source crawling.
   */
  private getBaseUrl(urlString: string): string {
    const parsed = new URL(urlString);
    const extension = path.extname(parsed.pathname).toLowerCase();
    let baseUrl = urlString;
    if (!urlString.endsWith("/") && !extension) {
      baseUrl += "/";
    }
    return baseUrl;
  }

  /**
   * Resolves derived values needed by Latin Library source crawling.
   */
  private async getFinalAuthorUrls(
    host: string,
    authorUrls: string[],
  ): Promise<string[]> {
    const categoryHrefs = new Set([
      "christian.html",
      "ius.html",
      "medieval.html",
      "misc.html",
      "neo.html",
    ]);

    const finalAuthorUrls: string[] = [];

    for (const href of authorUrls) {
      if (categoryHrefs.has(href)) {
        await this.processCategoryHref(href, host, finalAuthorUrls);
      } else {
        finalAuthorUrls.push(href);
      }
    }

    return finalAuthorUrls;
  }

  /**
   * Resolves derived values needed by Latin Library source crawling.
   */
  private getRelativePath(urlString: string, host: string): string {
    const parsed = new URL(urlString, host);
    let relative = parsed.pathname;
    if (relative.startsWith("/")) relative = relative.slice(1);
    if (!relative) relative = "index.html";
    if (relative.endsWith("/")) relative += "index.html";
    else if (!path.extname(relative)) relative += ".html";
    return relative;
  }

  /**
   * Returns whether the current input should proceed in Latin Library source crawling.
   */
  private isIgnoredLinkFileName(href: string): boolean {
    const ignoredFiles = [
      "index.html",
      "classics.html",
      "medieval.html",
      "neo.html",
      "christian.html",
      "misc.html",
      "ius.html",
    ];
    return ignoredFiles.some((f) => href.includes(f));
  }

  /**
   * Returns whether the current input should proceed in Latin Library source crawling.
   */
  private isIgnoredProtocol(href: string): boolean {
    const normalized = href.toLowerCase();
    return (
      normalized.startsWith("mailto:") ||
      normalized.startsWith("javascript:") ||
      normalized.startsWith("data:") ||
      normalized.startsWith("vbscript:")
    );
  }

  /**
   * Returns whether the current input should proceed in Latin Library source crawling.
   */
  private isInvalidExtension(href: string): boolean {
    const normalizedHref = href.toLowerCase();
    const allowedExtensions = [".html", ".htm", ".shtml"];
    const hasAllowedExtension = allowedExtensions.some((extension) =>
      normalizedHref.endsWith(extension),
    );
    const isDirectory = path.extname(normalizedHref) === "";

    return !hasAllowedExtension && !isDirectory;
  }

  /**
   * Returns whether the current input should proceed in Latin Library source crawling.
   */
  private isParsableHtmlExtension(urlString: string): boolean {
    const parsed = new URL(urlString);
    const extension = path.extname(parsed.pathname).toLowerCase();
    return (
      !extension ||
      extension === ".html" ||
      extension === ".htm" ||
      extension === ".shtml"
    );
  }

  /**
   * Returns whether the current input should proceed in Latin Library source crawling.
   */
  private isSkipPath(nextParsed: URL): boolean {
    const skipPaths = [
      "/ll1/",
      "/ll2/",
      "/caes/",
      "/catullus/",
      "/courses/",
      "/livius/",
      "/sallust/",
      "/satire/",
      "/virgil/",
      "/historians/",
      "/imperialism/",
      "/law/",
      "/about.html",
      "/cred.html",
      "/technical.html",
      "/epubs.html",
    ];
    return skipPaths.some((p) => nextParsed.pathname.startsWith(p));
  }

  /**
   * Parses and normalizes inputs for Latin Library source crawling.
   */
  private parseHtmlForLinks(
    html: string,
    baseUrl: string,
    enqueue: (url: string) => void,
  ): void {
    const $ = cheerio.load(html);

    $("a").each((_index, a) => {
      const href = $(a).attr("href")?.trim();
      if (href) {
        this.processLink(href, baseUrl, enqueue);
      }
    });
  }

  /**
   * Processes one workflow step for Latin Library source crawling.
   */
  private async processCategoryHref(
    href: string,
    host: string,
    finalAuthorUrls: string[],
  ): Promise<void> {
    const catHtml = await this.fetchAndCachePage(
      new URL(href, host).href,
      host,
    );
    const $cat = cheerio.load(catHtml);

    $cat("table a").each((_index, a) => {
      let childHref = $cat(a).attr("href")?.trim();

      // Fix malformed link in christian.html
      if (!childHref && $cat(a).text().includes("Biblia Sacra")) {
        childHref = "bible.html";
      }

      if (
        childHref &&
        !childHref.includes("index.html") &&
        !childHref.includes("classics.html")
      ) {
        finalAuthorUrls.push(
          childHref.startsWith("/") ? childHref.slice(1) : childHref,
        );
      }
    });
  }

  /**
   * Processes one workflow step for Latin Library source crawling.
   */
  private processLink(
    href: string,
    baseUrl: string,
    enqueue: (url: string) => void,
  ): void {
    if (this.shouldSkipLink(href)) return;

    const absoluteUrl = new URL(href, baseUrl).href;
    const nextParsed = new URL(absoluteUrl);

    if (nextParsed.hostname === "www.thelatinlibrary.com") {
      if (this.isSkipPath(nextParsed)) {
        return;
      }
      enqueue(absoluteUrl);
    }
  }

  /**
   * Processes one workflow step for Latin Library source crawling.
   */
  private async processQueueUrl(
    urlString: string,
    host: string,
    enqueue: (url: string) => void,
  ): Promise<void> {
    try {
      const html = await this.fetchAndCachePage(urlString, host);
      if (!html) return;

      if (this.isParsableHtmlExtension(urlString)) {
        const baseUrl = this.getBaseUrl(urlString);
        this.parseHtmlForLinks(html, baseUrl, enqueue);
      }
    } catch (error: unknown) {
      const { logLine } = this.logger.buildErrorLogEntry(urlString, error);
      this.logger.error("📜 Failed processing", String(error), {
        urlString,
      });
      await fs.appendFile(this.errorLogFilePath, logLine);
    }
  }

  /**
   * Handles an internal workflow step for Latin Library source crawling.
   */
  private shouldSkipLink(href: string): boolean {
    if (this.isIgnoredLinkFileName(href)) return true;
    if (this.isIgnoredProtocol(href)) return true;
    return this.isInvalidExtension(href);
  }

  // 🌎 Public Methods

  /**
   * Crawls The Latin Library and caches discovered HTML pages locally.
   */
  async run(): Promise<void> {
    const host = this.sourceHost;
    this.logger.info("🕷️ Starting to scrape The Latin Library", undefined, {
      host,
    });

    await fs.mkdir(this.sourceDataDirectory, { recursive: true });

    // 1. Fetch index
    const indexHtml = await this.fetchAndCachePage(host, host);

    const authorUrls = this.getAuthorUrls(indexHtml);
    const finalAuthorUrls = await this.getFinalAuthorUrls(host, authorUrls);

    // 3. Visit authors and find text URLs (using BFS to crawl all sub-pages)
    const queue: string[] = [];
    const visited = new Set<string>();

    const enqueue = (url: string): void => {
      // Normalize URL (strip hash)
      const parsed = new URL(url);
      parsed.hash = "";
      const normalized = parsed.href;

      if (!visited.has(normalized)) {
        visited.add(normalized);
        queue.push(normalized);
      }
    };

    this.enqueueAuthorUrls(finalAuthorUrls, host, enqueue);

    this.logger.info(
      "🕸️ Queueing author root pages for deep crawl",
      undefined,
      { count: queue.length },
    );

    const worker = async (): Promise<void> => {
      while (queue.length > 0) {
        const urlString = queue.shift();
        if (!urlString) continue;
        await this.processQueueUrl(urlString, host, enqueue);
      }
    };

    // Process queue with concurrency
    await Promise.all(Array.from({ length: 5 }, async () => worker()));

    this.logger.info("🕷️ Scraped The Latin Library");
  }
}
