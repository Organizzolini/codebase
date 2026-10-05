import * as fs from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import * as cheerio from "cheerio";
import _ from "lodash";
import YAML from "yaml";

import { Author, Text } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { formatLineNumber, hasValidTextContent } from "../library.utilities";

/**
 * Provider for ingesting CSEL (Corpus Scriptorum Ecclesiasticorum Latinorum) texts.
 */
@Injectable()
export class CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider {
  constructor(private readonly logger: LoggerService) {}

  readonly name = "corpus-scriptorum-ecclesiasticorum-latinorum";

  /**
   * Builds structured data used during CSEL library text generation.
   */
  private buildCselTextContent(args: {
    authorSlug: string;
    metadata: Record<string, string>;
    paragraphs: string[];
    rawTitle: string;
    relativeSourcePath: string;
  }): null | string {
    const { authorSlug, metadata, paragraphs, rawTitle, relativeSourcePath } =
      args;
    if (!hasValidTextContent(paragraphs)) return null;
    const textMetadata = {
      ...metadata,
      source_url: `https://raw.githubusercontent.com/OpenGreekAndLatin/csel-dev/master/${relativeSourcePath}`,
    };
    const frontmatterObject: Record<string, unknown> = {
      author: authorSlug,
      title: rawTitle,
      type: "text",
    };
    if (Object.keys(textMetadata).length > 0) {
      frontmatterObject["text_metadata"] = textMetadata;
    }
    let markdown = `---\n${YAML.stringify(frontmatterObject)}---\n\n`;
    markdown += `# ${rawTitle}\n\n`;
    markdown += `${paragraphs.join("\n\n")}\n`;
    return markdown;
  }

  /**
   * Returns whether the current input should proceed in CSEL library text generation.
   */
  private checkTextFilter(
    options: undefined | { author?: string; text?: string },
    authorSlug: string,
    textSlug: string,
  ): boolean {
    if (options?.author && authorSlug !== options.author) return true;
    if (options?.text && textSlug !== options.text) return true;
    return false;
  }

  /**
   * Extracts normalized content for CSEL library text generation.
   */
  private async collectSourceXmlPaths(
    sourceDataDirectory: string,
  ): Promise<null | string[]> {
    try {
      const allFiles = await fs.readdir(sourceDataDirectory, {
        recursive: true,
        withFileTypes: true,
      });
      return allFiles
        .filter((file) => file.isFile() && file.name.endsWith(".xml"))
        .map((file) => path.join(file.parentPath, file.name));
    } catch {
      this.logger.error(
        `📁 Failed reading the source directory. Did you run the corpus-scriptorum-ecclesiasticorum-latinorum command first?`,
      );
      return null;
    }
  }

  /**
   * Builds structured data used during CSEL library text generation.
   */
  private createCselTextEntity(args: {
    metadata: Record<string, string>;
    rawTitle: string;
    relativeSourcePath: string;
    titleSlug: string;
  }): Text {
    const { metadata, rawTitle, relativeSourcePath, titleSlug } = args;
    const textEntity = new Text();
    textEntity.metadata = { ...metadata, sourceUrl: relativeSourcePath };
    textEntity.title = rawTitle;
    textEntity.slug = titleSlug;
    textEntity.type = "text";
    return textEntity;
  }

  /**
   * Extracts normalized content for CSEL library text generation.
   */
  private extractParagraphs($: cheerio.CheerioAPI): string[] {
    const paragraphs: string[] = [];
    $("body")
      .find("p, l, div[type='textpart']")
      .each((_index, element) => {
        const $element = $(element);
        if ($element[0]?.name === "div" && $element.find("p, l").length > 0) {
          return;
        }

        const $clone = $element.clone();
        $clone.find("note, app, rdg, lem").remove();

        let text = $clone.text().trim();
        if (!text) return;

        text = text.replaceAll(/\s+/g, " ");

        const nAttribute = $element.attr("n");
        if (nAttribute) {
          text = `**${nAttribute}** ${text}`;
        }

        text = formatLineNumber(text);
        paragraphs.push(text);
      });
    return paragraphs;
  }

  /**
   * Resolves derived values needed by CSEL library text generation.
   */
  private getMetadata($: cheerio.CheerioAPI): Record<string, string> {
    const metadata: Record<string, string> = {};
    const editors = $("titleStmt editor")
      .map((_index, element) => $(element).text().trim())
      .get();
    if (editors.length > 0) metadata["editors"] = editors.join(", ");

    const publisher =
      $("sourceDesc biblStruct publisher").first().text().trim() ||
      $("sourceDesc publisher").first().text().trim();
    if (publisher) metadata["publisher"] = publisher;

    const printDate =
      $("sourceDesc biblStruct date").first().text().trim() ||
      $("sourceDesc date").first().text().trim();
    if (printDate) metadata["print_publication_date"] = printDate;

    return metadata;
  }

  /**
   * Resolves derived values needed by CSEL library text generation.
   */
  private getOrCreateAuthor(args: {
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
   * Handles an internal workflow step for CSEL library text generation.
   */
  private logSourceProgress(args: {
    index: number;
    totalFiles: number;
    xmlPath: string;
  }): void {
    const { index, totalFiles, xmlPath } = args;
    this.logger.info("📜 Completed processing", undefined, {
      current: index + 1,
      percent: Number((((index + 1) / totalFiles) * 100).toFixed(2)),
      total: totalFiles,
      xmlPath,
    });
  }

  /**
   * Parses and normalizes inputs for CSEL library text generation.
   */
  private async parseSourceXmlFile(args: {
    options: undefined | { author?: string; text?: string };
    sourceDataDirectory: string;
    xmlPath: string;
  }): Promise<null | {
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
  }> {
    const { options, sourceDataDirectory, xmlPath } = args;
    const xmlContent = await fs.readFile(xmlPath, "utf8");
    const $ = cheerio.load(xmlContent, { xml: true });
    const resolved = this.resolveSourceXmlMetadata({
      $,
      options,
      sourceDataDirectory,
      xmlPath,
    });
    if (!resolved) {
      return null;
    }
    return { $, resolved };
  }

  /**
   * Processes one workflow step for CSEL library text generation.
   */
  private async processSourceXmlFile(args: {
    authorsMap: Map<string, Author>;
    dataPath: string;
    index: number;
    options: undefined | { author?: string; text?: string };
    sourceDataDirectory: string;
    totalFiles: number;
    xmlPath: string;
  }): Promise<void> {
    const {
      authorsMap,
      dataPath,
      index,
      options,
      sourceDataDirectory,
      totalFiles,
      xmlPath,
    } = args;
    this.logger.info("📜 Starting processing", undefined, { xmlPath });
    try {
      const parsedFile = await this.parseSourceXmlFile({
        options,
        sourceDataDirectory,
        xmlPath,
      });
      if (!parsedFile) {
        return;
      }
      const { $, resolved } = parsedFile;
      const { authorSlug, rawAuthor, relativeSourcePath } = resolved;
      const author = this.getOrCreateAuthor({
        authorSlug,
        authorsMap,
        rawAuthor,
        relativeSourcePath,
      });
      const appended = await this.writeSourceTextForAuthor({
        $,
        author,
        dataPath,
        resolved,
      });
      if (!appended) {
        this.logger.warn("📜 Skipping empty or invalid text", undefined, {
          textSlug: resolved.textSlug,
        });
        return;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      this.logSourceProgress({ index, totalFiles, xmlPath });
    } catch (error) {
      this.logger.warn("📜 Failed processing", undefined, {
        reason: String(error),
        xmlPath,
      });
    }
  }

  /**
   * Resolves derived values needed by CSEL library text generation.
   */
  private resolveSourceXmlMetadata(args: {
    $: cheerio.CheerioAPI;
    options: undefined | { author?: string; text?: string };
    sourceDataDirectory: string;
    xmlPath: string;
  }): null | {
    authorSlug: string;
    metadata: Record<string, string>;
    rawAuthor: string;
    rawTitle: string;
    relativeSourcePath: string;
    textSlug: string;
    titleSlug: string;
  } {
    const { $, options, sourceDataDirectory, xmlPath } = args;
    const rawAuthor =
      $("titleStmt author").first().text().trim() || "Unknown Author";
    const rawTitle =
      $("titleStmt title").first().text().trim() || "Unknown Title";
    if (!rawAuthor || !rawTitle) return null;
    const metadata = this.getMetadata($);
    const authorSlug = _.kebabCase(rawAuthor);
    const titleSlug = _.kebabCase(rawTitle);
    const textSlug = `${authorSlug}/${titleSlug}`;
    if (this.checkTextFilter(options, authorSlug, textSlug)) return null;
    const relativeSourcePath = path.relative(sourceDataDirectory, xmlPath);
    return {
      authorSlug,
      metadata,
      rawAuthor,
      rawTitle,
      relativeSourcePath,
      textSlug,
      titleSlug,
    };
  }

  /**
   * Persists generated output for CSEL library text generation.
   */
  private async writeSourceTextForAuthor(args: {
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
  }): Promise<boolean> {
    const { $, author, dataPath, resolved } = args;
    const { authorSlug, metadata, rawTitle, relativeSourcePath, titleSlug } =
      resolved;
    const textEntity = this.createCselTextEntity({
      metadata,
      rawTitle,
      relativeSourcePath,
      titleSlug,
    });
    author.texts.push(textEntity);
    const paragraphs = this.extractParagraphs($);
    const markdown = this.buildCselTextContent({
      authorSlug,
      metadata,
      paragraphs,
      rawTitle,
      relativeSourcePath,
    });
    if (!markdown) return false;
    const authorDirectory = path.join(dataPath, authorSlug);
    await fs.mkdir(authorDirectory, { recursive: true });
    await fs.writeFile(
      path.join(authorDirectory, `${titleSlug}.md`),
      markdown,
      "utf8",
    );
    return true;
  }

  /**
   * Fetch authors, works, and output markdown files to the data directory.
   */
  async ingest(options?: {
    author?: string;
    text?: string;
  }): Promise<Author[]> {
    this.logger.info("🗂️ Ingesting CSEL from local data");

    const sourceDataDirectory = path.resolve(
      "data",
      "corpus-scriptorum-ecclesiasticorum-latinorum-source",
    );

    const xmlPaths = await this.collectSourceXmlPaths(sourceDataDirectory);
    if (!xmlPaths) return [];

    this.logger.info(
      "🗂️ Found Latin XML files in local CSEL cache",
      undefined,
      {
        count: xmlPaths.length,
      },
    );

    const dataPath = path.resolve("data", "library", this.name);
    await fs.mkdir(dataPath, { recursive: true });

    const authorsMap = new Map<string, Author>();

    for (let index = 0; index < xmlPaths.length; index++) {
      const xmlPath = xmlPaths[index];
      if (!xmlPath) continue;

      await this.processSourceXmlFile({
        authorsMap,
        dataPath,
        index,
        options,
        sourceDataDirectory,
        totalFiles: xmlPaths.length,
        xmlPath,
      });
    }

    return [...authorsMap.values()];
  }
}
