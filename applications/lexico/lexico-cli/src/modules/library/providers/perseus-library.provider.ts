import * as fs from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import * as cheerio from "cheerio";
import _ from "lodash";
import YAML from "yaml";

import { Author, Text } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import {
  PerseusLibraryTextExtractionProvider,
  type PerseusMarkdownFile,
} from "./perseus-library-text-extraction.provider";

/**
 * Provider for ingesting Perseus DL Latin texts.
 */
@Injectable()
export class PerseusLibraryProvider {
  constructor(
    private readonly perseusLibraryTextExtractionProvider: PerseusLibraryTextExtractionProvider,
    private readonly logger: LoggerService,
  ) {}

  readonly name = "perseus";

  /**
   * Builds structured data used during Perseus XML ingestion.
   */
  private addPerseusTextEntity(args: {
    author: Author;
    metadata: Record<string, unknown>;
    rawTitle: string;
    relativeSourcePath: string;
    titleSlug: string;
  }): void {
    const { author, metadata, rawTitle, relativeSourcePath, titleSlug } = args;
    const textEntity = new Text();
    textEntity.metadata = { ...metadata, sourceUrl: relativeSourcePath };
    textEntity.title = rawTitle;
    textEntity.slug = titleSlug;
    textEntity.type = "text";
    author.texts.push(textEntity);
  }

  // 🔏 Private Methods

  /**
   * Extracts normalized content for Perseus XML ingestion.
   */
  private async collectSourceXmlPaths(
    sourceDataDirectory: string,
  ): Promise<string[]> {
    try {
      const allFiles = await fs.readdir(sourceDataDirectory, {
        recursive: true,
        withFileTypes: true,
      });
      const xmlPaths = allFiles
        .filter((f) => f.isFile() && f.name.endsWith(".xml"))
        .map((f) => path.join(f.parentPath, f.name));
      this.logger.info(
        "🗂️ Found Latin XML files in local Perseus cache",
        undefined,
        { count: xmlPaths.length },
      );
      return xmlPaths;
    } catch {
      this.logger.error(
        `📁 Failed reading the source directory. Did you run the perseus command first?`,
      );
      return [];
    }
  }

  /**
   * Extracts normalized content for Perseus XML ingestion.
   */
  private extractPerseusMetadata(
    $: cheerio.CheerioAPI,
    relativeSourcePath: string,
  ): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};
    const editors = $("titleStmt editor")
      .map((_index, element) => $(element).text().trim())
      .get();
    if (editors.length > 0) {
      metadata["editors"] = editors;
    }
    const publisher =
      $("sourceDesc biblStruct publisher").first().text().trim() ||
      $("sourceDesc publisher").first().text().trim();
    if (publisher) {
      metadata["publisher"] = publisher;
    }
    const printDate =
      $("sourceDesc biblStruct date").first().text().trim() ||
      $("sourceDesc date").first().text().trim();
    if (printDate) {
      metadata["print_publication_date"] = printDate;
    }
    const urnMatch = /(phi\d+\.phi\d+\.perseus-lat\d+)/.exec(
      relativeSourcePath,
    );
    if (urnMatch) {
      metadata["cts_urn"] = `urn:cts:latinLit:${urnMatch[1]}`;
    }
    return metadata;
  }

  /**
   * Resolves derived values needed by Perseus XML ingestion.
   */
  private getOrCreatePerseusAuthor(args: {
    authorSlug: string;
    authorsMap: Map<string, Author>;
    rawAuthor: string;
    relativeSourcePath: string;
  }): Author {
    const { authorSlug, authorsMap, rawAuthor, relativeSourcePath } = args;
    let author = authorsMap.get(authorSlug);
    if (!author) {
      author = new Author();
      author.name = rawAuthor;
      author.metadata = { sourceUrl: relativeSourcePath };
      author.slug = authorSlug;
      author.texts = [];
      authorsMap.set(authorSlug, author);
    }
    return author;
  }

  /**
   * Returns whether the current input should proceed in Perseus XML ingestion.
   */
  private isFilteredOut(
    rawAuthor: string,
    rawTitle: string,
    options?: { author?: string; text?: string },
  ): boolean {
    const authorSlug = _.kebabCase(rawAuthor);
    const titleSlug = _.kebabCase(rawTitle);
    const textSlug = `${authorSlug}/${titleSlug}`;
    if (options?.author && authorSlug !== options.author) {
      return true;
    }
    if (options?.text && textSlug !== options.text) {
      return true;
    }
    return false;
  }

  /**
   * Loads source data required by Perseus XML ingestion.
   */
  private async loadSourceXmlFile(args: { xmlPath: string }): Promise<{
    $: cheerio.CheerioAPI;
    rawAuthor: string;
    rawTitle: string;
  }> {
    const { xmlPath } = args;
    return fs.readFile(xmlPath, "utf8").then((xmlContent) => {
      const $ = cheerio.load(xmlContent, { xml: true });
      const rawAuthor = $("titleStmt author").first().text().trim();
      const rawTitle = $("titleStmt title").first().text().trim();
      return { $, rawAuthor, rawTitle };
    });
  }

  /**
   * Processes one workflow step for Perseus XML ingestion.
   */
  private async processPerseusFile(args: {
    authorsMap: Map<string, Author>;
    dataPath: string;
    index: number;
    options?: { author?: string; text?: string };
    sourceDataDirectory: string;
    total: number;
    xmlPath: string;
  }): Promise<void> {
    const {
      authorsMap,
      dataPath,
      index,
      options,
      sourceDataDirectory,
      total,
      xmlPath,
    } = args;
    this.logger.info("📜 Starting processing", undefined, { xmlPath });
    try {
      await this.processSourceXmlFile({
        authorsMap,
        dataPath,
        sourceDataDirectory,
        xmlPath,
        ...(options ? { options } : {}),
      });
      this.logger.info("📜 Completed processing", undefined, {
        current: index + 1,
        percent: Number((((index + 1) / total) * 100).toFixed(2)),
        total,
        xmlPath,
      });
    } catch (error) {
      this.logger.warn("📜 Failed processing", undefined, {
        reason: String(error),
        xmlPath,
      });
    }
  }

  /**
   * Processes one workflow step for Perseus XML ingestion.
   */
  private async processSourceXmlFile(args: {
    authorsMap: Map<string, Author>;
    dataPath: string;
    options?: { author?: string; text?: string };
    sourceDataDirectory: string;
    xmlPath: string;
  }): Promise<void> {
    const { authorsMap, dataPath, options, sourceDataDirectory, xmlPath } =
      args;
    const { $, rawAuthor, rawTitle } = await this.loadSourceXmlFile({
      xmlPath,
    });
    if (!rawAuthor || !rawTitle) {
      this.logger.warn("🏷️ Missing metadata in file", undefined, { xmlPath });
      return;
    }
    if (this.isFilteredOut(rawAuthor, rawTitle, options)) {
      return;
    }
    const relativeSourcePath = path.relative(sourceDataDirectory, xmlPath);
    const authorSlug = _.kebabCase(rawAuthor);
    const titleSlug = _.kebabCase(rawTitle);
    const metadata = this.extractPerseusMetadata($, relativeSourcePath);
    const author = this.getOrCreatePerseusAuthor({
      authorSlug,
      authorsMap,
      rawAuthor,
      relativeSourcePath,
    });
    await this.writeSourceTextForAuthor({
      $,
      author,
      authorSlug,
      dataPath,
      metadata,
      rawTitle,
      relativeSourcePath,
      titleSlug,
    });
  }

  /**
   * Persists generated output for Perseus XML ingestion.
   */
  private async writeSourceMarkdownFiles(args: {
    $: cheerio.CheerioAPI;
    authorSlug: string;
    dataPath: string;
    metadata: Record<string, unknown>;
    rawTitle: string;
    relativeSourcePath: string;
    titleSlug: string;
  }): Promise<void> {
    const {
      $,
      authorSlug,
      dataPath,
      metadata,
      rawTitle,
      relativeSourcePath,
      titleSlug,
    } = args;
    const frontmatterObject: Record<string, unknown> = {
      author: authorSlug,
      type: "text",
    };
    const textMetadata = {
      ...metadata,
      source_url: `https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/${relativeSourcePath}`,
    };
    if (Object.keys(textMetadata).length > 0) {
      frontmatterObject["text_metadata"] = textMetadata;
    }
    const filesToWrite: PerseusMarkdownFile[] = [];
    this.perseusLibraryTextExtractionProvider.extractTextNodes({
      $,
      $element: $("body"),
      currentPath: [titleSlug],
      currentTitle: rawTitle,
      filesToWrite,
      rawTitle,
    });
    const authorDirectory = path.join(dataPath, authorSlug);
    await this.writeTextFiles(filesToWrite, authorDirectory, frontmatterObject);
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  /**
   * Persists generated output for Perseus XML ingestion.
   */
  private async writeSourceTextForAuthor(args: {
    $: cheerio.CheerioAPI;
    author: Author;
    authorSlug: string;
    dataPath: string;
    metadata: Record<string, unknown>;
    rawTitle: string;
    relativeSourcePath: string;
    titleSlug: string;
  }): Promise<void> {
    const {
      $,
      author,
      authorSlug,
      dataPath,
      metadata,
      rawTitle,
      relativeSourcePath,
      titleSlug,
    } = args;
    this.addPerseusTextEntity({
      author,
      metadata,
      rawTitle,
      relativeSourcePath,
      titleSlug,
    });
    await this.writeSourceMarkdownFiles({
      $,
      authorSlug,
      dataPath,
      metadata,
      rawTitle,
      relativeSourcePath,
      titleSlug,
    });
  }

  /**
   * Persists generated output for Perseus XML ingestion.
   */
  private async writeTextFiles(
    filesToWrite: PerseusMarkdownFile[],
    authorDirectory: string,
    frontmatterObject: Record<string, unknown>,
  ): Promise<void> {
    for (const file of filesToWrite) {
      const fm = { ...frontmatterObject, title: file.title };
      let markdown = `---\n${YAML.stringify(fm)}---\n\n`;
      markdown += `# ${file.title}\n\n`;
      markdown += `${file.content}\n`;
      const fullPath = path.join(authorDirectory, file.relativePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, markdown, "utf8");
    }
  }

  /**
   * Fetch authors, works, and output markdown files to the data directory.
   */
  async ingest(options?: {
    author?: string;
    text?: string;
  }): Promise<Author[]> {
    this.logger.info("🗂️ Ingesting Perseus from local data");
    const sourceDataDirectory = path.resolve("data", "perseus-source");
    const xmlPaths = await this.collectSourceXmlPaths(sourceDataDirectory);
    if (xmlPaths.length === 0) {
      return [];
    }
    const dataPath = path.resolve("data", "library", this.name);
    await fs.mkdir(dataPath, { recursive: true });
    const authorsMap = new Map<string, Author>();
    for (let index = 0; index < xmlPaths.length; index++) {
      const xmlPath = xmlPaths[index];
      if (!xmlPath) {
        continue;
      }
      await this.processPerseusFile({
        authorsMap,
        dataPath,
        index,
        sourceDataDirectory,
        total: xmlPaths.length,
        xmlPath,
        ...(options ? { options } : {}),
      });
    }
    return [...authorsMap.values()];
  }
}
