import fs from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  type CodometerReport,
  type CodometerRun,
  exampleConfiguration,
  measure,
  readMetric,
  readTarget,
  runCodometer,
  withCorpusCopy,
} from "./codometer.js";

/**
 * What codometer does with the reports it writes: leaves them out of what it
 * measures, and compares them on `--check reports`.
 *
 * Both examples write, so both run against a throwaway copy of the corpus.
 */

describe("every example configuration this package ships", () => {
  describe("what codometer writes, it does not measure", () => {
    /**
     * One copy, walked in the order the guide describes it.
     *
     * The first write creates the two destinations; the console measurement
     * then reads a tree that holds them, and writes nothing itself; the second
     * write measures that same tree again. Each case below reads the step it
     * is about, and every step sees exactly the tree it would have seen in a
     * copy of its own.
     */
    let firstWrite: CodometerRun;
    let remeasured: CodometerReport;
    let rewritten: CodometerReport;

    beforeAll(() => {
      withCorpusCopy((directory) => {
        const configuration = exampleConfiguration(
          "output",
          "self-excluded.config.ts",
        );
        const write = (): CodometerRun =>
          runCodometer(
            ["--config", configuration, "--output-json", "--output-markdown"],
            directory,
          );

        firstWrite = write();
        // Asking for the report on the console is `--format json`, which names
        // no destination and so cannot drop the configured pair.
        remeasured = measure(["--config", configuration], directory);
        write();
        rewritten = JSON.parse(
          fs.readFileSync(
            path.join(directory, "codometer-report.json"),
            "utf8",
          ),
        ) as CodometerReport;
      });
    });

    it("leaves its own destinations out of the tree it measured", () => {
      // Twice: the first run created the two destinations, the second measured
      // a tree that already held them. Two files were written into the measured
      // directory, and the counts are exactly what they were before either
      // existed.
      expect(readTarget(rewritten, "codebase").files).toBe(28);
      expect(readMetric(rewritten, "codebase", "markdown.files")).toBe(1);
      expect(readMetric(rewritten, "codebase", "json.files")).toBe(1);
    });

    it("measures the same tree whether or not the report was asked for", () => {
      // The two files stay excluded and the count is the one the write run
      // reported.
      expect(readTarget(remeasured, "codebase").files).toBe(28);
    });

    it("says on the console what it left out", () => {
      expect(firstWrite.standardError).toContain("statistics.md");
    });
  });

  describe("false staleness", () => {
    it("reports a report as stale when only a compressed size differs", () => {
      withCorpusCopy((directory) => {
        const configuration = exampleConfiguration(
          "staleness",
          "codometer.config.ts",
        );
        const reportPath = path.join(directory, "codometer-report.json");

        runCodometer(["--config", configuration, "--output-json"], directory);

        expect(
          runCodometer(
            ["--config", configuration, "--check", "reports"],
            directory,
          ).exitCode,
        ).toBe(0);

        // Stand in for a Node release whose bundled zlib compresses differently.
        // Nothing in the measured tree changes.
        const written = JSON.parse(
          fs.readFileSync(reportPath, "utf8"),
        ) as CodometerReport;

        for (const target of written.targets) {
          for (const metric of target.metrics) {
            if (metric.path === "size") {
              metric.value += 1;
            }
          }
        }

        fs.writeFileSync(reportPath, JSON.stringify(written, null, 2));

        const stale = runCodometer(
          ["--config", configuration, "--check", "reports"],
          directory,
        );

        expect(stale.exitCode).toBe(1);
        expect(stale.standardError).toContain("Found stale reports");
      });
    });
  });
});
