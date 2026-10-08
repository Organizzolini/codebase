import { Injectable } from "@nestjs/common";
import * as cheerio from "cheerio";
import { type AnyNode, isTag, isText } from "domhandler";
import _ from "lodash";
import YAML from "yaml";

import { Author, Text } from "@codebase/lexico-entities";

import { authorIdToName } from "../../literature/literature.constants";
import {
  cleanBoilerplate,
  formatLineNumber,
  isEnglishBoilerplate,
} from "../library.utilities";

/**
 * Normalizes Latin Library HTML into `Author`/`Text` entities and markdown-ready
 * structures used by the library ingestion pipeline.
 */
@Injectable()
export class LatinLibraryBuilder {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔏 Private Methods

  /**
   * Handles an internal workflow step for Latin Library document normalization.
   */
  private computeYear(
    yearString: string | undefined,
    eraString: string,
  ): number {
    const year = Number.parseInt(yearString ?? "0", 10);
    return eraString.toUpperCase().includes("B") ? -year : year;
  }

  /**
   * Extracts normalized content for Latin Library document normalization.
   */
  private extractAuthorDates(h2Text: string): Record<string, number> {
    const dateMatch =
      /(\d+)\s*(B\.?C\.?|A\.?D\.?)?\s*[-\u2013]\s*(?:c\.\s*)?(\d+)\s*(B\.?C\.?|A\.?D\.?)?/i.exec(
        h2Text,
      );
    if (!dateMatch) {
      return {};
    }
    const startEra =
      dateMatch[2] ||
      (dateMatch[4]?.toUpperCase().includes("B") ? "B.C." : "A.D.");
    const endEra = dateMatch[4] || "A.D.";
    return {
      birth_year: this.computeYear(dateMatch[1], startEra),
      death_year: this.computeYear(dateMatch[3], endEra),
    };
  }

  /**
   * Extracts normalized content for Latin Library document normalization.
   */
  private extractLinesFromParagraph(
    paragraphElement: AnyNode,
    $work: cheerio.CheerioAPI,
  ): string[] {
    const $paragraph = $work(paragraphElement);
    if (
      $paragraph.hasClass("pagehead") ||
      $paragraph.hasClass("internal_navigation") ||
      $paragraph.find("a").length > 3
    ) {
      return [];
    }
    const pText = cleanBoilerplate($paragraph.text().trim());
    if (pText.length === 0) {
      return [];
    }
    const paraHtml = $paragraph.html() ?? "";
    const paraText = this.parseParagraphHtml(paraHtml);
    return this.extractParagraphLines(paraText);
  }

  /**
   * Extracts normalized content for Latin Library document normalization.
   */
  private extractParagraphLines(paraText: string): string[] {
    const lines = paraText.split("\n");
    const result: string[] = [];
    let pendingNumber = "";
    for (let line of lines) {
      line = cleanBoilerplate(line);
      if (!line || isEnglishBoilerplate(line)) {
        continue;
      }
      const numberMatch = /^[[(*]*(\d+[a-zA-Z]*|[MDCLXVI]+)[\])*]*\.?$/.exec(
        line.trim(),
      );
      if (numberMatch && !line.includes(" ")) {
        pendingNumber = `**${numberMatch[1]}**`;
        continue;
      }
      if (pendingNumber) {
        line = `${pendingNumber} ${line.trim()}`;
        pendingNumber = "";
      }
      result.push(formatLineNumber(line));
    }
    return result;
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
   * Parses and normalizes inputs for Latin Library document normalization.
   */
  private parseParagraphHtml(paraHtml: string): string {
    const processedHtml = paraHtml.replaceAll(/<br\s*\/?>/gi, "\n");
    const $ = cheerio.load(processedHtml);
    let text = "";
    $("body")
      .contents()
      .each((_index, node) => {
        if (isText(node)) {
          text += $(node).text();
        } else if (isTag(node) && node.name === "b") {
          const boldText = $(node).text().trim();
          if (boldText) {
            text += `**${boldText}** `;
          }
        } else if (isTag(node)) {
          text += $(node).text();
        }
      });
    return text;
  }

  // 🔑 Public Methods

  /**
   * Converts one category-page link into an `Author` entity when the href is ingestible.
   */
  buildCategoryAuthor(
    anchorElement: AnyNode,
    $cat: cheerio.CheerioAPI,
  ): Author | null {
    const $a = $cat(anchorElement);
    const nickname = $a.text().replace(/\s/, " ").trim().toLowerCase();
    if (!nickname) {
      return null;
    }
    const slug = _.kebabCase(nickname);
    const name = authorIdToName[slug] || nickname;
    let href = $a.attr("href")?.trim() ?? "";
    const invalidPaths = ["index.html", "classics.html"];
    if (!href || invalidPaths.some((part) => href.includes(part))) {
      return null;
    }
    if (href.startsWith("/")) {
      href = href.slice(1);
    }
    return this.makeAuthor(name, slug, { nickname, sourceUrl: href });
  }

  /**
   * Extracts root-index author links and maps them into normalized `Author` entities.
   */
  buildRootAuthors(html: string): Author[] {
    const $ = cheerio.load(html);
    const authors: Author[] = [];
    $("p>table")
      .first()
      .find("a")
      .each((_index, a) => {
        const $a = $(a);
        const nickname = $a.text().replace(/\s/, " ").trim().toLowerCase();
        const slug = _.kebabCase(nickname);
        const name = authorIdToName[slug] || nickname;
        const href = $a.attr("href")?.trim() ?? "";
        if (!href || href.includes("index.html")) {
          return;
        }
        authors.push(
          this.makeAuthor(name, slug, { nickname, sourceUrl: href }),
        );
      });
    return authors;
  }

  /**
   * Builds a `Text` entity shell from a discovered work hyperlink.
   */
  buildTextEntityForLink(
    anchor: AnyNode,
    $: cheerio.CheerioAPI,
    absoluteUrl: string,
  ): Text {
    const rawTitle = $(anchor).text().trim().toLowerCase();
    const title = rawTitle ? _.startCase(rawTitle) : "";
    const textEntity = new Text();
    textEntity.type = "text";
    textEntity.title = title;
    textEntity.slug = _.kebabCase(title);
    textEntity.metadata = { sourceUrl: absoluteUrl };
    return textEntity;
  }

  /**
   * Produces YAML frontmatter fields for an ingested work markdown document.
   */
  buildWorkFrontmatter(
    work: Text,
    author: Author,
    workBook: string | undefined,
  ): Record<string, unknown> {
    const frontmatter: Record<string, unknown> = {
      author: author.slug,
      text_metadata: {
        source_url: this.getMetadataString(work.metadata, "sourceUrl") ?? "",
      },
      title: work.title,
      type: workBook ? "text" : "book",
    };
    if (author.metadata) {
      const authorMeta: Record<string, unknown> = { ...author.metadata };
      delete authorMeta["nickname"];
      delete authorMeta["sourceUrl"];
      frontmatter["author_metadata"] = authorMeta;
    }
    return frontmatter;
  }

  /**
   * Renders final markdown, including frontmatter, headings, and cleaned paragraphs.
   */
  buildWorkMarkdownContent(args: {
    $work: cheerio.CheerioAPI;
    author: Author;
    paragraphs: string[];
    work: Text;
    workBook: string | undefined;
  }): string {
    const { $work, author, paragraphs, work, workBook } = args;
    const frontmatter = this.buildWorkFrontmatter(work, author, workBook);
    let markdown = `---\n${YAML.stringify(frontmatter)}---\n\n`;
    if (workBook) {
      markdown += `# ${workBook}\n\n`;
    }
    markdown += `## ${work.title}\n\n`;
    markdown += `${paragraphs.join("\n\n")}\n`;
    if ($work("p").length < 2 && paragraphs.length < 2) {
      markdown +=
        "<!-- Scraper note: Very few <p> tags found, text might be structured differently -->\n\n";
    }
    return markdown;
  }

  /**
   * Derives author metadata (display name and approximate dates) from author-page headings.
   */
  extractAuthorPageMetadata(
    $: cheerio.CheerioAPI,
    authorName: string,
  ): Record<string, unknown> {
    const h1Text =
      $("h1.pagehead").text().trim() || $("h1").first().text().trim();
    const h2Text = $("h2.date").text().trim() || $("h2").first().text().trim();
    const metadata: Record<string, unknown> = {};
    if (
      h1Text &&
      h1Text.toLowerCase() !== authorName.toLowerCase() &&
      !h1Text.includes("Pagina amissa")
    ) {
      metadata["full_name"] = h1Text;
    }
    const dates = this.extractAuthorDates(h2Text);
    return { ...metadata, ...dates };
  }

  /**
   * Locates the nearest heading text used as the raw book/work grouping label.
   */
  findRawBookHeading(anchorElement: AnyNode, $: cheerio.CheerioAPI): string {
    const $anchor = $(anchorElement);
    let rawBook = $anchor
      .closest("div")
      .prev(":header")
      .text()
      .trim()
      .toLowerCase();
    if (!rawBook) {
      const parentTable = $anchor.closest("table");
      if (parentTable.length > 0) {
        const outerTable = parentTable.parents("table").last();
        const tableToCheck = outerTable.length > 0 ? outerTable : parentTable;
        let previous = tableToCheck.prev();
        while (previous.length > 0 && !previous.text().trim()) {
          previous = previous.prev();
        }
        if (previous.length > 0) {
          rawBook = previous.text().trim().toLowerCase();
        }
      }
    }
    return rawBook;
  }

  /**
   * Computes the canonical storage slug for a text, including optional book hierarchy.
   */
  getTextSlug(work: Text, author: Author): string {
    const workBook = this.getMetadataString(work.metadata, "book");
    const safeTitle = _.kebabCase(work.title);
    return workBook
      ? `${author.slug}/${_.kebabCase(workBook)}/${safeTitle}`
      : `${author.slug}/${safeTitle}`;
  }

  /**
   * Returns whether a link should be ignored because it is off-domain or self-referential.
   */
  isExternalOrSelfLink(absoluteUrl: string, authorUrlObject: URL): boolean {
    const parsedUrl = new URL(absoluteUrl);
    return (
      parsedUrl.hostname !== "www.thelatinlibrary.com" ||
      parsedUrl.pathname === authorUrlObject.pathname
    );
  }

  /**
   * Returns whether an href matches known navigation/category pages to skip.
   */
  isSkippedHref(href: string): boolean {
    const skippedPaths = [
      "index.html",
      "classics.html",
      "medieval.html",
      "neo.html",
      "christian.html",
      "misc.html",
      "ius.html",
    ];
    return skippedPaths.some((part) => href.includes(part));
  }

  /**
   * Returns whether an href points to an HTML-like text page eligible for parsing.
   */
  isTextFileHref(href: string): boolean {
    const lower = href.toLowerCase();
    return (
      lower.endsWith(".html") ||
      lower.endsWith(".htm") ||
      lower.endsWith(".shtml")
    );
  }

  /**
   * Creates an `Author` entity populated with normalized identity and metadata.
   */
  makeAuthor(
    name: string,
    slug: string,
    metadata: Record<string, unknown>,
  ): Author {
    const author = new Author();
    author.name = name;
    author.slug = slug;
    author.metadata = metadata;
    author.texts = [];
    return author;
  }

  /**
   * Extracts cleaned, line-normalized paragraph content from a work document.
   */
  parseWorkParagraphs($work: cheerio.CheerioAPI): string[] {
    let $containers = $work("p");
    if ($containers.length < 2) {
      $containers =
        $work("div.page").length > 0 ? $work("div.page") : $work("body");
    }
    const paragraphs: string[] = [];
    $containers.each((_index, paragraphElement) => {
      const lines = this.extractLinesFromParagraph(paragraphElement, $work);
      paragraphs.push(...lines);
    });
    return paragraphs;
  }
}
