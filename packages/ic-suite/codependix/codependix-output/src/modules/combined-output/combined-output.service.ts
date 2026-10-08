import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { BoundaryOutcomeReportService } from "@codependix/boundaries";
import { CODEPENDIX_GRAPH_TYPES } from "@codependix/configuration";
import { Injectable } from "@nestjs/common";

import { AnchorsService } from "../anchors/anchors.service";
import { JSON_INDENTATION } from "../delivery/delivery.constants";
import { MARKDOWN_SECTION_INTRO_LINE } from "../graph-run/graph-run.constants";

import {
  BOUNDARIES_KEY,
  BOUNDARIES_MARKDOWN_SUBHEADING,
  FORMAT_JSON,
  FORMAT_MARKDOWN,
  FORMAT_NAMES,
  GRAPH_TYPE_MARKDOWN_SUBHEADINGS,
} from "./combined-output.constants";

import type {
  CombinedOutputFormat,
  CombinedOutputRunArguments,
} from "./combined-output.types";

/**
 * Combines every active graph type's whole-workspace data, and a boundary
 * check's findings when one ran, into the single JSON object and single
 * Markdown document `--json-output`, `--markdown-output`, and `--format` each
 * read from, and delivers them.
 *
 * Kept apart from `DeliveryService`, which delivers one graph type's export
 * to its own per-project or per-workspace destination: this service instead
 * combines every active type's already-built data — see
 * `GraphRunService.run` and `WorkspaceGraphsService` for where that data comes
 * from — into one shared destination or one shared stdout write. Neither
 * output is checked for staleness the way a per-project export is:
 * `--json-output`/`--markdown-output` always write, matching
 * `codometer-cli`'s own `--output-json`/`--output-markdown` precedent.
 */
@Injectable()
export class CombinedOutputService {
  // 🏗 Dependency Injection

  constructor(
    private readonly anchorsService: AnchorsService,
    private readonly boundaryOutcomeReportService: BoundaryOutcomeReportService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Prints whatever `--format` asked for. Never touches a file. */
  private printConsole(args: CombinedOutputRunArguments): void {
    const content =
      args.format === FORMAT_JSON
        ? this.renderJson(args)
        : this.renderMarkdown(args);

    process.stdout.write(`${content}\n`);
  }

  /**
   * Builds the combined JSON object's content, keyed by graph type, with the
   * boundary report under `boundaries` when one was carried.
   */
  private renderJson(args: CombinedOutputRunArguments): string {
    const keyed: Partial<Record<string, unknown>> = {};

    for (const graphType of CODEPENDIX_GRAPH_TYPES) {
      const entry = args.graphs[graphType];

      if (entry !== undefined) {
        keyed[graphType] = entry.json;
      }
    }

    if (args.boundaries !== undefined) {
      keyed[BOUNDARIES_KEY] = this.boundaryOutcomeReportService.buildReport(
        args.boundaries,
      );
    }

    return JSON.stringify(keyed, null, JSON_INDENTATION);
  }

  /**
   * Builds the combined Markdown document's content from every active type,
   * then the boundary report when one was carried.
   */
  private renderMarkdown(args: CombinedOutputRunArguments): string {
    let fileContent = "";

    for (const graphType of CODEPENDIX_GRAPH_TYPES) {
      const entry = args.graphs[graphType];

      if (entry === undefined) continue;

      fileContent = this.anchorsService.insertAnchorSection({
        anchorName: graphType,
        content: entry.markdown,
        fileContent,
        introLine: MARKDOWN_SECTION_INTRO_LINE,
        subheading: GRAPH_TYPE_MARKDOWN_SUBHEADINGS[graphType],
      });
    }

    if (args.boundaries === undefined) return fileContent;

    return this.anchorsService.insertAnchorSection({
      anchorName: BOUNDARIES_KEY,
      content: this.boundaryOutcomeReportService.renderMarkdown(
        this.boundaryOutcomeReportService.buildReport(args.boundaries),
      ),
      fileContent,
      introLine: MARKDOWN_SECTION_INTRO_LINE,
      subheading: BOUNDARIES_MARKDOWN_SUBHEADING,
    });
  }

  /** Writes a combined destination's content, creating its directory first. */
  private writeFile(args: {
    content: string;
    path: string;
    workingDirectory: string;
  }): void {
    const resolvedPath = path.resolve(args.workingDirectory, args.path);

    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, `${args.content}\n`, "utf8");
  }

  // 🌎 Public Methods

  /**
   * Reads `--format` into what the run prints, falling back to
   * `FORMAT_MARKDOWN` when the flag was left off entirely — codependix's
   * configuration declares no `format` field of its own for this to read
   * instead, unlike `codometer-cli`'s own `resolveFormat`.
   */
  resolveFormat(value: string | undefined): {
    errors: string[];
    format: CombinedOutputFormat;
  } {
    if (value === undefined) {
      return { errors: [], format: FORMAT_MARKDOWN };
    }

    const matched = FORMAT_NAMES.find((name) => name === value);

    if (matched === undefined) {
      return {
        errors: [
          `--format does not accept "${value}". It takes one of ${FORMAT_NAMES.map((name) => `"${name}"`).join(" and ")}, as in "--format ${FORMAT_MARKDOWN}".`,
        ],
        format: FORMAT_MARKDOWN,
      };
    }

    return { errors: [], format: matched };
  }

  /**
   * Produces every combined output a run asked for: the console print
   * `--format` always names, and the `--json-output`/`--markdown-output`
   * files when their paths were given.
   *
   * A run naming no active graph type at all — every `--no-*` flag given, or
   * a `--check boundaries`-only run — still prints and writes, with an empty
   * object or an empty document, or just the boundary report: the flags are
   * independent of which graph types are active, exactly as
   * `--check`/`--write` are.
   */
  run(args: CombinedOutputRunArguments): void {
    this.printConsole(args);

    if (args.jsonOutputPath !== undefined) {
      this.writeFile({
        content: this.renderJson(args),
        path: args.jsonOutputPath,
        workingDirectory: args.workingDirectory,
      });
    }

    if (args.markdownOutputPath !== undefined) {
      this.writeFile({
        content: this.renderMarkdown(args),
        path: args.markdownOutputPath,
        workingDirectory: args.workingDirectory,
      });
    }
  }
}
