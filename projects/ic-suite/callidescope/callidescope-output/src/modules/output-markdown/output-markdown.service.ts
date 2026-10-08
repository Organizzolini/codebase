import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import {
  FOREIGN_ANCHOR_PATTERN,
  MissingMarkdownPathError,
} from "./output-markdown.constants";

import type {
  SyncAnchoredBlockArguments,
  SyncMarkdownArguments,
  WrapInAnchorsArguments,
} from "./output-markdown.types";
import type { MarkdownAnchorHelpers } from "@callidescope/configuration";

/**
 * Splices a generated block into a markdown file, between two anchors.
 *
 * Staleness is decided by comparing the extracted block against the
 * regenerated one, byte for byte. A file with no anchors, or no file at all,
 * counts as stale rather than as an error, so check mode reports the same thing
 * whether the block drifted or was never written.
 */
@Injectable()
export class OutputMarkdownService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(OutputMarkdownService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Appends a generated block after a file's existing content. */
  private appendBlock(args: { existing: string; generated: string }): string {
    // Trailing newlines are trimmed before the separator goes in: a file that
    // already ended with one would otherwise gain a second blank line every
    // time, which every markdown linter rejects.
    const body = args.existing.trimEnd();
    const separator = body.length === 0 ? "" : `${body}\n\n`;

    return `${separator}${args.generated}\n`;
  }

  /** Builds the pattern matching everything between the two anchors. */
  private buildBlockPattern(
    destination: SyncAnchoredBlockArguments["destination"],
  ): RegExp {
    return new RegExp(
      String.raw`${this.escapePattern(destination.startMarker)}[\s\S]*?${this.escapePattern(destination.endMarker)}`,
    );
  }

  /** Escapes a marker so it can sit inside a pattern. */
  private escapePattern(value: string): string {
    return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  }

  /** Reads a file, treating an absent one as empty. */
  private readExisting(filePath: string): string {
    try {
      return readFileSync(filePath, "utf8");
    } catch {
      return "";
    }
  }

  /**
   * Cuts out a start marker's corrupted span and splices the fresh block in.
   *
   * Reached only when the start marker is present but the block's own end
   * marker cannot be found anywhere after it — the same file this
   * convention lets stack several anchored blocks back to back, so
   * everything is fair game to have drifted except one thing: another
   * block's own anchors. The span is cut at the next such anchor, or at the
   * end of the file when none follows, so the fresh block replaces exactly
   * what belonged to this one and nothing that belonged to another.
   */
  private replaceOrphanedBlock(args: {
    existing: string;
    generated: string;
    startIndex: number;
    startMarker: string;
  }): string {
    const searchFrom = args.startIndex + args.startMarker.length;
    const foreignAnchor = FOREIGN_ANCHOR_PATTERN.exec(
      args.existing.slice(searchFrom),
    );
    const spanEnd =
      foreignAnchor === null
        ? args.existing.length
        : searchFrom + foreignAnchor.index;
    const before = args.existing.slice(0, args.startIndex).trimEnd();
    const after = args.existing.slice(spanEnd).trim();
    const prefix = before.length === 0 ? "" : `${before}\n\n`;

    // `after` is trimmed rather than kept verbatim: whatever whitespace
    // surrounded it, including any doubled blank line an earlier version of
    // this same repair left behind, this is the one place that gets to
    // decide the block separator, exactly once.
    return after.length === 0
      ? `${prefix}${args.generated}\n`
      : `${prefix}${args.generated}\n\n${after}\n`;
  }

  /**
   * Places the generated block into the file's current content.
   *
   * A pattern match replaces cleanly. No start marker at all falls back to
   * appending, the historical behavior for a file never written to before.
   * A start marker with no matching end can never satisfy the pattern —
   * silently leaving it in place is what let a run claim success while
   * changing nothing — so that span is cut out and replaced instead.
   */
  private spliceBlock(args: {
    destination: SyncAnchoredBlockArguments["destination"];
    existing: string;
    generated: string;
    pattern: RegExp;
  }): string {
    if (args.pattern.test(args.existing)) {
      // Replaced through a function so a `$` in the generated content is
      // not read as a pattern reference.
      return args.existing.replace(args.pattern, () => args.generated);
    }

    const startIndex = args.existing.indexOf(args.destination.startMarker);

    if (startIndex === -1) {
      return this.appendBlock({
        existing: args.existing,
        generated: args.generated,
      });
    }

    return this.replaceOrphanedBlock({
      existing: args.existing,
      generated: args.generated,
      startIndex,
      startMarker: args.destination.startMarker,
    });
  }

  // 🌎 Public Methods

  /** Builds the helpers a configured `writeBlock` function is handed. */
  public buildHelpers(args: SyncMarkdownArguments): MarkdownAnchorHelpers {
    const { content } = args;

    return {
      endMarker: args.destination.endMarker,
      startMarker: args.destination.startMarker,
      syncAnchoredBlock: (overrides): boolean =>
        this.syncAnchoredBlock({
          check: args.check,
          content: overrides?.content ?? content,
          destination: args.destination,
          path: overrides?.path,
        }),
      wrapInAnchors: (override): string =>
        this.wrapInAnchors({
          content: override ?? content,
          destination: args.destination,
        }),
    };
  }

  /** Syncs the configured markdown destination with the current findings. */
  public sync(args: SyncMarkdownArguments): boolean {
    const { content } = args;
    const custom = args.destination.writeBlock;

    if (custom === undefined) {
      return this.syncAnchoredBlock({
        check: args.check,
        content,
        destination: args.destination,
        path: args.destination.path,
      });
    }

    return custom({
      check: args.check,
      content,
      helpers: this.buildHelpers(args),
      path: args.destination.path,
      result: args.result,
    });
  }

  /**
   * Splices the anchored block into a file.
   *
   * Appends the block when the anchors are absent, creates the file when it
   * does not exist, and in check mode writes nothing and reports whether the
   * file already holds the current block.
   */
  public syncAnchoredBlock(args: SyncAnchoredBlockArguments): boolean {
    const target = args.path ?? args.destination.path;

    if (target.length === 0) {
      throw new MissingMarkdownPathError();
    }

    const resolvedPath = path.resolve(target);
    const existing = this.readExisting(resolvedPath);
    const generated = this.wrapInAnchors(args);
    const pattern = this.buildBlockPattern(args.destination);

    if (args.check) {
      return pattern.exec(existing)?.[0] === generated;
    }

    const updated = this.spliceBlock({
      destination: args.destination,
      existing,
      generated,
      pattern,
    });

    writeFileSync(resolvedPath, updated, "utf8");
    this.logger.info("🔭 Wrote a report", undefined, { path: resolvedPath });

    return true;
  }

  /** Wraps content in the configured anchors. */
  public wrapInAnchors(args: WrapInAnchorsArguments): string {
    // A blank line after the opening anchor so a formatter reading the file
    // afterwards leaves the block alone.
    return `${args.destination.startMarker}\n\n${args.content}\n${args.destination.endMarker}`;
  }
}
