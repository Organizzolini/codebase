import { readFileSync } from "node:fs";

import { Injectable } from "@nestjs/common";
import { remark } from "remark";

import {
  REQUIRED_HEADINGS,
  SECTION_RULES,
  SECTION_SHAPE_DESCRIPTIONS,
  TEMPLATE_COMMENT_PATTERN,
  TEMPLATE_COMMENT_PREFIX_LENGTH,
} from "./pull-request-body.constants";

import type { BodyVerdict, SectionShape } from "./pull-request-body.types";
import type { List, Node, RootContent } from "mdast";

/**
 * Checks a pull request description against the template it started as.
 *
 * Two sources, kept apart: the four sections — their headings, shapes, and word
 * limits — are the convention and are named in this module's constants, while
 * the prompts are whatever the template currently holds and are read from it at
 * runtime. A prompt added to the template tomorrow is therefore checked with no
 * change here — which the previous inline shell, with its hard-coded prefixes,
 * could not manage.
 */
@Injectable()
export class PullRequestBodyService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The marker of every bulleted item in some lists, nested lists included.
   *
   * Ordered lists are walked through but contribute no marker of their own.
   * Walked with a work list rather than by recursion, which would add a frame
   * per level of nesting to every stack through here.
   */
  private bulletMarkersOf(lists: readonly List[], content: string): string[] {
    const markers: string[] = [];
    const pendingLists = [...lists];

    for (
      let list = pendingLists.pop();
      list !== undefined;
      list = pendingLists.pop()
    ) {
      for (const item of list.children) {
        if (list.ordered !== true) {
          markers.push(this.sourceOf(item, content).charAt(0));
        }

        for (const child of item.children) {
          if (child.type === "list") {
            pendingLists.push(child);
          }
        }
      }
    }

    return markers;
  }

  /**
   * Cleans section text by removing HTML comments and empty markdown list markers.
   */
  private cleanSectionContent(content: string): string {
    const withoutComments = content.replaceAll(TEMPLATE_COMMENT_PATTERN, "");

    return withoutComments
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => !/^([-*+]|\d+[.)])(\s*\[[ xX]?\])?\s*$/u.test(line))
      .join("\n")
      .trim();
  }

  /** Whitespace-separated tokens once comments are removed, as `wc -w` counts. */
  private countWords(content: string): number {
    return content
      .replaceAll(TEMPLATE_COMMENT_PATTERN, " ")
      .split(/\s+/u)
      .filter((word) => word !== "").length;
  }

  /**
   * Whether a section's blocks have the shape its rule allows.
   *
   * Only a leading dash list is open-ended: Related may close with anything
   * after its links, such as an agent's attribution line. A bulleted list
   * takes any marker but one throughout, as markdownlint's MD004 does.
   */
  private holdsShape(options: {
    readonly blocks: readonly RootContent[];
    readonly content: string;
    readonly shape: SectionShape;
  }): boolean {
    const { blocks, content, shape } = options;

    if (shape === "paragraph") {
      return blocks.length === 1 && blocks[0]?.type === "paragraph";
    }

    if (shape === "leading-dash-list") {
      return this.isDashList(blocks[0], content);
    }

    const lists = blocks.filter(
      (block): block is List =>
        block.type === "list" &&
        (block.ordered ?? false) === (shape === "ordered-list"),
    );

    if (lists.length !== blocks.length) {
      return false;
    }

    return (
      shape !== "bullet-list" ||
      new Set(this.bulletMarkersOf(lists, content)).size <= 1
    );
  }

  /** Whether a list block is unordered with every item marked by `-`. */
  private isDashList(block: RootContent | undefined, content: string): boolean {
    return (
      block?.type === "list" &&
      block.ordered !== true &&
      block.children.every((item) =>
        this.sourceOf(item, content).startsWith("-"),
      )
    );
  }

  /**
   * A section's top-level markdown blocks, less the ones no rule should judge.
   *
   * A block that is nothing but comments is dropped, being the unfilled-prompt
   * check's business.
   */
  private parseBlocks(content: string): RootContent[] {
    return remark()
      .parse(content)
      .children.filter(
        (block) =>
          block.type !== "html" ||
          block.value.replaceAll(TEMPLATE_COMMENT_PATTERN, "").trim() !== "",
      );
  }

  /**
   * The leading run of a prompt that a description has to still carry.
   *
   * Newlines are collapsed so a prompt wrapped across lines in the template is
   * compared as the one line a description carries it as.
   */
  private prefixOf(templateComment: string): string {
    return templateComment
      .replaceAll(/\s+/gu, " ")
      .slice(0, TEMPLATE_COMMENT_PREFIX_LENGTH);
  }

  /** The markdown a parsed node was read from, exactly as written. */
  private sourceOf(node: Node, content: string): string {
    return content.slice(
      node.position?.start.offset,
      node.position?.end.offset,
    );
  }

  /** The raw text under each required heading the description carries. */
  private splitSections(body: string): Map<string, string> {
    const sectionLines = new Map<string, string[]>();
    let currentLines: string[] | undefined;

    for (const rawLine of body.split("\n")) {
      const trimmedLine = rawLine.trimEnd();

      if (REQUIRED_HEADINGS.includes(trimmedLine)) {
        currentLines = [];
        sectionLines.set(trimmedLine, currentLines);
      } else if (/^#{1,2}\s+/u.test(trimmedLine)) {
        currentLines = undefined;
      } else {
        currentLines?.push(rawLine);
      }
    }

    return new Map(
      [...sectionLines].map(([heading, lines]) => [heading, lines.join("\n")]),
    );
  }

  // 🌎 Public Methods

  /** The five lists of failures, from one description and the template's prompts. */
  public checkBody(options: {
    readonly body: string;
    readonly templateComments: readonly string[];
  }): BodyVerdict {
    return {
      emptySections: this.findEmptySections(options.body),
      malformedSections: this.findMalformedSections(options.body),
      missingHeadings: this.findMissingHeadings(options.body),
      oversizedSections: this.findOversizedSections(options.body),
      unfilledComments: this.findUnfilledComments(options),
    };
  }

  /** Reads the prompts the template currently holds. */
  public extractTemplateComments(templatePath: string): string[] {
    return [
      ...readFileSync(templatePath, "utf8").matchAll(TEMPLATE_COMMENT_PATTERN),
    ].map((match) => match[0]);
  }

  /** Every required heading whose section does not carry content. */
  public findEmptySections(body: string): string[] {
    const sections = this.splitSections(body);

    return REQUIRED_HEADINGS.filter((heading) => {
      const content = sections.get(heading);

      return content !== undefined && this.cleanSectionContent(content) === "";
    });
  }

  /**
   * Every section holding a block its shape does not allow.
   *
   * A missing or empty section is left to the checks that name those, so one
   * mistake is never reported twice.
   */
  public findMalformedSections(body: string): string[] {
    const sections = this.splitSections(body);

    return SECTION_RULES.filter((rule) => {
      const content = sections.get(rule.heading);

      return (
        content !== undefined &&
        this.cleanSectionContent(content) !== "" &&
        !this.holdsShape({
          blocks: this.parseBlocks(content),
          content,
          shape: rule.shape,
        })
      );
    }).map(
      (rule) =>
        `${rule.heading.replace("## ", "")} must hold ${SECTION_SHAPE_DESCRIPTIONS[rule.shape]}`,
    );
  }

  /** Every required heading the description does not carry. */
  public findMissingHeadings(body: string): string[] {
    const lines = new Set(body.split("\n").map((line) => line.trimEnd()));

    return REQUIRED_HEADINGS.filter((heading) => !lines.has(heading));
  }

  /** Every capped section that runs past its word limit, with its count. */
  public findOversizedSections(body: string): string[] {
    const sections = this.splitSections(body);

    return SECTION_RULES.flatMap((rule) => {
      const content = sections.get(rule.heading);

      if (content === undefined || rule.maximumWords === undefined) {
        return [];
      }

      const wordCount = this.countWords(content);

      return wordCount > rule.maximumWords
        ? [
            `${rule.heading.replace("## ", "")} has ${String(wordCount)} words, over its limit of ${String(rule.maximumWords)}`,
          ]
        : [];
    });
  }

  /** Every template prompt the description still carries. */
  public findUnfilledComments(options: {
    readonly body: string;
    readonly templateComments: readonly string[];
  }): string[] {
    const collapsedBody = options.body.replaceAll(/\s+/gu, " ");

    return options.templateComments.filter((templateComment) =>
      collapsedBody.includes(this.prefixOf(templateComment)),
    );
  }
}
