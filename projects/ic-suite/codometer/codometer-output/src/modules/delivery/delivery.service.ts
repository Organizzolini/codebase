import { DEFAULT_JSON_INDENTATION } from "@codometer/configuration";
import { Injectable } from "@nestjs/common";

import { JsonService } from "../json/json.service";
import { MarkdownService } from "../markdown/markdown.service";

import { DEFAULT_MARKDOWN_DESTINATION } from "./delivery.constants";

import type { TargetSize } from "../markdown/markdown.types";
import type { DeliverArguments } from "./delivery.types";
import type { RunMode } from "@codometer/configuration";
import type { MeasurementResult } from "@codometer/measurement";

/**
 * Produces every resolved output — the report, the badge block, and whatever
 * the run prints — and says which of the written ones are stale.
 *
 * Split out of `MeasureCommand` so delivering a report is a concern of its
 * own, separate from measuring and from gating on what was measured. Every
 * destination is produced before anything is reported, so a run that writes
 * and gates writes all of its reports even when the gate then trips.
 *
 * Standard output has exactly one writer here, `deliverConsole`. A file sink
 * never prints: two sinks that could each decide to print is how one run put
 * two documents on the stream a pipeline was parsing.
 *
 * `renderBadges` and where a custom statistic's per-instance breaches are
 * rendered are `@codometer/output`'s business, not this service's — it hands
 * over the measured statistics and a destination and lets that package
 * decide what the markdown says.
 */
@Injectable()
export class DeliveryService {
  // 🏗 Dependency Injection

  constructor(
    private readonly jsonService: JsonService,
    private readonly markdownService: MarkdownService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Print whatever the run asked for, and nothing when it asked for nothing. */
  private deliverConsole(args: DeliverArguments): void {
    if (args.format === undefined) {
      return;
    }

    if (args.format === "json") {
      process.stdout.write(
        this.jsonService.render({
          indentation:
            args.destinations.json?.indentation ?? DEFAULT_JSON_INDENTATION,
          report: args.report,
        }),
      );
      return;
    }

    const badges = this.markdownService.renderBlock({
      destination: args.consoleMarkdown ?? DEFAULT_MARKDOWN_DESTINATION,
      scope: args.scope,
      statistics: args.measurement.statistics,
      targets: this.readTargetSizes(args.measurement),
    });

    process.stdout.write(`${badges}\n`);
  }

  /** Write the report to its file, if this run writes or compares one. */
  private deliverJson(args: DeliverArguments, stalePaths: string[]): void {
    const destination = args.destinations.json;

    if (destination === undefined || !this.touchesFiles(args.mode)) {
      return;
    }

    const isCurrent = this.jsonService.sync({
      check: args.mode.checksReports,
      indentation: destination.indentation,
      path: destination.path,
      report: args.report,
    });

    if (!isCurrent && args.mode.checksReports) {
      stalePaths.push(destination.path);
    }
  }

  /**
   * Put the badge block into its markdown file, if this run writes or
   * compares one.
   *
   * The one markdown sink. `MarkdownService.sync` splices the block between
   * its markers when the file carries them, appends it when it does not, and
   * creates the file when it is not there — so a README somebody else wrote
   * and a file holding nothing but badges are the same case, and neither
   * needs a flag of its own.
   */
  private deliverMarkdown(args: DeliverArguments, stalePaths: string[]): void {
    const destination = args.destinations.markdown;

    if (destination === undefined || !this.touchesFiles(args.mode)) {
      return;
    }

    const isCurrent = this.markdownService.sync({
      check: args.mode.checksReports,
      destination,
      scope: args.scope,
      statistics: args.measurement.statistics,
      targets: this.readTargetSizes(args.measurement),
    });

    if (!isCurrent && args.mode.checksReports) {
      // A configured writer may have picked the file itself, so name the
      // destination rather than claiming a path nobody configured.
      stalePaths.push(destination.path ?? "markdown output");
    }
  }

  /**
   * The size of every input this run measured, in declaration order.
   *
   * Left out rather than reported as zero bytes: an input that ran no size
   * analysis, and an input whose globs matched no file. Both would otherwise
   * publish `0.00 kB` — a figure that is not merely missing but wrong, and
   * wrong in a README a release commits. An input measured before its build
   * lands is the ordinary way to reach the second case, and it is caught by a
   * failing limit only for the inputs that happen to declare one.
   *
   * A run that declared no input beyond `codebase` produces an empty list and
   * no size badges.
   */
  private readTargetSizes(measurement: MeasurementResult): TargetSize[] {
    return measurement.inputs.flatMap((input) =>
      input.size === undefined || input.size.files === 0
        ? []
        : [
            {
              bytes: input.size.bytes,
              compression: input.size.compression,
              name: input.name,
            },
          ],
    );
  }

  /**
   * Whether the run does anything with a file at all.
   *
   * A run that neither writes nor compares leaves every file alone. What it
   * shows instead is `--format`'s business, not a destination's.
   */
  private touchesFiles(mode: RunMode): boolean {
    return mode.writesJson || mode.writesMarkdown || mode.checksReports;
  }

  // 🌎 Public Methods

  /** Produce every output, and name the ones found stale. */
  deliver(args: DeliverArguments): string[] {
    const stalePaths: string[] = [];

    this.deliverConsole(args);
    this.deliverJson(args, stalePaths);
    this.deliverMarkdown(args, stalePaths);

    return stalePaths;
  }
}
