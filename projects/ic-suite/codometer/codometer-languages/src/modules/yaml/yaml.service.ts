import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import {
  isAlias,
  isMap,
  isPair,
  isScalar,
  isSeq,
  parseAllDocuments,
} from "yaml";

import { LoggerService } from "@codebase/logging";

import { EMPTY_YAML_RESULT } from "./yaml.constants";

import type { YamlInput, YamlResult } from "./yaml.types";
import type { Document, Node } from "yaml";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Walks parsed YAML documents to collect structural metrics.
 *
 * Counted from the parse tree rather than from the text, so a `#` inside a
 * quoted scalar stays a character in a string and an indented block reports
 * its real nesting instead of a column number. The `yaml` package keeps
 * comments and anchors on the nodes, which is what makes both countable at all.
 */
@Injectable()
/* v8 ignore stop */
export class YamlService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(YamlService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Walks a mapping's pairs or a sequence's items. */
  private countCollection(
    node: unknown,
    result: YamlResult,
    depth: number,
  ): void {
    if (isMap(node)) {
      result.mappings++;

      for (const item of node.items) {
        if (isPair(item)) {
          result.keys++;
          this.countNode(item.key, result, depth + 1);
          this.countNode(item.value, result, depth + 1);
        }
      }

      return;
    }

    if (isSeq(node)) {
      result.sequences++;

      for (const item of node.items) {
        this.countNode(item, result, depth + 1);
      }
    }
  }

  /** Records the comments attached to one node or document. */
  private countComments(node: Document | Node, result: YamlResult): void {
    if (typeof node.comment === "string") {
      result.comments++;
    }

    if (typeof node.commentBefore === "string") {
      // A run of `#` lines above a node arrives as one string with newlines,
      // and each of those lines is a comment somebody wrote.
      result.comments += node.commentBefore.split("\n").length;
    }
  }

  /** Records one document and everything under it. */
  private countDocument(document: Document, result: YamlResult): void {
    result.documents++;
    this.countComments(document, result);
    this.countNode(document.contents, result, 1);
  }

  /** Records one node against the running totals, then walks its children. */
  private countNode(node: unknown, result: YamlResult, depth: number): void {
    if (!isMap(node) && !isSeq(node) && !isScalar(node) && !isAlias(node)) {
      return;
    }

    result.maxDepth = Math.max(result.maxDepth, depth);
    this.countComments(node, result);

    if (typeof node.anchor === "string") {
      result.anchors++;
    }

    if (isAlias(node)) {
      result.aliases++;
      return;
    }

    if (isScalar(node)) {
      result.scalars++;
      return;
    }

    this.countCollection(node, result, depth);
  }

  // 🌎 Public Methods

  /** Analyze the given YAML files, resolved against the directory. */
  analyze({ workingDirectory, yamlFiles }: YamlInput): YamlResult {
    const result: YamlResult = { ...EMPTY_YAML_RESULT };

    for (const filePath of yamlFiles) {
      try {
        const content = readFileSync(
          path.resolve(workingDirectory, filePath),
          "utf8",
        );

        result.files++;
        result.lines += content.split("\n").length;

        for (const document of parseAllDocuments(content)) {
          this.countDocument(document, result);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn("🧾 Skipped YAML analysis", undefined, {
          filePath,
          reason: message,
        });
        continue;
      }
    }

    return result;
  }
}
