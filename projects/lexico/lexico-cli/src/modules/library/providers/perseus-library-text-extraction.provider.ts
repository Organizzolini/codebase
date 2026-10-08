import { Injectable } from "@nestjs/common";
import * as cheerio from "cheerio";
import _ from "lodash";

import { formatLineNumber, hasValidTextContent } from "../library.utilities";

import type { AnyNode } from "domhandler";

/**
 * Markdown file contents generated from one Perseus XML segment.
 */
export interface PerseusMarkdownFile {
  content: string;
  relativePath: string;
  title: string;
}

/**
 * Extracts and normalizes nested text parts from Perseus XML documents.
 */
@Injectable()
export class PerseusLibraryTextExtractionProvider {
  /**
   * Collects normalized paragraph text from Perseus XML elements.
   */
  private collectParagraphsFromElements(
    elements: cheerio.Cheerio<AnyNode>,
    $: cheerio.CheerioAPI,
  ): string[] {
    const paragraphs: string[] = [];

    elements.each((_index: number, paragraphElement: AnyNode) => {
      const $clone = $(paragraphElement).clone();
      $clone.find("note, app, rdg, lem, sic, orig, abbr").remove();

      let text = $clone.text().trim();
      if (!text) {
        return;
      }

      const nAttribute = $(paragraphElement).attr("n");
      if (nAttribute) {
        text = `**${nAttribute}** ${text}`;
      }

      text = formatLineNumber(text);
      text = text.replaceAll(/\s+/g, " ");
      paragraphs.push(text);
    });

    return paragraphs;
  }

  /**
   * Visits nested Perseus `textpart` children and extracts eligible sections.
   */
  private extractChildTextParts(args: {
    $: cheerio.CheerioAPI;
    children: cheerio.Cheerio<AnyNode>;
    currentPath: string[];
    filesToWrite: PerseusMarkdownFile[];
    rawTitle: string;
  }): void {
    const { $, children, currentPath, filesToWrite, rawTitle } = args;

    children.each((_index: number, child: AnyNode) => {
      const textPartDescriptor = this.getTextPartDescriptor($(child));
      if (!textPartDescriptor) {
        return;
      }

      this.extractTextNodes({
        $,
        $element: textPartDescriptor.element,
        currentPath: [...currentPath, textPartDescriptor.partName],
        currentTitle: textPartDescriptor.partTitle,
        filesToWrite,
        rawTitle,
      });
    });
  }

  /**
   * Returns the normalized descriptor for a child text part or nothing when skipped.
   */
  private getTextPartDescriptor(childElement: cheerio.Cheerio<AnyNode>):
    | undefined
    | {
        element: cheerio.Cheerio<AnyNode>;
        partName: string;
        partTitle: string;
      } {
    const subtype = childElement.attr("subtype") || "section";
    const n = childElement.attr("n") || "";

    if (this.shouldSkipTextPart(subtype, n)) {
      return undefined;
    }

    return {
      element: childElement,
      partName: _.kebabCase(n ? `${subtype} ${n}` : subtype),
      partTitle: n ? `${_.startCase(subtype)} ${n}` : _.startCase(subtype),
    };
  }

  /**
   * Handles leaf nodes that write one markdown text file.
   */
  private processLeafTextPart(args: {
    $: cheerio.CheerioAPI;
    $element: cheerio.Cheerio<AnyNode>;
    currentPath: string[];
    currentTitle: string;
    filesToWrite: PerseusMarkdownFile[];
    rawTitle: string;
  }): void {
    const { $, $element, currentPath, currentTitle, filesToWrite, rawTitle } =
      args;
    const paragraphs = this.collectParagraphsFromElements(
      $element.find("p, l"),
      $,
    );

    if (paragraphs.length === 0) {
      const $clone = $element.clone();
      $clone.find("note, app, rdg, lem, sic, orig, abbr").remove();

      let text = $clone.text().trim();
      if (text) {
        text = formatLineNumber(text).replaceAll(/\s+/g, " ");
        paragraphs.push(text);
      }
    }

    if (paragraphs.length === 0 || !hasValidTextContent(paragraphs)) {
      return;
    }

    const fileTitle = currentPath.length > 1 ? currentTitle : rawTitle;
    filesToWrite.push({
      content: paragraphs.join("\n\n"),
      relativePath: `${currentPath.join("/")}.md`,
      title: fileTitle,
    });
  }
  /**
   * Recurses into child text parts and writes direct child paragraphs.
   */
  private processTextPartChildren(args: {
    $: cheerio.CheerioAPI;
    $element: cheerio.Cheerio<AnyNode>;
    children: cheerio.Cheerio<AnyNode>;
    currentPath: string[];
    currentTitle: string;
    filesToWrite: PerseusMarkdownFile[];
    rawTitle: string;
  }): void {
    const { $, $element } = args;

    this.extractChildTextParts(args);

    const directParagraphs = this.collectParagraphsFromElements(
      $element.children("p, l"),
      $,
    );
    if (
      directParagraphs.length === 0 ||
      !hasValidTextContent(directParagraphs)
    ) {
      return;
    }

    const fileTitle =
      args.currentPath.length > 1 ? args.currentTitle : args.rawTitle;
    args.filesToWrite.push({
      content: directParagraphs.join("\n\n"),
      relativePath: [...args.currentPath, "index.md"].join("/"),
      title: fileTitle,
    });
  }

  /**
   * Returns whether a nested text part should be skipped.
   */
  private shouldSkipTextPart(subtype: string, n: string): boolean {
    const skipKeywords = [
      "front",
      "preface",
      "introduction",
      "cast",
      "subject",
      "index",
    ];

    return skipKeywords.some(
      (keyword) =>
        subtype.toLowerCase().includes(keyword) ||
        n.toLowerCase().includes(keyword),
    );
  }

  /**
   * Builds markdown file payloads from nested Perseus `textpart` elements.
   */
  public extractTextNodes(args: {
    $: cheerio.CheerioAPI;
    $element: cheerio.Cheerio<AnyNode>;
    currentPath: string[];
    currentTitle: string;
    filesToWrite: PerseusMarkdownFile[];
    rawTitle: string;
  }): void {
    const { $, $element, currentPath, currentTitle, filesToWrite, rawTitle } =
      args;
    const children = $element.children("div[type='textpart']");

    if (children.length > 0) {
      this.processTextPartChildren({
        $,
        $element,
        children,
        currentPath,
        currentTitle,
        filesToWrite,
        rawTitle,
      });
      return;
    }

    this.processLeafTextPart({
      $,
      $element,
      currentPath,
      currentTitle,
      filesToWrite,
      rawTitle,
    });
  }
}
