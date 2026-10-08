import { capturePlaceholderValues } from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";

import { TEXT_VALIDATOR_DESCRIPTOR } from "./text.constants";

import type { LineComparison, MissingLine } from "./text.types";
import type {
  ConformetryDifference,
  ConformetryLanguageValidator,
  DocumentValidationResult,
  PreparedValidationDocument,
} from "@conformetry/core";

/**
 * Checks that a text file contains every line its template requires.
 *
 * Matching is duplicate-aware: a template line that appears twice must appear
 * twice in the instance. Order is not enforced, so a file may add lines
 * anywhere — the template is a lower bound, not an exact specification.
 */
@Injectable()
export class TextService implements ConformetryLanguageValidator {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  public readonly descriptor = TEXT_VALIDATOR_DESCRIPTOR;

  // 🔏 Private Methods

  /**
   * Captures what a template line's placeholder values stand for, taking the
   * first unclaimed instance line that fits it as a pattern and claiming it.
   */
  private captureLine(args: {
    line: string;
    remainingLines: Map<string, number>;
  }): Record<string, string> | undefined {
    for (const [instanceLine, remaining] of args.remainingLines) {
      const captures =
        remaining === 0
          ? undefined
          : capturePlaceholderValues({
              instanceText: instanceLine,
              templateText: args.line,
            });

      if (captures !== undefined) {
        args.remainingLines.set(instanceLine, remaining - 1);

        return captures;
      }
    }

    return undefined;
  }

  /** Counts how many times each line occurs, for duplicate-aware matching. */
  private countLines(text: string): Map<string, number> {
    const lineCounts = new Map<string, number>();

    for (const line of text.split("\n")) {
      lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
    }

    return lineCounts;
  }

  /** Finds template lines the instance does not supply often enough. */
  private findMissingLines(
    document: PreparedValidationDocument,
  ): LineComparison {
    const remainingLines = this.countLines(document.instance);
    const missingLines: MissingLine[] = [];
    let captures: Record<string, string> = {};

    for (const [index, line] of document.renderedTemplate
      .split("\n")
      .entries()) {
      const remaining = remainingLines.get(line) ?? 0;

      if (remaining > 0) {
        remainingLines.set(line, remaining - 1);
        continue;
      }

      const captured = this.captureLine({ line, remainingLines });

      if (captured === undefined) {
        missingLines.push({ line, templateLine: index + 1 });
      } else {
        // Earlier lines win, so the first capture in the file stays.
        captures = { ...captured, ...captures };
      }
    }

    return { captures, missingLines };
  }

  // 🌎 Public Methods

  /**
   * Reports every template line missing from the instance.
   *
   * Every template line is one requirement, blank ones included: this
   * validator matches them literally, so a blank line the instance does not
   * supply is a real miss and counting it keeps the denominator honest.
   */
  public validateDocument(
    document: PreparedValidationDocument,
  ): DocumentValidationResult {
    const { captures, missingLines } = this.findMissingLines(document);
    const differences: ConformetryDifference[] = missingLines.map(
      (missingLine) => {
        return {
          differenceType: "code",
          expected: missingLine.line,
          fix: `Add the line \`${missingLine.line}\` to the instance file.`,
          language: "text",
          message: `Missing line: ${missingLine.line}`,
          templateLine: missingLine.templateLine,
        };
      },
    );

    return {
      captures,
      differences,
      totalWeight: document.renderedTemplate.split("\n").length,
    };
  }
}
