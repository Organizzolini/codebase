import { Injectable } from "@nestjs/common";
import {
  createSourceFile,
  ScriptKind,
  ScriptTarget,
  type SourceFile,
} from "typescript";

import { TypescriptCommentsService } from "./typescript-comments.service";
import { TypescriptTreeService } from "./typescript-tree.service";
import { TYPESCRIPT_VALIDATOR_DESCRIPTOR } from "./typescript.constants";

import type {
  ConformetryDifference,
  ConformetryLanguageValidator,
  DocumentValidationResult,
  PreparedValidationDocument,
} from "@conformetry/core";

/**
 * Checks that a TypeScript file declares everything its template requires.
 *
 * Two independent checks run over the same parse: the syntax tree, which
 * verifies imports, decorators, classes, and members exist; and the comments,
 * which verify the section markers appear in the prescribed order.
 */
@Injectable()
export class TypescriptService implements ConformetryLanguageValidator {
  // 🏗 Dependency Injection

  constructor(
    private readonly typeScriptCommentsService: TypescriptCommentsService,
    private readonly typeScriptTreeService: TypescriptTreeService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  public readonly descriptor = TYPESCRIPT_VALIDATOR_DESCRIPTOR;

  // 🔏 Private Methods

  /** Parses source text, choosing the dialect from the filename. */
  private parseSourceFile(args: {
    content: string;
    filename: string;
  }): SourceFile {
    return createSourceFile(
      args.filename,
      args.content,
      ScriptTarget.Latest,
      true,
      args.filename.endsWith(".tsx") ? ScriptKind.TSX : ScriptKind.TS,
    );
  }

  /** Converts a source offset into a 1-based line and column. */
  private readLocation(args: {
    position: number | undefined;
    sourceFile: SourceFile;
  }): undefined | { column: number; line: number } {
    if (args.position === undefined || args.position < 0) {
      return undefined;
    }

    const { character, line } = args.sourceFile.getLineAndCharacterOfPosition(
      args.position,
    );

    return { column: character + 1, line: line + 1 };
  }

  /** Compares the comments and describes each missing section marker. */
  private validateComments(args: {
    instanceSourceFile: SourceFile;
    templateSourceFile: SourceFile;
  }): DocumentValidationResult {
    const comparison = this.typeScriptCommentsService.compareComments(args);
    const differences: ConformetryDifference[] = comparison.missingComments.map(
      (comment) => {
        const templateLocation = this.readLocation({
          position: comment.position,
          sourceFile: args.templateSourceFile,
        });

        return {
          differenceType: "comment",
          expected: comment.text,
          fix: `Add the comment ${comment.text} to the instance file, in the order the template declares it.`,
          language: "typescript",
          message: `Missing comment ${comment.text}`,
          ...(templateLocation === undefined
            ? {}
            : {
                templateColumn: templateLocation.column,
                templateLine: templateLocation.line,
              }),
        };
      },
    );

    return { differences, totalWeight: comparison.totalWeight };
  }

  /** Compares the syntax trees and describes each missing declaration. */
  private validateStructure(args: {
    instanceSourceFile: SourceFile;
    templateSourceFile: SourceFile;
  }): DocumentValidationResult {
    const comparison = this.typeScriptTreeService.compareTree({
      instanceNode: args.instanceSourceFile,
      templateNode: args.templateSourceFile,
    });
    const differences: ConformetryDifference[] = comparison.differences.map(
      (error) => {
        const described =
          error.nodeKey === undefined
            ? error.kindLabel
            : `${error.kindLabel} "${error.nodeKey}"`;
        const instanceLocation = this.readLocation({
          position: error.instancePosition,
          sourceFile: args.instanceSourceFile,
        });
        const templateLocation = this.readLocation({
          position: error.templatePosition,
          sourceFile: args.templateSourceFile,
        });

        return {
          differenceType: "code",
          fix: `Add the missing ${described} to the instance file. See the template for the expected structure.`,
          ...(instanceLocation === undefined
            ? {}
            : {
                instanceColumn: instanceLocation.column,
                instanceLine: instanceLocation.line,
              }),
          language: "typescript",
          message: `Missing ${described}`,
          ...(templateLocation === undefined
            ? {}
            : {
                templateColumn: templateLocation.column,
                templateLine: templateLocation.line,
              }),
          weight: error.weight,
        };
      },
    );

    return {
      ...(comparison.captures === undefined
        ? {}
        : { captures: comparison.captures }),
      differences,
      totalWeight: comparison.totalWeight,
    };
  }

  // 🌎 Public Methods

  /**
   * Reports every declaration and comment the template requires.
   *
   * The two passes weigh independent things — structure counts syntax nodes,
   * comments count section markers — so their totals add rather than one
   * subsuming the other.
   */
  public validateDocument(
    document: PreparedValidationDocument,
  ): DocumentValidationResult {
    const sourceFiles = {
      instanceSourceFile: this.parseSourceFile({
        content: document.instance,
        filename: document.filename,
      }),
      templateSourceFile: this.parseSourceFile({
        content: document.renderedTemplate,
        filename: document.filename,
      }),
    };
    const structure = this.validateStructure(sourceFiles);
    const comments = this.validateComments(sourceFiles);

    return {
      // Comments are matched as whole text, so only the structure captures.
      ...(structure.captures === undefined
        ? {}
        : { captures: structure.captures }),
      differences: [...structure.differences, ...comments.differences],
      totalWeight: structure.totalWeight + comments.totalWeight,
    };
  }
}
