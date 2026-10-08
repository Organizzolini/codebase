import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import type { RenderReportArguments, SyncJsonArguments } from "./json.types";

/**
 * Writes the report to a JSON file.
 *
 * The file holds the report and nothing else — no timestamp, no tool version.
 * Anything that changes between two runs over the same tree would report a
 * repository nobody touched as stale.
 */
@Injectable()
export class JsonService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(JsonService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Read an existing report, returning an empty string if absent.
   */
  private readExisting(reportPath: string): string {
    try {
      return readFileSync(path.resolve(reportPath), "utf8");
    } catch {
      return "";
    }
  }

  // 🌎 Public Methods

  /**
   * Render the report as the JSON document that gets written.
   *
   * Ends with a newline so the file matches what a formatter would leave
   * behind, and so a staleness comparison does not fail over the one byte
   * every other tool in the repository adds.
   */
  render<Report>(args: RenderReportArguments<Report>): string {
    return `${JSON.stringify(args.report, null, args.indentation)}\n`;
  }

  /**
   * Sync the JSON file with the current report.
   *
   * - **Writing**: writes the file, creating parent directories as needed.
   * - **Checking**: returns `true` when the file already holds the current
   *   report, `false` when it is missing or stale, and writes nothing.
   */
  sync<Report>(args: SyncJsonArguments<Report>): boolean {
    const resolvedPath = path.resolve(args.path);
    const rendered = this.render(args);

    if (args.check) {
      return this.readExisting(resolvedPath) === rendered;
    }

    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, rendered, "utf8");

    this.logger.info("📝 Wrote the JSON report", undefined, {
      path: resolvedPath,
    });

    return true;
  }
}
