import fs from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  type CodometerRun,
  corpusDirectory,
  exampleConfiguration,
  runCodometer,
  runPipeline,
  withCorpusCopy,
} from "./codometer.js";

/**
 * The `output` examples: where a report goes, and what a run prints where.
 */

describe("every example configuration this package ships", () => {
  describe("the output sinks", () => {
    /**
     * The bare `codometer --format json` run the guide shows, spawned once.
     *
     * Reading its standard output directly and piping it into a second process
     * are two assertions about the same run, so they share it.
     */
    let consoleRun: CodometerRun;

    beforeAll(() => {
      consoleRun = runCodometer(["--format", "json"], corpusDirectory);
    });

    it("carries the report on standard output and diagnostics on standard error", () => {
      const run = consoleRun;

      // The assertion is that this parses at all: a log line sharing the stream
      // would break every `codometer --format json > report.json` pipeline.
      expect(() => JSON.parse(run.standardOutput) as unknown).not.toThrow();
      expect(run.standardError).toContain("Finished the measurement run");
    });

    it("writes the badge block where --output-markdown named a path", () => {
      withCorpusCopy((directory) => {
        const run = runCodometer(
          [
            "--config",
            exampleConfiguration("output", "codometer.config.ts"),
            "--output-markdown",
            "document.md",
          ],
          directory,
        );
        const written = fs.readFileSync(
          path.join(directory, "document.md"),
          "utf8",
        );

        expect(run.exitCode).toBe(0);
        expect(written).toContain("img.shields.io");
        // The markers come with it, into a file that did not exist: one sink
        // serves a bare statistics page and a README with prose alike.
        expect(written).toContain("<!-- codometer:start -->");
        // And a named destination stands for all of them, so the configured
        // report is not written.
        expect(
          fs.existsSync(path.join(directory, "codometer-report.json")),
        ).toBe(false);
      });
    });

    it("carries a report through a shell pipeline that parses it", () => {
      // The `codometer --format json | …` pipeline the guide shows, for real
      // through a shell. Anything on standard output but the report — one log
      // line, one warning — breaks this outright.
      const piped = runPipeline(consoleRun, "report.targets[0].files");

      // The exit code first, so a pipeline that died under load reports which
      // half died instead of failing as a mismatched string.
      expect(piped.exitCode).toBe(0);
      expect(piped.standardOutput.trim()).toBe("28");
      // And the other half of the same promise: the diagnostics were not
      // missing, they were on the other stream the whole time.
      expect(piped.standardError).toContain("Finished the measurement run");
    });

    it("refuses a bare --output-json on a run whose configuration names none", () => {
      // A path always means a file — `--output-json <path>` writes there
      // outright, with no companion flag needed. Only the bare flag, asking
      // for wherever the configuration says to, can still be refused, and
      // only when that configuration names no "json" output to resolve one
      // from.
      const run = runCodometer(
        [
          "--config",
          exampleConfiguration("python", "uv.config.ts"),
          "--output-json",
        ],
        corpusDirectory,
      );

      expect(run.exitCode).toBe(1);
      expect(run.standardError).toContain(
        String.raw`--output-json needs a path, or a \"json\" entry in the configuration's \"outputs\" to resolve one from`,
      );
    });

    it("lets a named path write on its own, with no companion flag", () => {
      withCorpusCopy((directory) => {
        const run = runCodometer(
          [
            "--config",
            exampleConfiguration("output", "codometer.config.ts"),
            "--output-json",
            "only-this.json",
          ],
          directory,
        );

        expect(run.exitCode).toBe(0);
        expect(fs.existsSync(path.join(directory, "only-this.json"))).toBe(
          true,
        );
        // The configured markdown destination is not written: naming one sink on
        // the command line replaces the configured set rather than adding to it.
        expect(fs.existsSync(path.join(directory, "statistics.md"))).toBe(
          false,
        );
      });
    });

    it("appends the block when the markers are absent and creates the file", () => {
      withCorpusCopy((directory) => {
        const destination = path.join(directory, "statistics.md");
        const configuration = exampleConfiguration(
          "output",
          "codometer.config.ts",
        );

        runCodometer(
          ["--config", configuration, "--output-markdown"],
          directory,
        );

        const first = fs.readFileSync(destination, "utf8");

        expect(first).toContain("<!-- codometer:start -->");
        expect(first).toContain("<!-- codometer:end -->");

        runCodometer(
          ["--config", configuration, "--output-markdown"],
          directory,
        );

        // Rewritten in place rather than appended a second time.
        const second = fs.readFileSync(destination, "utf8");

        expect(second.split("<!-- codometer:start -->")).toHaveLength(2);
      });
    });

    it("splices between renamed markers", () => {
      withCorpusCopy((directory) => {
        runCodometer(
          [
            "--config",
            exampleConfiguration("output", "renamed-markers.config.ts"),
            "--output-markdown",
          ],
          directory,
        );

        const written = fs.readFileSync(
          path.join(directory, "statistics.md"),
          "utf8",
        );

        expect(written).toContain("<!-- SAMPLE_STATISTICS_START -->");
        expect(written).not.toContain("<!-- codometer:start -->");
      });
    });

    it("splices a `write` function's own content between the markers", () => {
      withCorpusCopy((directory) => {
        runCodometer(
          [
            "--config",
            exampleConfiguration("output", "custom-render.config.ts"),
            "--output-markdown",
          ],
          directory,
        );

        const written = fs.readFileSync(
          path.join(directory, "statistics.md"),
          "utf8",
        );

        // The custom line, the built-in badges beneath it, and the built-in
        // splice around both — `write` built the content itself and handed it
        // to `anchors.syncAnchoredBlock`.
        expect(written).toContain("source files");
        expect(written).toContain("img.shields.io");
        expect(written).toContain("<!-- codometer:start -->");
      });
    });

    it("lets a `write` function pick its own destination", () => {
      withCorpusCopy((directory) => {
        runCodometer(
          [
            "--config",
            exampleConfiguration("output", "custom-write.config.ts"),
            "--output-markdown",
          ],
          directory,
        );

        // The corpus holds Python, so the writer chose the other file.
        expect(fs.existsSync(path.join(directory, "polyglot.md"))).toBe(true);
        expect(fs.existsSync(path.join(directory, "statistics.md"))).toBe(
          false,
        );
        expect(
          fs.readFileSync(path.join(directory, "polyglot.md"), "utf8"),
        ).toContain("img.shields.io");
      });
    });
  });
});
