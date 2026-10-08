import { Injectable } from "@nestjs/common";
import postcss from "postcss";

import type { CommentToken } from "./comments.types";
import type { Comment } from "postcss";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Reads CSS's `/* ... *\/` comments from postcss's own parse.
 *
 * CSS has only the one comment syntax, and no line form at all, so a real
 * parser costs nothing extra here: postcss already reads the repository's
 * stylesheets for `CssService`, and its comment nodes carry a line and column
 * a scanner would otherwise have to recompute by hand.
 */
@Injectable()
/* v8 ignore stop */
export class CssCommentsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * A comment's text with the whitespace postcss split off restored.
   *
   * `raws.left`/`raws.right` are typed optional, but postcss's own parse
   * always fills both in — with an empty string for an empty comment, never
   * `undefined` — so the fallback is unreachable rather than untested.
   */
  private toBody(comment: Comment): string {
    /* v8 ignore next -- postcss always sets both after a real parse */
    const left = comment.raws.left ?? "";
    /* v8 ignore next -- postcss always sets both after a real parse */
    const right = comment.raws.right ?? "";

    return `${left}${comment.text}${right}`;
  }

  /**
   * Whether only whitespace precedes a comment's opening marker on its line.
   *
   * `comment.source` is typed optional because postcss also allows building a
   * node by hand with none, which never happens here: every comment measured
   * came from parsing real content, which always carries its position.
   */
  private toOwnLine(content: string, comment: Comment): boolean {
    /* v8 ignore next -- unreachable: this reader only sees parsed comments */
    const { column, line } = comment.source?.start ?? { column: 1, line: 1 };
    /* v8 ignore next -- a comment's own line is always inside its file */
    const lineText = content.split("\n")[line - 1] ?? "";

    return lineText.slice(0, column - 1).trim() === "";
  }

  // 🌎 Public Methods

  /**
   * Reads every comment postcss's parse finds, in document order.
   *
   * Empty for a stylesheet postcss cannot parse at all, the same way
   * `CssService` skips a file it cannot parse rather than throwing out of the
   * whole measurement run.
   */
  read(content: string): CommentToken[] {
    const tokens: CommentToken[] = [];

    try {
      postcss.parse(content).walkComments((comment) => {
        const body = this.toBody(comment);

        tokens.push({
          /* v8 ignore next -- unreachable: this reader only sees parsed comments */
          line: comment.source?.start?.line ?? 1,
          ownLine: this.toOwnLine(content, comment),
          prose: body,
          source: `/*${body}*/`,
        });
      });
    } catch {
      return [];
    }

    return tokens;
  }
}
