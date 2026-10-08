import { Injectable } from "@nestjs/common";
import {
  getLeadingCommentRanges,
  type Node,
  type SourceFile,
} from "typescript";

import { TODO_COMMENT_PATTERN } from "./typescript.constants";

import type {
  CommentComparison,
  CompareCommentsArguments,
  ExtractedComment,
} from "./typescript.types";

/**
 * Checks that a file carries the comments its template requires, in order.
 *
 * Order matters here in a way it does not for declarations: the section
 * markers (`🏗 Dependency Injection`, `🔏 Private Methods`, …) are comments,
 * and a file that has them all but in the wrong order has not adopted the
 * layout. Matching is therefore a subsequence check, not a set check.
 */
@Injectable()
export class TypescriptCommentsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Reports each template comment absent from the instance, or present but
   * out of order relative to the comments before it.
   *
   * Every template comment is one requirement, whatever its length: a section
   * marker is a marker. That is reported alongside the misses so a document
   * whose comments are all present still contributes them to its score.
   */
  public compareComments(args: CompareCommentsArguments): CommentComparison {
    const instanceComments = this.extractComments(args.instanceSourceFile);
    const templateComments = this.extractComments(args.templateSourceFile);
    const missingComments: ExtractedComment[] = [];
    let searchIndex = 0;

    for (const templateComment of templateComments) {
      const isPlaceholder = TODO_COMMENT_PATTERN.test(templateComment.text);
      const relativeIndex = instanceComments
        .slice(searchIndex)
        .findIndex((instanceComment) => {
          return isPlaceholder || instanceComment.text === templateComment.text;
        });

      if (relativeIndex === -1) {
        missingComments.push(templateComment);
        continue;
      }

      searchIndex += relativeIndex + 1;
    }

    return { missingComments, totalWeight: templateComments.length };
  }

  /**
   * Collects every comment in a source file, in source order.
   *
   * Walks down to individual tokens and reads the trivia preceding each one.
   * Every comment precedes some token, including the closing brace of a class,
   * which is what makes this complete.
   *
   * Two simpler approaches fail here. Reading leading and trailing ranges off
   * *statement* nodes misses any comment bordering no node — notably the
   * section markers between the last class member and the closing brace, where
   * `🔏 Private Methods` and `🌎 Public Methods` live in an otherwise empty
   * service; those markers were silently unenforceable. Scanning the raw token
   * stream instead loses sync on template literals, because a substitution's
   * closing brace needs an explicit re-scan, and everything after the first
   * template substitution is mis-tokenized.
   */
  public extractComments(sourceFile: SourceFile): ExtractedComment[] {
    const commentsByPosition = new Map<number, ExtractedComment>();

    const visit = (node: Node): void => {
      const children = node.getChildren(sourceFile);

      if (children.length === 0) {
        for (const range of getLeadingCommentRanges(
          sourceFile.text,
          node.getFullStart(),
        ) ?? []) {
          commentsByPosition.set(range.pos, {
            position: range.pos,
            text: sourceFile.text.slice(range.pos, range.end).trim(),
          });
        }

        return;
      }

      for (const child of children) {
        visit(child);
      }
    };

    visit(sourceFile);

    return [...commentsByPosition.values()].toSorted(
      (leftComment, rightComment) => {
        return leftComment.position - rightComment.position;
      },
    );
  }
}
