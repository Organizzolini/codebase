import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import {
  CODOMETER_SECTION_HEADING,
  MissingMarkdownPathError,
  REGEX_SPECIAL_CHARACTERS,
  TRAILING_NEWLINES,
} from "./markdown.constants";
import {
  buildCssGroup,
  buildCustomGroup,
  buildCustomStatisticInstancesSection,
  buildHclGroup,
  buildJavascriptGroup,
  buildJsonGroup,
  buildJupyterGroup,
  buildMarkdownGroup,
  buildPythonGroup,
  buildRepositoryGroup,
  buildShellGroup,
  buildSqlGroup,
  buildTargetsGroup,
  buildTomlGroup,
  buildTypescriptGroup,
  buildYamlGroup,
} from "./markdown.utilities";

import type {
  BuildAnchorHelpersArguments,
  RenderBadgesArguments,
  RenderDocumentArguments,
  SyncAnchoredBlockArguments,
  SyncMarkdownArguments,
  WrapInAnchorsArguments,
} from "./markdown.types";
import type {
  MarkdownAnchorHelpers,
  ResolvedCodometerMarkdownOutput,
} from "@codometer/configuration";
import type { CodeStatisticsResult } from "@codometer/core";

/**
 * Writes generated code statistics badges into a markdown file.
 */
@Injectable()
export class MarkdownService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(MarkdownService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Build the anchor helpers handed to a configured `write` function.
   *
   * Every helper is bound to this run's content, path, and mode, so a writer
   * that only wants the ordinary splice calls one method with no arguments.
   *
   * Each helper keeps the name of the method it wraps, because those names are
   * the `MarkdownAnchorHelpers` contract a configured writer is written
   * against.
   */
  private buildAnchorHelpers(
    args: BuildAnchorHelpersArguments,
  ): MarkdownAnchorHelpers {
    return {
      endMarker: args.destination.endMarker,
      startMarker: args.destination.startMarker,
      syncAnchoredBlock: (overrides = {}) =>
        this.syncAnchoredBlock({
          check: args.check,
          content: overrides.content ?? args.content,
          destination: args.destination,
          path: overrides.path ?? args.destination.path,
        }),
      wrapInAnchors: (content = args.content) =>
        this.wrapInAnchors({ content, destination: args.destination }),
    };
  }

  /**
   * Assemble the badge groups, in the order they are rendered.
   *
   * Every counter the measurement pipeline produces gets a badge, grouped
   * under a heading naming the language it was measured from. Only the first
   * group spans languages; the rest report one language each, so a number
   * that moves can be traced to the analyzer that produced it rather than to
   * a sum that silently mixes several. That first group is named for the
   * run's scope — `Repository` for the whole tree, `Project` for one project.
   *
   * `Measured Targets` is the one group not counting anything the language analyzers
   * produced: it reports the size of each declared target this run measured,
   * which is how a project's README carries the compressed size of what it
   * ships. It renders nothing when the run declared no target, so the
   * whole-repository report is byte for byte what it was.
   */
  private buildBadgeGroups(args: RenderDocumentArguments): string {
    const { statistics } = args;

    return [
      buildRepositoryGroup(statistics, args.scope),
      buildTargetsGroup(args.targets),
      buildTypescriptGroup(statistics),
      buildJavascriptGroup(statistics),
      buildPythonGroup(statistics),
      buildJsonGroup(statistics),
      buildYamlGroup(statistics),
      buildTomlGroup(statistics),
      buildShellGroup(statistics),
      buildSqlGroup(statistics),
      buildHclGroup(statistics),
      buildCssGroup(statistics),
      buildCustomGroup(statistics),
      buildJupyterGroup(statistics),
      buildMarkdownGroup(statistics),
    ]
      .filter((group) => group !== "")
      .join("\n\n");
  }

  /**
   * Build the matcher for a block delimited by the configured markers.
   */
  private buildBlockRegex(args: {
    endMarker: string;
    startMarker: string;
  }): RegExp {
    return new RegExp(
      String.raw`${this.escapeRegex(args.startMarker)}[\s\S]*?${this.escapeRegex(args.endMarker)}`,
    );
  }

  /**
   * Escape a configured marker so it can be searched for literally.
   */
  private escapeRegex(input: string): string {
    return input.replaceAll(REGEX_SPECIAL_CHARACTERS, String.raw`\$&`);
  }

  /**
   * Read an existing markdown file, returning an empty string if absent.
   */
  private readExisting(markdownPath: string): string {
    try {
      return readFileSync(path.resolve(markdownPath), "utf8");
    } catch {
      return "";
    }
  }

  /**
   * Narrow the measured statistics to one destination's own selected
   * counters.
   *
   * `statistics.custom` is every counter the configuration's top-level
   * `custom` array declares, measured once for the whole run regardless of
   * which output — if any — renders each one. Two destinations may select
   * entirely different labels back out of it, so each has to pick its own
   * subset before rendering, or one destination's badges would carry
   * another's counters too.
   */
  private scopeCustomStatistics(
    statistics: CodeStatisticsResult,
    destination: ResolvedCodometerMarkdownOutput,
  ): CodeStatisticsResult {
    const labels = new Set(
      destination.custom.map((statistic) => statistic.label),
    );

    return {
      ...statistics,
      custom: statistics.custom.filter((statistic) =>
        labels.has(statistic.label),
      ),
    };
  }

  /**
   * Splice the anchored block into a file, or report whether it is current.
   *
   * Replaces the block when the markers are found, appends it when they are
   * absent, and creates the file when it does not exist. Check mode compares
   * and writes nothing.
   *
   * Deliberately its own splice, not the `documents` module's
   * `DocumentsService`: that service has no check mode, and its `wrap` omits
   * the blank line after the opening marker that `wrapInAnchors` below adds
   * for Prettier — sharing it as-is would either drop check-mode reports or
   * reformat every README the badge block sits in. Only the byte formatting
   * was shared; unifying the splice itself needs check mode added to
   * `DocumentsService` first, which is unscoped work of its own.
   */
  private syncAnchoredBlock(args: SyncAnchoredBlockArguments): boolean {
    if (args.path === undefined) {
      throw new MissingMarkdownPathError();
    }

    const resolvedPath = path.resolve(args.path);
    const existingMarkdown = this.readExisting(resolvedPath);
    const generatedBlock = this.wrapInAnchors(args);
    const blockRegex = this.buildBlockRegex(args.destination);
    const currentBlock = blockRegex.exec(existingMarkdown)?.[0];

    if (args.check) {
      return currentBlock === generatedBlock;
    }

    if (!existingMarkdown.includes(args.destination.startMarker)) {
      // Exactly one blank line between what was already there and the block,
      // whatever the file ended with. Appending to text that already ended in a
      // newline used to leave two, which `MD012/no-multiple-blanks` fails and
      // `markdownlint --fix` does not repair — so every README the block was
      // first written into failed lint for whoever ran it next.
      const preamble =
        existingMarkdown === ""
          ? ""
          : `${existingMarkdown.replace(TRAILING_NEWLINES, "")}\n\n`;

      this.writeMarkdownFile(resolvedPath, `${preamble}${generatedBlock}\n`);
      return true;
    }

    // Replaced through a function so that a `$` in the rendered markdown stays
    // a `$` rather than being read as a replacement pattern.
    this.writeMarkdownFile(
      resolvedPath,
      existingMarkdown.replace(blockRegex, () => generatedBlock),
    );
    return true;
  }

  /**
   * Wrap rendered markdown in the configured anchor markers.
   */
  private wrapInAnchors(args: WrapInAnchorsArguments): string {
    // The blank line after the opening marker is what Prettier expects of a
    // paragraph following an HTML comment. Without it the generated markdown is
    // permanently one reformat away from clean, and `prettier --check` fails
    // on a file no human edited.
    return `${args.destination.startMarker}\n\n${args.content}\n${args.destination.endMarker}`;
  }

  /**
   * Write markdown to a file, and record that it happened.
   *
   * Creates the directory on the way. The block is appended to a file that
   * does not exist yet as readily as it is spliced into one that does, so a
   * destination naming a directory nothing has created is an ordinary command
   * line rather than a mistake.
   */
  private writeMarkdownFile(resolvedPath: string, content: string): void {
    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, content, "utf8");
    this.logger.info("📝 Wrote the markdown badges", undefined, {
      path: resolvedPath,
    });
  }

  // 🌎 Public Methods

  /**
   * Render the badge block for a destination, description and all.
   *
   * The block a splice destination places between its markers, and the body of
   * the document a whole-file destination writes. Both are the same markdown,
   * which is why the two sinks never disagree about a number.
   *
   * `statistics.custom` carries every counter the top-level `custom` array
   * declares; this destination's own `custom` list says which of them it
   * selected, so it is scoped down before rendering.
   */
  renderBadges(args: RenderBadgesArguments): string {
    return this.renderDocument({
      description: args.destination.description,
      scope: args.scope,
      statistics: this.scopeCustomStatistics(args.statistics, args.destination),
      targets: args.targets,
    });
  }

  /**
   * Render the badge block wrapped in its destination's anchor markers.
   *
   * What a splice would place, without placing it — the form a run that writes
   * nothing shows on the console.
   */
  renderBlock(args: RenderBadgesArguments): string {
    return this.wrapInAnchors({
      content: this.renderBadges(args),
      destination: args.destination,
    });
  }

  /**
   * Render the badges as a document of their own.
   *
   * No anchor markers: nothing else is in the file, so there is nothing to
   * anchor the block against.
   *
   * Every run, whatever its scope, heads its figures with the same section
   * heading, because the heading lives inside the markers now rather than
   * being written by hand above them — one owner instead of one per
   * document. The groups underneath still distinguish `Repository` from
   * `Project` by scope, so only the top-level heading unifies.
   *
   * A per-instance custom statistic that breached this run gets one more
   * section after the badges, naming the file and line of each breach —
   * spec #749 user story 16. Nothing is appended when nothing breached, the
   * same instinct the badge groups themselves follow.
   */
  renderDocument(args: RenderDocumentArguments): string {
    const sections: string[] = [CODOMETER_SECTION_HEADING];

    if (args.description !== undefined) {
      sections.push(args.description);
    }

    sections.push(this.buildBadgeGroups(args));

    const instancesSection = buildCustomStatisticInstancesSection(
      args.statistics,
    );

    if (instancesSection !== "") {
      sections.push(instancesSection);
    }

    return sections.join("\n\n");
  }

  /**
   * Sync a splice destination with the current statistics.
   *
   * `write` is the whole of the customizable behavior now: it decides what
   * the markdown says and which file it lands in, replacing what used to be
   * two separate `render` and `write` callbacks. The built-in behavior — no
   * `write` configured — renders badges and splices them between the
   * configured anchor markers.
   *
   * Returns whatever a configured `write` returns; the built-in path returns
   * `false` only when checking, and only when the destination is missing or
   * stale.
   */
  sync(args: SyncMarkdownArguments): boolean {
    const { destination } = args;
    const statistics = this.scopeCustomStatistics(args.statistics, destination);
    const content = this.renderDocument({
      description: destination.description,
      scope: args.scope,
      statistics,
      targets: args.targets,
    });
    const anchors = this.buildAnchorHelpers({
      check: args.check,
      content,
      destination,
    });

    if (destination.write === undefined) {
      return anchors.syncAnchoredBlock();
    }

    return destination.write({
      anchors,
      check: args.check,
      description: destination.description,
      path: destination.path,
      renderBadges: () => content,
      statistics,
    });
  }
}
