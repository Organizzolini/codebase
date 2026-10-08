// cspell:ignore atrule — postcss spells its at-rule node type without a hyphen.
import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import postcss from "postcss";

import { LoggerService } from "@codebase/logging";

import { CSS_MEDIA_AT_RULE, EMPTY_CSS_RESULT } from "./css.constants";

import type { CssInput, CssResult } from "./css.types";
import type { ChildNode } from "postcss";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Walks parsed stylesheets to collect structural metrics.
 *
 * Parsed with postcss, which the repository's stylelint already reads CSS
 * through, so a selector split across lines counts once and a declaration
 * inside a comment counts not at all.
 */
@Injectable()
/* v8 ignore stop */
export class CssService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(CssService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Records one node against the running totals. */
  private countNode(node: ChildNode, result: CssResult): void {
    if (node.type === "comment") {
      result.comments++;
      return;
    }

    if (node.type === "decl") {
      result.declarations++;

      if (node.prop.startsWith("--")) {
        result.customProperties++;
      }

      return;
    }

    if (node.type === "atrule") {
      result.atRules++;

      if (node.name === CSS_MEDIA_AT_RULE) {
        result.mediaQueries++;
      }

      return;
    }

    result.rules++;
    // A rule's selector list is one rule with several selectors, and both
    // numbers say something different about a stylesheet.
    result.selectors += node.selectors.length;
  }

  // 🌎 Public Methods

  /** Analyze the given stylesheets, resolved against the directory. */
  analyze({ cssFiles, workingDirectory }: CssInput): CssResult {
    const result: CssResult = { ...EMPTY_CSS_RESULT };

    for (const filePath of cssFiles) {
      try {
        const content = readFileSync(
          path.resolve(workingDirectory, filePath),
          "utf8",
        );
        const root = postcss.parse(content);

        result.files++;
        result.lines += content.split("\n").length;

        root.walk((node) => {
          this.countNode(node, result);
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn("🎨 Skipped CSS analysis", undefined, {
          filePath,
          reason: message,
        });
        continue;
      }
    }

    return result;
  }
}
