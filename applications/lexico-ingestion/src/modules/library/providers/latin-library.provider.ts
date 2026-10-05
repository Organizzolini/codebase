import * as fs from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import * as cheerio from "cheerio";
import cheerioTableParser from "cheerio-tableparser";
import _ from "lodash";

import { Author, Text } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { hasValidTextContent } from "../library.utilities";

import { LatinLibraryBuilder } from "./latin-library.builder";

import type { AnyNode } from "domhandler";

/**
 * Provider for scraping The Latin Library.
 */
@Injectable()
export class LatinLibraryProvider {
  constructor(
    private readonly builder: LatinLibraryBuilder,
    private readonly logger: LoggerService,
  ) {}

  readonly name = "thelatinlibrary";

  // 🔏 Private Methods

  /**
   * Builds structured data used during Latin Library provider ingestion.
   */
  private addFallbackText(author: Author, authorUrlObject: URL): void {
    const fallback = new Text();
    fallback.title = this.getMetadataString(author.metadata, "nickname") ?? "";
    fallback.slug = _.kebabCase(fallback.title);
    fallback.type = "text";
    fallback.metadata = { sourceUrl: authorUrlObject.href };
    author.texts = [fallback];
  }

  /**
   * Builds structured data used during Latin Library provider ingestion.
   */
  private addTextToBook(args: {
    author: Author;
    book: string;
    booksMap: Map<string, Text>;
    textEntity: Text;
  }): void {
    const { author, book, booksMap, textEntity } = args;
    if (!textEntity.metadata) {
      textEntity.metadata = {};
    }
    textEntity.metadata["book"] = book;
    let bookText = booksMap.get(book);
    if (!bookText) {
      bookText = new Text();
      bookText.type = "book";
      bookText.title = book;
      bookText.slug = _.kebabCase(book);
      bookText.childTexts = [];
      booksMap.set(book, bookText);
      author.texts.push(bookText);
    }
    bookText.childTexts.push(textEntity);
  }

  /**
   * Builds structured data used during Latin Library provider ingestion.
   */
  private buildCategoryAuthor(
    anchorElement: AnyNode,
    $cat: cheerio.CheerioAPI,
  ): Author | null {
    return this.builder.buildCategoryAuthor(anchorElement, $cat);
  }

  /**
   * Builds structured data used during Latin Library provider ingestion.
   */
  private buildRootAuthors(html: string): Author[] {
    return this.builder.buildRootAuthors(html);
  }

  /**
   * Handles an internal workflow step for Latin Library provider ingestion.
   */
  private cleanupAuthorMetadata(author: Author): void {
    if (author.metadata) {
      delete author.metadata["nickname"];
    }
    for (const text of author.texts) {
      if (text.type === "book") {
        text.childTexts.forEach((child) => {
          if (child.metadata) {
            delete child.metadata["book"];
          }
        });
      } else if (text.metadata) {
        delete text.metadata["book"];
      }
    }
  }

  /**
   * Extracts normalized content for Latin Library provider ingestion.
   */
  private collectAuthorTexts(
    author: Author,
    $: cheerio.CheerioAPI,
    authorUrlObject: URL,
  ): void {
    const booksMap = new Map<string, Text>();
    for (const anchor of $("a").get()) {
      this.processTextLink({ $, anchor, author, authorUrlObject, booksMap });
    }
    if (author.texts.length === 0) {
      this.addFallbackText(author, authorUrlObject);
    }
  }

  /**
   * Handles an internal workflow step for Latin Library provider ingestion.
   */
  private async expandCategoryAuthors(
    rootAuthors: Author[],
    host: string,
  ): Promise<Author[]> {
    const categoryHrefs = new Set([
      "christian.html",
      "ius.html",
      "medieval.html",
      "misc.html",
      "neo.html",
    ]);
    const authors: Author[] = [];
    for (const author of rootAuthors) {
      const href = this.getMetadataString(author.metadata, "sourceUrl");
      if (!href) {
        continue;
      }

      if (!categoryHrefs.has(href)) {
        authors.push(author);
        continue;
      }
      const catHtml = await this.readSourceCacheFile(
        new URL(href, host).href,
        host,
      );
      const $cat = cheerio.load(catHtml);
      cheerioTableParser($cat);
      $cat("table a").each((_index, a) => {
        const result = this.buildCategoryAuthor(a, $cat);
        if (result) {
          authors.push(result);
        }
      });
    }
    return authors;
  }

  /**
   * Returns a string metadata value by key when present.
   */
  private getMetadataString(
    metadata: null | Record<string, unknown> | undefined,
    key: string,
  ): string | undefined {
    const value = metadata?.[key];
    return typeof value === "string" ? value : undefined;
  }

  /**
   * Processes one workflow step for Latin Library provider ingestion.
   */
  private async processAuthorPage(author: Author, host: string): Promise<void> {
    const nickname = this.getMetadataString(author.metadata, "nickname") ?? "";
    const authorPath = this.getMetadataString(author.metadata, "sourceUrl");
    if (!authorPath) {
      this.logger.warn("🔗 Missing source URL for author", undefined, {
        authorSlug: author.slug,
      });
      return;
    }

    this.logger.info("👤 Starting author metadata", undefined, { nickname });
    const authorUrlObject = new URL(authorPath, host);
    const authorText = await this.readSourceCacheFile(
      authorUrlObject.href,
      host,
    );
    const $ = cheerio.load(authorText);
    const additionalMetadata = this.builder.extractAuthorPageMetadata(
      $,
      author.name,
    );
    if (Object.keys(additionalMetadata).length > 0) {
      author.metadata = { ...author.metadata, ...additionalMetadata };
    }
    this.collectAuthorTexts(author, $, authorUrlObject);
    this.logger.info("👤 Completed author metadata", undefined, { nickname });
  }

  /**
   * Processes one workflow step for Latin Library provider ingestion.
   */
  private processTextLink(args: {
    $: cheerio.CheerioAPI;
    anchor: AnyNode;
    author: Author;
    authorUrlObject: URL;
    booksMap: Map<string, Text>;
  }): void {
    const { $, anchor, author, authorUrlObject, booksMap } = args;
    const href = $(anchor).attr("href")?.trim();
    if (
      !href ||
      this.builder.isSkippedHref(href) ||
      !this.builder.isTextFileHref(href)
    ) {
      return;
    }
    const absoluteUrl = new URL(href, authorUrlObject.href).href;
    if (this.builder.isExternalOrSelfLink(absoluteUrl, authorUrlObject)) {
      return;
    }
    const rawBook = this.builder.findRawBookHeading(anchor, $);
    const book = rawBook ? _.startCase(rawBook) : undefined;
    const textEntity = this.builder.buildTextEntityForLink(
      anchor,
      $,
      absoluteUrl,
    );
    if (book === undefined) {
      author.texts.push(textEntity);
    } else {
      this.addTextToBook({ author, book, booksMap, textEntity });
    }
  }

  /**
   * Processes one workflow step for Latin Library provider ingestion.
   */
  private async processWork(args: {
    author: Author;
    authorPath: string;
    host: string;
    index: number;
    textFilter: string | undefined;
    total: number;
    work: Text;
  }): Promise<void> {
    const { author, authorPath, host, index, textFilter, total, work } = args;
    const textSlug = this.builder.getTextSlug(work, author);
    if (textFilter && textSlug !== textFilter) {
      return;
    }
    this.logger.info("📜 Starting work", undefined, { textSlug });
    try {
      const written = await this.writeWorkText({
        author,
        authorPath,
        host,
        work,
      });
      if (!written) {
        return;
      }
      this.logger.info("📜 Completed work", undefined, {
        current: index + 1,
        percent: Number((((index + 1) / total) * 100).toFixed(2)),
        textSlug,
        total,
      });
    } catch (error) {
      this.logger.error(
        "📕 Failed fetching work",
        error instanceof Error ? error.stack : undefined,
        { title: work.title },
      );
    }
  }

  /**
   * Loads source data required by Latin Library provider ingestion.
   */
  private async readSourceCacheFile(
    urlString: string,
    host: string,
  ): Promise<string> {
    const parsed = new URL(urlString, host);
    let relative = parsed.pathname;
    if (relative.startsWith("/")) relative = relative.slice(1);
    if (!relative) relative = "index.html";
    if (relative.endsWith("/")) relative += "index.html";
    const targetPath = path.resolve("data", "latin-library-source", relative);
    return fs.readFile(targetPath, "utf8");
  }

  /**
   * Persists generated output for Latin Library provider ingestion.
   */
  private async saveWorkTextMarkdown(args: {
    authorPath: string;
    markdown: string;
    work: Text;
    workBook: string | undefined;
  }): Promise<void> {
    const { authorPath, markdown, work, workBook } = args;
    const safeTitle = _.kebabCase(work.title);
    if (workBook) {
      const safeBook = _.kebabCase(workBook);
      const bookPath = path.join(authorPath, safeBook);
      await fs.mkdir(bookPath, { recursive: true });
      await fs.writeFile(
        path.join(bookPath, `${safeTitle}.md`),
        markdown,
        "utf8",
      );
    } else {
      await fs.writeFile(
        path.join(authorPath, `${safeTitle}.md`),
        markdown,
        "utf8",
      );
    }
  }

  /**
   * Persists generated output for Latin Library provider ingestion.
   */
  private async writeAuthorTexts(args: {
    author: Author;
    dataPath: string;
    host: string;
    options?: { author?: string; text?: string };
  }): Promise<void> {
    const { author, dataPath, host, options } = args;
    if (options?.author && author.slug !== options.author) {
      return;
    }
    const authorPath = path.join(dataPath, author.slug);
    await fs.mkdir(authorPath, { recursive: true });
    const allTextNodes = author.texts.flatMap((text) =>
      text.type === "book" ? text.childTexts : [text],
    );
    const total = allTextNodes.length;
    for (const [index, work] of allTextNodes.entries()) {
      await this.processWork({
        author,
        authorPath,
        host,
        index,
        textFilter: options?.text,
        total,
        work,
      });
    }
  }

  /**
   * Persists generated output for Latin Library provider ingestion.
   */
  private async writeWorkText(args: {
    author: Author;
    authorPath: string;
    host: string;
    work: Text;
  }): Promise<boolean> {
    const { author, authorPath, host, work } = args;
    const workBook = this.getMetadataString(work.metadata, "book");
    const workPath = this.getMetadataString(work.metadata, "sourceUrl");
    if (!workPath) {
      this.logger.warn("🔗 Missing source URL for work", undefined, {
        slug: work.slug,
      });
      return false;
    }

    const workHtml = await this.readSourceCacheFile(workPath, host);
    const $work = cheerio.load(workHtml);
    const paragraphs = this.builder.parseWorkParagraphs($work);
    if (!hasValidTextContent(paragraphs)) {
      this.logger.warn("📜 Skipping empty or invalid text", undefined, {
        slug: work.slug,
      });
      return false;
    }
    const markdown = this.builder.buildWorkMarkdownContent({
      $work,
      author,
      paragraphs,
      work,
      workBook,
    });
    await this.saveWorkTextMarkdown({ authorPath, markdown, work, workBook });
    return true;
  }

  /**
   * Fetch authors, works, and output markdown files to the data directory.
   */
  async ingest(options?: {
    author?: string;
    text?: string;
  }): Promise<Author[]> {
    const host = "https://www.thelatinlibrary.com/";
    this.logger.info("🗂️ Reading Latin Library from local cache");
    const indexHtml = await this.readSourceCacheFile(host, host);
    const rootAuthors = this.buildRootAuthors(indexHtml);
    const authors = await this.expandCategoryAuthors(rootAuthors, host);
    authors.sort((a, b) =>
      (this.getMetadataString(a.metadata, "nickname") ?? "").localeCompare(
        this.getMetadataString(b.metadata, "nickname") ?? "",
      ),
    );
    const authorsToProcess = options?.author
      ? authors.filter((a) => a.slug === options.author)
      : authors;
    for (const author of authorsToProcess) {
      await this.processAuthorPage(author, host);
    }
    const dataPath = path.resolve("data", "library", this.name);
    await fs.mkdir(dataPath, { recursive: true });
    for (const author of authors) {
      await this.writeAuthorTexts({
        author,
        dataPath,
        host,
        ...(options ? { options } : {}),
      });
    }
    authors.forEach((author) => this.cleanupAuthorMetadata(author));
    return authors;
  }
}
