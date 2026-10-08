import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import * as cheerio from "cheerio";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { categories } from "./wiktionary.constants";

import type { WiktionaryPage } from "../lexico-ingestion/lexico-ingestion.types";
import type { Category } from "./wiktionary.types";
import type { AnyNode, Element } from "domhandler";

/**
 * Downloads all Latin Wiktionary category pages and stores each article's
 * HTML as a JSON file under `./data/wiktionary`, following pagination until
 * every page in every configured category is exhausted.
 */
@Command({
  description: "Run the wiktionary command",
  name: "wiktionary",
})
@Injectable()
export class WiktionaryCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    super();
    this.logger.setContext(WiktionaryCommand.name);

    const outputDirectory = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDirectory))
      fs.mkdirSync(outputDirectory, { recursive: true });
    this.errorLogFilePath = path.join(
      outputDirectory,
      `wiktionary-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.log`,
    );
  }

  // 🔐 Private Fields

  private readonly directory = path.join(process.cwd(), "./data/wiktionary");
  private readonly errorLogFilePath: string;
  private readonly host = "https://en.wiktionary.org";
  private readonly maximumRetries = 5;
  private readonly maximumRetryDelayMilliseconds = 60_000;
  private readonly requestDelayMilliseconds = 500;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Escape capitals for Wiktionary ingestion.
   */
  private escapeCapitals(word: string): string {
    return word.replaceAll(
      /[A-Z]/g,
      (character) => `_${character.toLowerCase()}`,
    );
  }
  /**
   * Fetch category page for Wiktionary ingestion.
   */
  private async fetchCategoryPage(
    urlPath: string,
  ): Promise<cheerio.CheerioAPI> {
    const response = await this.fetchWithRetry(this.host + urlPath);
    if (!response.ok)
      throw new Error(
        `HTTP ${response.status.toString()} ${response.statusText}`,
      );
    const html = await response.text();
    return cheerio.load(html);
  }

  /**
   * Fetch with retry for Wiktionary ingestion.
   */
  private async fetchWithRetry(
    url: string,
    retries = this.maximumRetries,
  ): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const response = await fetch(url);

      if (response.status !== 429) return response;

      const retryAfter = response.headers.get("Retry-After");
      const backoffMilliseconds = Math.min(
        retryAfter ? Number(retryAfter) * 1000 : 1000 * 2 ** attempt,
        this.maximumRetryDelayMilliseconds,
      );

      this.logger.warn(`⏳ Waiting after a rate limit`, undefined, {
        attempt,
        backoffMilliseconds,
        retries,
      });
      await new Promise((resolve) => {
        setTimeout(resolve, backoffMilliseconds);
      });
    }

    this.logger.warn("🚫 Exhausted retries after a rate limit", undefined, {
      retries,
      url,
    });

    // Final attempt — let caller handle non-ok response
    return fetch(url);
  }

  /**
   * Handle category error for Wiktionary ingestion.
   */
  private handleCategoryError(
    category: Category,
    urlPath: string,
    error: unknown,
  ): void {
    const errorMessage =
      error instanceof Error ? error.stack || error.message : String(error);
    this.logger.error("🌐 Failed ingesting category", errorMessage, {
      category,
      url: `${this.host}${urlPath}`,
    });
    fs.appendFileSync(
      this.errorLogFilePath,
      `[${new Date().toISOString()}] category ${category}: ${errorMessage}\n`,
    );
  }

  /**
   * Ingests category in the Wiktionary ingestion pipeline.
   */
  private async ingestCategory(
    category: Category = "lemma",
    startPath?: string,
  ): Promise<void> {
    this.logger.info("🗂️ Ingesting category", undefined, { category });
    let urlPath: string =
      startPath ??
      `/w/index.php?title=Category:${categories[category]}&pagefrom=a`;

    try {
      while (urlPath) {
        this.logger.info("📄 Ingesting page", undefined, {
          url: `${this.host}${urlPath}`,
        });
        const $ = await this.fetchCategoryPage(urlPath);

        for (const a of $(
          "#mw-pages div.mw-category > div.mw-category-group > ul > li a",
        )) {
          await this.processWiktionaryCategoryLink(a, $, category);
        }

        urlPath = $('a:contains("next page")').eq(0).attr("href") ?? "";

        this.logger.info("📄 Ingested page", undefined, {
          url: `${this.host}${urlPath}`,
        });
      }
      this.logger.info("🗂️ Ingested category", undefined, { category });
    } catch (error: unknown) {
      this.handleCategoryError(category, urlPath, error);
    }
  }

  /**
   * Ingests word in the Wiktionary ingestion pipeline.
   */
  private async ingestWord(
    word: string,
    urlPath: string,
    category: string,
  ): Promise<void> {
    let resolvedUrlPath = urlPath;
    if (!resolvedUrlPath.includes("#Latin")) resolvedUrlPath += "#Latin";
    const entry: WiktionaryPage = {
      category,
      href: `${this.host}${resolvedUrlPath}`,
      word,
    };

    this.logger.info("💬 Ingesting word", undefined, { word: entry.word });

    if (entry.href.includes("/w/index.php")) {
      this.logger.warn("🌐 Missing wiktionary page for word", undefined, {
        word: entry.word,
      });
      return;
    }

    const parsed = await this.parseLatinSection(entry.href);
    if (!parsed) {
      this.logger.warn("🌐 Missing latin entry for word", undefined, {
        word: entry.word,
      });
      return;
    }

    this.saveWiktionaryEntry(entry, parsed.section, parsed.$);
  }

  /**
   * Parses latin section during Wiktionary ingestion.
   */
  private async parseLatinSection(href: string): Promise<null | {
    $: cheerio.CheerioAPI;
    section: cheerio.Cheerio<AnyNode>;
  }> {
    const response = await this.fetchWithRetry(href);
    if (!response.ok)
      throw new Error(
        `HTTP ${response.status.toString()} ${response.statusText}`,
      );
    const html = await response.text();
    const $ = cheerio.load(html);
    const section = $("#Latin")
      .parent()
      .nextUntil(".mw-heading.mw-heading2, hr");
    if (section.length === 0) return null;
    return { $, section };
  }

  /**
   * Processes wiktionary category link during Wiktionary ingestion.
   */
  private async processWiktionaryCategoryLink(
    a: Element,
    $: cheerio.CheerioAPI,
    category: string,
  ): Promise<void> {
    const word = $(a).text();
    const href = $(a).attr("href") ?? "";
    if (/(Reconstruction:)|(Appendix:)/gi.test(word)) return;
    if (word.includes("/")) return;
    try {
      await this.ingestWord(word, href, category);
      await new Promise((resolve) => {
        setTimeout(resolve, this.requestDelayMilliseconds);
      });
    } catch (wordError: unknown) {
      const errorMessage =
        wordError instanceof Error
          ? wordError.stack || wordError.message
          : String(wordError);
      this.logger.error("🔤 Failed ingesting word", String(wordError), {
        word,
      });
      fs.appendFileSync(
        this.errorLogFilePath,
        `[${new Date().toISOString()}] ${word}: ${errorMessage}\n`,
      );
    }
  }

  /**
   * Save wiktionary entry for Wiktionary ingestion.
   */
  private saveWiktionaryEntry(
    entry: WiktionaryPage,
    section: cheerio.Cheerio<AnyNode>,
    $: cheerio.CheerioAPI,
  ): void {
    const entryWithHtml: WiktionaryPage = {
      ...entry,
      html: `<div class="${entry.word}">${$.html(section)}</div>`,
    };
    const filePath = path.join(
      this.directory,
      `${this.escapeCapitals(entry.word)}.json`,
    );
    fs.writeFileSync(filePath, JSON.stringify(entryWithHtml));
    this.logger.info("💬 Ingested word", undefined, { word: entry.word });
  }

  // 🌎 Public Methods

  /** Scrapes every configured Latin category from Wiktionary, stores each
   * article's HTML as a JSON file under `./data/wiktionary`, following
   * pagination until all pages in each category are exhausted. */
  async ingestWiktionary(): Promise<void> {
    this.logger.info("🌐 Ingesting wiktionary");
    if (!fs.existsSync(this.directory)) {
      fs.mkdirSync(this.directory, { recursive: true });
    }

    for (const category of Object.keys(categories).filter(
      (key): key is Category => Object.hasOwn(categories, key),
    )) {
      await this.ingestCategory(category);
    }
    this.logger.info("🌐 Ingested wiktionary");
  }

  /** Runs the Wiktionary ingestion pipeline. */
  async run(): Promise<void> {
    await this.ingestWiktionary();
  }
}
