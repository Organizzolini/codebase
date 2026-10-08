import { Injectable } from "@nestjs/common";

import { COMMENT_EXCERPT_LENGTH, COMMENT_KIND } from "./comments.constants";

import type {
  CommentBlock,
  CommentBudget,
  CommentMeasurement,
  CommentToken,
  MeasureCommentsArguments,
  MeasureCommentTextArguments,
} from "./comments.types";
import type { CodometerDocumentationUnit } from "@codometer/configuration";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Measures comments against the maxima a configuration declares.
 *
 * Everything here is language-agnostic: it takes comments somebody else
 * already found and says how long they are. What counts as a comment differs
 * per language and lives with the reader that knows — `HashCommentsService`
 * for the `#` languages, `YamlCommentsService` for YAML's tokenizer, and the
 * TypeScript walk for a JSDoc block.
 *
 * That split is what keeps one definition of a word, a line, and a character
 * across every language, rather than four analyzers each counting slightly
 * differently.
 */
@Injectable()
/* v8 ignore stop */
export class CommentsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Counts the words in a comment's prose, markers already stripped.
   *
   * Splitting a trimmed string on whitespace runs never yields an empty
   * token, so the empty case is the only one worth guarding — and guarding it
   * rather than filtering keeps a callback frame off the deepest stack this
   * package owns.
   */
  private countWords(prose: string): number {
    const trimmed = prose.trim();

    return trimmed === "" ? 0 : trimmed.split(/\s+/u).length;
  }

  /**
   * Every declared maximum, paired with what this comment measured.
   *
   * Written as three guarded pushes rather than a table walked by `flatMap`,
   * because the callback would be one more frame on the deepest stack this
   * package owns — the JSDoc walk reaches here through eleven of them, and
   * `callidescope.config.ts` gates that at what it measures.
   */
  private declaredLimits(
    args: { prose: string; source: string },
    comments: CommentBudget,
  ): { limit: number; measured: number; unit: CodometerDocumentationUnit }[] {
    const declared: {
      limit: number;
      measured: number;
      unit: CodometerDocumentationUnit;
    }[] = [];

    if (comments.maximumCharacters !== undefined) {
      declared.push({
        limit: comments.maximumCharacters,
        measured: args.source.length,
        unit: "characters",
      });
    }

    if (comments.maximumLines !== undefined) {
      declared.push({
        limit: comments.maximumLines,
        measured: args.source.split("\n").length,
        unit: "lines",
      });
    }

    if (comments.maximumWords !== undefined) {
      declared.push({
        limit: comments.maximumWords,
        measured: this.countWords(args.prose),
        unit: "words",
      });
    }

    return declared;
  }

  /** The prose of a run of comment lines, markers already stripped. */
  private readProse(tokens: readonly CommentToken[]): string {
    return tokens
      .map((token) => token.prose)
      .join(" ")
      .trim();
  }

  /** A run of comment lines exactly as the file carries them. */
  private readSource(tokens: readonly CommentToken[]): string {
    return tokens.map((token) => token.source).join("\n");
  }

  /** Shortens a block's prose to something a breach line can carry. */
  private toExcerpt(prose: string): string {
    return prose.length > COMMENT_EXCERPT_LENGTH
      ? `${prose.slice(0, COMMENT_EXCERPT_LENGTH)}…`
      : prose;
  }

  // 🌎 Public Methods

  /**
   * Groups a file's comment lines into the blocks a reader perceives.
   *
   * A trailing comment never joins anything — it sits after a value and is
   * read with that value, not with the prose above it — and neither does a
   * comment separated from the previous one by a blank line, which is how a
   * writer marks the end of a thought.
   */
  groupIntoBlocks(tokens: readonly CommentToken[]): CommentBlock[] {
    const blocks: CommentBlock[] = [];

    for (const token of tokens) {
      const previous = blocks.at(-1);
      const last = previous?.tokens.at(-1);

      if (
        previous !== undefined &&
        last !== undefined &&
        token.ownLine &&
        last.ownLine &&
        token.line === last.line + 1
      ) {
        previous.tokens.push(token);
        continue;
      }

      blocks.push({ tokens: [token] });
    }

    return blocks;
  }

  /**
   * Measures every block a file's comment tokens form, breached or not.
   *
   * Every block is reported rather than only the breaches, so a length is
   * visible in the JSON report before it ever becomes a problem — the same
   * bargain the TypeScript declaration-comment measurement makes. A block is
   * reported once per declared maximum, because the maxima are not
   * alternatives: one can hold while another breaks.
   */
  measure(args: MeasureCommentsArguments): CommentMeasurement[] {
    return this.groupIntoBlocks(args.tokens).flatMap((block) => {
      const prose = this.readProse(block.tokens);

      return this.measureText({
        comments: args.comments,
        declaration: this.toExcerpt(prose),
        filePath: args.filePath,
        kind: COMMENT_KIND,
        line: block.tokens[0]?.line ?? 1,
        prose,
        source: this.readSource(block.tokens),
      });
    });
  }

  /**
   * Measures one comment's text against every maximum declared for it.
   *
   * The seam a JSDoc block enters through: it is one comment already, found by
   * the TypeScript walk rather than grouped from lines, so it needs the
   * counting and none of the grouping.
   */
  measureText(args: MeasureCommentTextArguments): CommentMeasurement[] {
    return this.declaredLimits(args, args.comments).map(
      ({ limit, measured, unit }) => ({
        breached: measured > limit,
        declaration: args.declaration,
        file: args.filePath,
        kind: args.kind,
        limit,
        line: args.line,
        measured,
        severity: args.comments.severity,
        unit,
      }),
    );
  }
}
