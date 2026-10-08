import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { EMPTY_JSON_RESULT } from "./json.constants";

import type { JsoncState, JsonInput, JsonResult } from "./json.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/** Walks parsed JSON values to collect structural metrics. */
@Injectable()
/* v8 ignore stop */
export class JsonService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(JsonService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Consume a character that is not inside a comment or string. */
  private consumeCharacterOutsideComments(
    currentCharacter: string,
    nextCharacter: string,
    state: JsoncState,
  ): JsoncState {
    if (currentCharacter === '"') {
      return {
        ...state,
        isInString: true,
        sanitizedContent: `${state.sanitizedContent}${currentCharacter}`,
      };
    }

    if (currentCharacter === "/" && nextCharacter === "/") {
      return {
        ...state,
        isInLineComment: true,
        shouldAdvanceIndex: true,
      };
    }

    if (currentCharacter === "/" && nextCharacter === "*") {
      return {
        ...state,
        isInBlockComment: true,
        shouldAdvanceIndex: true,
      };
    }

    return {
      ...state,
      sanitizedContent: `${state.sanitizedContent}${currentCharacter}`,
    };
  }

  /** Consume one JSONC character and update the parser state. */
  private consumeJsoncCharacter(
    currentCharacter: string,
    nextCharacter: string,
    state: JsoncState,
  ): JsoncState {
    if (state.isInLineComment) {
      return this.handleLineCommentState(currentCharacter, state);
    }

    if (state.isInBlockComment) {
      return this.handleBlockCommentState(
        currentCharacter,
        nextCharacter,
        state,
      );
    }

    if (state.isInString) {
      return this.handleStringState(currentCharacter, nextCharacter, state);
    }

    return this.consumeCharacterOutsideComments(
      currentCharacter,
      nextCharacter,
      state,
    );
  }

  /** Count array nodes and their child values. */
  private countArrayNode(
    node: unknown[],
    stats: JsonResult,
    depth: number,
  ): void {
    stats.arrays++;
    stats.items += node.length;
    stats.totalNodes++;
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    for (const entry of node) {
      this.countNode(entry, stats, depth + 1);
    }
  }

  /** Recursively count JSON containers, primitives, and nesting depth. */
  private countNode(node: unknown, stats: JsonResult, depth: number): void {
    if (this.isArrayNode(node)) {
      this.countArrayNode(node, stats, depth);
      return;
    }

    if (this.isRecordNode(node)) {
      this.countRecordNode(node, stats, depth);
      return;
    }

    this.countPrimitiveNode(node, stats, depth);
  }

  /** Count scalar values and update primitive stats. */
  private countPrimitiveNode(
    node: unknown,
    stats: JsonResult,
    depth: number,
  ): void {
    stats.totalNodes++;
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    if (node === null) {
      stats.nulls++;
      return;
    }

    this.countPrimitiveValue(node, stats);
  }

  /** Increment stats for a scalar JSON value. */
  private countPrimitiveValue(node: unknown, stats: JsonResult): void {
    const primitiveType = typeof node;

    if (primitiveType === "boolean") {
      stats.booleans++;
      return;
    }

    if (primitiveType === "number") {
      stats.numbers++;
      return;
    }

    if (primitiveType === "string") {
      stats.strings++;
    }
  }

  /** Count object nodes and their child values. */
  private countRecordNode(
    node: Record<string, unknown>,
    stats: JsonResult,
    depth: number,
  ): void {
    stats.objects++;
    stats.totalNodes++;
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    const entries = Object.entries(node);
    stats.properties += entries.length;

    for (const [, value] of entries) {
      this.countNode(value, stats, depth + 1);
    }
  }

  /** Handle block comments while parsing JSONC content. */
  private handleBlockCommentState(
    currentCharacter: string,
    nextCharacter: string,
    state: JsoncState,
  ): JsoncState {
    if (currentCharacter === "*" && nextCharacter === "/") {
      return {
        ...state,
        isInBlockComment: false,
        shouldAdvanceIndex: true,
      };
    }

    return {
      ...state,
      isInBlockComment: true,
      shouldAdvanceIndex: false,
    };
  }

  /** Update the JSONC parser when it is inside a line comment. */
  private handleLineCommentState(
    currentCharacter: string,
    state: JsoncState,
  ): JsoncState {
    if (currentCharacter === "\n") {
      return {
        ...state,
        isInLineComment: false,
        sanitizedContent: `${state.sanitizedContent}${currentCharacter}`,
      };
    }

    return { ...state, isInLineComment: true };
  }

  /** Update the JSONC parser when it is inside a string literal. */
  private handleStringState(
    currentCharacter: string,
    nextCharacter: string,
    state: JsoncState,
  ): JsoncState {
    const nextSanitizedContent = `${state.sanitizedContent}${currentCharacter}`;

    if (currentCharacter === "\\") {
      return {
        ...state,
        isInString: true,
        sanitizedContent: `${nextSanitizedContent}${nextCharacter}`,
        shouldAdvanceIndex: true,
      };
    }

    if (currentCharacter === '"') {
      return {
        ...state,
        isInString: false,
        sanitizedContent: nextSanitizedContent,
      };
    }

    return {
      ...state,
      isInString: true,
      sanitizedContent: nextSanitizedContent,
    };
  }

  /** Return true when a value is a JSON array. */
  private isArrayNode(node: unknown): node is unknown[] {
    return Array.isArray(node);
  }

  /** Return true when a value is a JSON object. */
  private isRecordNode(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  /** Parse a file into one or more JSON documents depending on the extension. */
  private parseDocuments(content: string, extension: string): unknown[] {
    if (extension === ".jsonl") {
      return content
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "")
        .map((line): unknown => JSON.parse(line));
    }

    const sanitizedContent =
      extension === ".jsonc" ? this.stripJsoncComments(content) : content;

    return [JSON.parse(sanitizedContent) as unknown];
  }

  /** Remove comments from JSONC content while preserving string literals. */
  private stripJsoncComments(content: string): string {
    let sanitizedContent = "";
    let state: JsoncState = {
      isInBlockComment: false,
      isInLineComment: false,
      isInString: false,
      sanitizedContent: "",
      shouldAdvanceIndex: false,
    };

    for (let index = 0; index < content.length; index++) {
      const currentCharacter = content[index] ?? "";
      const nextCharacter = content[index + 1] ?? "";
      state = this.consumeJsoncCharacter(
        currentCharacter,
        nextCharacter,
        state,
      );
      sanitizedContent = state.sanitizedContent;

      if (state.shouldAdvanceIndex) {
        index++;
        state = {
          ...state,
          shouldAdvanceIndex: false,
        };
      }
    }

    return sanitizedContent;
  }

  // 🌎 Public Methods

  /** Analyze JSON files and return structural metrics for their contents. */
  analyze(input: JsonInput): JsonResult {
    const { jsonFiles, workingDirectory } = input;
    const stats: JsonResult = {
      ...EMPTY_JSON_RESULT,
      files: jsonFiles.length,
    };

    for (const filePath of jsonFiles) {
      const absolutePath = path.resolve(workingDirectory, filePath);
      const extension = path.extname(filePath).toLowerCase();

      try {
        const content = readFileSync(absolutePath, "utf8");
        stats.lines += content
          .split(/\r?\n/)
          .filter((line) => line.trim() !== "").length;
        const parsedDocuments = this.parseDocuments(content, extension);

        for (const parsedDocument of parsedDocuments) {
          this.countNode(parsedDocument, stats, 1);
        }
      } catch (error: unknown) {
        this.logger.warn("🧮 Skipped JSON analysis", undefined, {
          path: absolutePath,
          reason: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
    }

    return stats;
  }
}
