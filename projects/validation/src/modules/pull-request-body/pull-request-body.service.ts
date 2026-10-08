import { readFileSync } from "node:fs";

import { Injectable } from "@nestjs/common";

import {
  REQUIRED_HEADINGS,
  TEMPLATE_COMMENT_PATTERN,
  TEMPLATE_COMMENT_PREFIX_LENGTH,
} from "./pull-request-body.constants";

import type { BodyVerdict } from "./pull-request-body.types";

/**
 * Checks a pull request description against the template it started as.
 *
 * Two questions, kept apart because their sources are: the four headings are
 * the convention and are named in this module's constants, while the prompts
 * are whatever the template currently holds and are read from it at runtime. A
 * prompt added to the template tomorrow is therefore checked with no change
 * here — which the previous inline shell, with its hard-coded prefixes, could
 * not manage.
 */
@Injectable()
export class PullRequestBodyService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

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

  // 🌎 Public Methods

  /** The three lists of failures, from one description and the template's prompts. */
  public checkBody(options: {
    readonly body: string;
    readonly templateComments: readonly string[];
  }): BodyVerdict {
    return {
      emptySections: this.findEmptySections(options.body),
      missingHeadings: this.findMissingHeadings(options.body),
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
    const lines = body.split("\n");
    const sectionContents = new Map<string, string[]>();
    let currentHeading: string | undefined;

    for (const rawLine of lines) {
      const trimmedLine = rawLine.trimEnd();

      if (
        REQUIRED_HEADINGS.includes(trimmedLine) ||
        /^#{1,2}\s+/u.test(trimmedLine)
      ) {
        if (REQUIRED_HEADINGS.includes(trimmedLine)) {
          currentHeading = trimmedLine;
          sectionContents.set(currentHeading, []);
        } else {
          currentHeading = undefined;
        }
      } else if (currentHeading !== undefined) {
        sectionContents.get(currentHeading)?.push(rawLine);
      }
    }

    return REQUIRED_HEADINGS.filter((heading) => {
      const contentLines = sectionContents.get(heading);

      if (contentLines === undefined) {
        return false;
      }

      const content = contentLines.join("\n");

      return this.cleanSectionContent(content) === "";
    });
  }

  /** Every required heading the description does not carry. */
  public findMissingHeadings(body: string): string[] {
    const lines = new Set(body.split("\n").map((line) => line.trimEnd()));

    return REQUIRED_HEADINGS.filter((heading) => !lines.has(heading));
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
