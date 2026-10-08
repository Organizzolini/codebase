import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import type {
  BuildReportArguments,
  SyncJsonArguments,
} from "./output-json.types";

/**
 * Writes the traced findings to a JSON report file.
 *
 * The report holds the findings and nothing else — no timestamp, no tool
 * version, no run duration. Anything that changed between two runs over the
 * same tree would make check mode fail on a repository nobody touched.
 */
@Injectable()
export class OutputJsonService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(OutputJsonService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reads an existing report, returning an empty string if absent. */
  private readExisting(reportPath: string): string {
    try {
      return readFileSync(path.resolve(reportPath), "utf8");
    } catch {
      return "";
    }
  }

  // 🌎 Public Methods

  /**
   * Renders the JSON report for the traced findings.
   *
   * Ends with a newline so the file matches what a formatter would leave
   * behind, and so check mode does not fail over the one byte every other tool
   * in the repository adds.
   */
  public buildReport(args: BuildReportArguments): string {
    return `${JSON.stringify(args.result, null, args.destination.indentation)}\n`;
  }

  /**
   * Syncs the configured JSON file with the current findings.
   *
   * In write mode the report is written, creating parent directories as
   * needed. In check mode nothing is written and the return value reports
   * whether the file already holds the current report.
   */
  public sync(args: SyncJsonArguments): boolean {
    const resolvedPath = path.resolve(args.destination.path);
    const generatedReport = this.buildReport(args);

    if (args.check) {
      return this.readExisting(args.destination.path) === generatedReport;
    }

    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, generatedReport, "utf8");

    this.logger.info("🔭 Wrote a report", undefined, { path: resolvedPath });

    return true;
  }
}
