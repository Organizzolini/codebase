import { Injectable } from "@nestjs/common";

import {
  COLLAPSED_PARAMETERS,
  DEPRECATED_MARKER,
  ENTRY_FRAME_PREFIX,
  NESTED_FRAME_PREFIX,
  SENTENCE_END_PATTERN,
  SIGNATURE_LIMIT,
  SUMMARY_LIMIT,
  SUMMARY_PREFIX,
  TRUNCATION_SUFFIX,
} from "./report.constants";

import type { StackFrame } from "@callidescope/core";

/**
 * Renders one call stack as an indented tree.
 *
 * Plain text rather than a markdown list, because the indentation is the thing
 * that makes a stack readable and a list would have every renderer reflow it.
 * Whatever embeds this is responsible for putting it in a fence.
 */
@Injectable()
export class ReportService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reads a summary's opening sentence, when it has more than one. */
  private readFirstSentence(summary: string): string | undefined {
    const match = SENTENCE_END_PATTERN.exec(summary);

    return match === null ? undefined : summary.slice(0, match.index + 1);
  }

  /** Renders one frame at its indentation, with whatever it says about itself. */
  private renderFrame(args: { depth: number; frame: StackFrame }): string {
    const indent = "  ".repeat(args.depth);
    const prefix = args.depth === 0 ? ENTRY_FRAME_PREFIX : NESTED_FRAME_PREFIX;
    const { filePath, line } = args.frame.location;
    const head = `${indent}${prefix} ${args.frame.displayName}${this.renderSignature(args.frame)}${this.renderMarkers(args.frame)} [${filePath}:${String(line)}]`;
    const summary = args.frame.documentation?.summary ?? "";

    return summary.length === 0
      ? head
      : `${head}\n${indent}   ${SUMMARY_PREFIX} ${this.shortenSummary(summary)}`;
  }

  /** Renders what a frame warns about: that it recurses, that it is on its way out. */
  private renderMarkers(frame: StackFrame): string {
    const cycle = frame.isCycle ? " (cycle)" : "";

    return (frame.documentation?.isDeprecated ?? false)
      ? `${cycle} ${DEPRECATED_MARKER}`
      : cycle;
  }

  /**
   * Renders a callable's signature, collapsing one that is too long.
   *
   * The return type survives the collapse. Which twelve services a constructor
   * takes is noise at the point where someone is reading a stack; what it hands
   * back is not.
   */
  private renderSignature(frame: StackFrame): string {
    const { signature } = frame;

    if (signature === undefined) {
      return "()";
    }

    return signature.text.length <= SIGNATURE_LIMIT
      ? signature.text
      : `${COLLAPSED_PARAMETERS}: ${signature.returnType}`;
  }

  /**
   * Shortens a summary to what fits under an indented frame.
   *
   * The opening sentence first, because a comment that runs long here is a
   * short statement of what the callable does followed by paragraphs of why —
   * and the first half is the half that orients someone reading a stack. It is
   * printed whole and unmarked: it is a complete thought, not an elision, and
   * the frame's `file:line` is already the pointer to the rest.
   *
   * Cutting at the character instead throws away a sentence boundary that was
   * usually right there. Across this repository that happens to a fifth of
   * printed summaries, whose opening sentences run about 64 characters at the
   * median and 113 at the very longest.
   *
   * A single sentence longer than the limit has no boundary to find, so it is
   * cut on a word — half a word reads as a typo rather than as an elision —
   * and marked as cut short.
   */
  private shortenSummary(summary: string): string {
    if (summary.length <= SUMMARY_LIMIT) {
      return summary;
    }

    const sentence = this.readFirstSentence(summary);

    if (sentence !== undefined && sentence.length <= SUMMARY_LIMIT) {
      return sentence;
    }

    const clipped = summary.slice(0, SUMMARY_LIMIT);
    const lastSpace = clipped.lastIndexOf(" ");
    const kept = lastSpace === -1 ? clipped : clipped.slice(0, lastSpace);

    return `${kept.trimEnd()}${TRUNCATION_SUFFIX}`;
  }

  // 🌎 Public Methods

  /**
   * Renders every frame of a stack, the entry point first.
   *
   * Takes anything holding a frame list rather than a full `CallStack`: a
   * depth or entry-point kind is never read here, so a caller with a path
   * that has neither — an address-centered lookup, for one — does not have to
   * fabricate one to call this.
   */
  public renderStackTree(stack: { frames: readonly StackFrame[] }): string {
    return stack.frames
      .map((frame, depth) => this.renderFrame({ depth, frame }))
      .join("\n");
  }
}
