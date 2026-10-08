import fs from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  type CodometerRun,
  corpusDirectory,
  exampleConfiguration,
  runCodometer,
  withCorpusCopy,
} from "./codometer.js";

/**
 * The `write-check` example: which flags write a report, which gate, and which
 * combinations are refused.
 */

/** What walking the matrix's rows in order over one corpus copy left behind. */
interface MatrixWalk {
  bare: CodometerRun;
  bareWroteReport: boolean;
  checkedReports: CodometerRun;
  checkedReportsAndLimits: CodometerRun;
  gated: CodometerRun;
  gatedWroteReport: boolean;
  written: CodometerRun;
  wroteMarkdown: boolean;
  wroteReport: boolean;
}

describe("every example configuration this package ships", () => {
  describe("the output and check matrix", () => {
    const runRow = (
      directory: string,
      ...flags: readonly string[]
    ): CodometerRun =>
      runCodometer(
        [
          "--config",
          exampleConfiguration("write-check", "codometer.config.ts"),
          ...flags,
        ],
        directory,
      );

    /**
     * The guide's rows run top to bottom over one copy, as a reader would.
     *
     * Neither of the first two rows writes anything — which is asserted, not
     * assumed — so the write that follows lands in the same fresh tree a copy
     * of its own would have given it, and the comparison rows then read the
     * report that write produced.
     */
    let walk: MatrixWalk;

    beforeAll(() => {
      walk = withCorpusCopy((directory): MatrixWalk => {
        const reportPath = path.join(directory, "codometer-report.json");
        const bare = runRow(directory);
        const bareWroteReport = fs.existsSync(reportPath);
        const gated = runRow(directory, "--check", "limits");
        const gatedWroteReport = fs.existsSync(reportPath);
        const written = runRow(directory, "--output-json", "--output-markdown");

        return {
          bare,
          bareWroteReport,
          checkedReports: runRow(directory, "--check", "reports"),
          checkedReportsAndLimits: runRow(
            directory,
            "--check",
            "reports,limits",
          ),
          gated,
          gatedWroteReport,
          written,
          wroteMarkdown: fs.existsSync(path.join(directory, "statistics.md")),
          wroteReport: fs.existsSync(reportPath),
        };
      });
    });

    it("writes only when asked, and gates only when asked", () => {
      expect(walk.bare.exitCode).toBe(0);
      expect(walk.bareWroteReport).toBe(false);

      expect(walk.gated.exitCode).toBe(1);
      expect(walk.gatedWroteReport).toBe(false);

      expect(walk.written.exitCode).toBe(0);
      expect(walk.wroteReport).toBe(true);
      expect(walk.wroteMarkdown).toBe(true);
    });

    it("produces every report before it fails on a breach", () => {
      withCorpusCopy((directory) => {
        const run = runRow(
          directory,
          "--output-json",
          "--output-markdown",
          "--check",
          "limits",
        );

        expect(run.exitCode).toBe(1);
        // The report is on disk even though the gate tripped: a pull request that
        // failed the gate is exactly the one that needs the numbers.
        expect(
          fs.existsSync(path.join(directory, "codometer-report.json")),
        ).toBe(true);
      });
    });

    it("compares a written report rather than rewriting it", () => {
      expect(walk.checkedReports.exitCode).toBe(0);
      expect(walk.checkedReportsAndLimits.exitCode).toBe(1);
    });

    it("refuses --output-json combined with --check reports", () => {
      withCorpusCopy((directory) => {
        const run = runRow(directory, "--output-json", "--check", "reports");

        expect(run.exitCode).toBe(1);
        expect(run.standardError).toContain(
          "a report cannot be stale in the run that just wrote it",
        );
      });
    });

    it("refuses a --check value it does not know", () => {
      const run = runRow(corpusDirectory, "--check", "everything");

      expect(run.exitCode).toBe(1);
      expect(run.standardError).toContain("--check does not accept");
    });
  });
});
