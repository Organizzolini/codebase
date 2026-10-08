import { Injectable } from "@nestjs/common";

import {
  FROM_IMPORT_STATEMENT_PATTERN,
  IMPORT_SPECIFIER_MODULE_PATTERN,
  IMPORT_START_PATTERN,
  IMPORT_STATEMENT_PATTERN,
} from "./python-import-parser.constants";

import type { PythonImportSpecifier } from "./python-import-parser.types";

/**
 * Parses a Python source file's top-level `import`/`from ... import`
 * statements into the module each one names.
 *
 * There is no `ast`-equivalent compiler API available from Node the way
 * `ts.isImportDeclaration` walks a real `ts.Program`, so statements are
 * recognized with a small hand-rolled scanner instead: comments and quoted
 * strings are stripped so a `#` or a quote character inside either never
 * confuses the parser, a statement's continuation lines are rejoined by
 * tracking parenthesis depth and trailing backslashes, and only statements
 * starting at column zero are considered — an import nested inside a
 * function or a conditional is deliberately not walked, the same way a
 * TypeScript `import` declaration can only ever appear at module scope.
 */
@Injectable()
export class PythonImportParserService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Rejoins a statement's continuation lines starting at `startIndex` into
   * one line, tracking parenthesis depth and trailing backslashes.
   */
  private collectStatement(
    lines: string[],
    startIndex: number,
  ): { nextIndex: number; statement: string } {
    let depth = 0;
    const parts: string[] = [];
    let index = startIndex;

    for (;;) {
      /* v8 ignore next -- index only ever advances past the last checked
         bound right before the loop breaks, so it is always in range here */
      const line = this.stripComment(lines[index] ?? "");

      depth += this.countCharacter(line, "(") - this.countCharacter(line, ")");

      const continuesWithBackslash = line.trimEnd().endsWith("\\");
      const linePart = continuesWithBackslash
        ? line.trimEnd().slice(0, -1)
        : line;

      parts.push(linePart.trim());
      index += 1;

      if ((depth <= 0 && !continuesWithBackslash) || index >= lines.length) {
        break;
      }
    }

    return { nextIndex: index, statement: parts.join(" ") };
  }

  /** Counts how many times a single character appears in a line. */
  private countCharacter(text: string, character: string): number {
    return text.split(character).length - 1;
  }

  /** Whether a raw line starts a module-level `import`/`from` statement. */
  private isTopLevelImportStart(rawLine: string): boolean {
    if (this.measureIndent(rawLine) !== 0) return false;

    return IMPORT_START_PATTERN.test(this.stripComment(rawLine).trim());
  }

  /** Counts a raw line's leading whitespace. */
  private measureIndent(rawLine: string): number {
    return rawLine.length - rawLine.trimStart().length;
  }

  /** Parses a joined `from <dots><module> import ...` statement. */
  private parseFromStatement(statement: string): PythonImportSpecifier[] {
    const match = FROM_IMPORT_STATEMENT_PATTERN.exec(statement);

    if (match?.groups === undefined) return [];

    /* v8 ignore next 2 -- both named groups always participate in a
       successful match, even as an empty string, so they are never undefined */
    const dots = match.groups["dots"] ?? "";
    const modulePath = match.groups["modulePath"] ?? "";

    return [{ level: dots.length, modulePath }];
  }

  /** Parses a joined `import <specifiers>` statement. */
  private parseImportStatement(statement: string): PythonImportSpecifier[] {
    const match = IMPORT_STATEMENT_PATTERN.exec(statement);

    if (match?.groups === undefined) return [];

    /* v8 ignore next -- the group always participates in a successful match */
    const specifiers = match.groups["specifiers"] ?? "";

    return specifiers
      .split(",")
      .map(
        (specifier) =>
          IMPORT_SPECIFIER_MODULE_PATTERN.exec(specifier.trim())?.groups?.[
            "modulePath"
          ],
      )
      .filter((modulePath): modulePath is string => modulePath !== undefined)
      .map((modulePath) => ({ level: 0, modulePath }));
  }

  /** Parses one joined statement into the module(s) it names. */
  private parseStatement(statement: string): PythonImportSpecifier[] {
    return statement.startsWith("from")
      ? this.parseFromStatement(statement)
      : this.parseImportStatement(statement);
  }

  /** Strips a trailing `#` comment, ignoring one found inside a quoted string. */
  private stripComment(line: string): string {
    let quote: string | undefined;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];

      if (quote !== undefined) {
        if (character === quote && line[index - 1] !== "\\") quote = undefined;
        continue;
      }

      if (character === "'" || character === '"') {
        quote = character;
        continue;
      }

      if (character === "#") return line.slice(0, index);
    }

    return line;
  }

  // 🌎 Public Methods

  /** Parses every module-level import statement in a Python source file. */
  parseImportSpecifiers(source: string): PythonImportSpecifier[] {
    const lines = source.split("\n");
    const specifiers: PythonImportSpecifier[] = [];
    let index = 0;

    while (index < lines.length) {
      /* v8 ignore next -- the loop condition already guards index in range */
      const rawLine = lines[index] ?? "";

      if (!this.isTopLevelImportStart(rawLine)) {
        index += 1;
        continue;
      }

      const { nextIndex, statement } = this.collectStatement(lines, index);

      specifiers.push(...this.parseStatement(statement));
      index = nextIndex;
    }

    return specifiers;
  }
}
