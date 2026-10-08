import fs from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  type CodometerReport,
  corpusDirectory,
  exampleConfiguration,
  measure,
  measureExample,
  readMetric,
  readTarget,
  withCorpusCopy,
} from "./codometer.js";

/**
 * Every example configuration this package ships, run the way its guide says.
 *
 * The refusals matter most. They are where codometer is opinionated and where
 * a reader gets stuck, so each one is reproduced with the exit code and the
 * sentence the tool actually prints — a message that changes wording is a
 * guide that has drifted, and this is what notices.
 *
 * The examples are spread across this file and the suites beside it, one per
 * guide or two, because each spawn of the command line is its own process and
 * separate files are what the test runner runs in parallel. This one holds
 * targets, compression, and configuration discovery; `limits`,
 * `documentation`, `write-check`, `output`, and `written-reports` hold the
 * rest.
 */

describe("every example configuration this package ships", () => {
  describe("targets", () => {
    let targetsReport: CodometerReport;

    beforeAll(() => {
      targetsReport = measureExample("targets", "codometer.config.ts");
    });

    it("measures compiled output sitting beside the corpus", () => {
      const report = targetsReport;

      // The codebase target measures one directory and the compiled samples
      // are not in it; a target's globs reach out to them.
      expect(readTarget(report, "codebase").files).toBe(28);
      expect(readTarget(report, "Compiled").files).toBe(2);
    });

    it("reaches the files the codebase target's ignore rules hide", () => {
      withCorpusCopy((directory) => {
        // `corpus/.gitignore` names `generated/`. Fill it, exactly as the
        // example's own instructions say to.
        fs.cpSync(
          path.join(corpusDirectory, "..", "compiled"),
          path.join(directory, "generated"),
          { recursive: true },
        );

        const report = measure(
          ["--config", exampleConfiguration("targets", "ignored.config.ts")],
          directory,
        );

        // Still 28: discovery reads the ignore file itself rather than
        // invoking git, so the two copied files are invisible to it.
        expect(readTarget(report, "codebase").files).toBe(28);
        // And visible to a declared target, which is the whole point.
        expect(readTarget(report, "Ignored Output").files).toBe(2);
      });
    });

    it("removes files with a negation and with exclude alike", () => {
      const report = targetsReport;

      expect(readTarget(report, "Compiled Without Vendor").files).toBe(1);
      // Fifteen TypeScript files, seven of them tests.
      expect(readTarget(report, "Sources").files).toBe(8);
    });

    it("starts a target's globs somewhere else with directory", () => {
      const report = targetsReport;

      // `directory: ".."` reaches up out of the measured corpus into the package.
      expect(readTarget(report, "Manifests").files).toBe(2);
    });

    it("holds the same files however the include array is ordered", () => {
      const ordered = targetsReport;
      const reordered = measureExample("targets", "reordered.config.ts");
      const describeTargets = (
        report: CodometerReport,
      ): Record<string, number> =>
        Object.fromEntries(
          report.targets.map((target) => [target.name, target.files]),
        );

      // Negations form one set applied to the whole target rather than being read
      // in order, so writing the `!` first cannot change what the target holds.
      expect(describeTargets(reordered)).toStrictEqual(
        describeTargets(ordered),
      );
    });
  });

  describe("compression", () => {
    it("compresses each file on its own, and gzip beats nothing", () => {
      const readSize = (configuration: string): number =>
        readMetric(
          measureExample("compression", configuration),
          "Compiled",
          "size",
        );
      const uncompressed = readSize("none.config.ts");
      const gzip = readSize("gzip.config.ts");
      const brotli = readSize("brotli.config.ts");

      expect(gzip).toBeLessThan(uncompressed);
      expect(brotli).toBeLessThan(gzip);
      // Two files summed, not one archive of both: the sum of the parts is what a
      // browser pays, file by file over the wire.
      expect(uncompressed).toBeGreaterThan(1000);
    });
  });

  describe("configuration discovery", () => {
    it("takes the first configuration found walking upward", () => {
      const nested = measure([], exampleConfiguration("discovery", "nested"));
      const counters = readTarget(nested, "codebase").metrics.filter((metric) =>
        metric.path.startsWith("custom."),
      );

      // Only the nested file's counter. Nothing from the package's configuration
      // above it, and nothing from the workspace root's above that.
      expect(counters.map((metric) => metric.path)).toStrictEqual([
        "custom.Configurations",
      ]);
    });

    it("continues upward from a folder carrying no configuration", () => {
      const parent = measure([], exampleConfiguration("discovery"));
      const counters = readTarget(parent, "codebase").metrics.filter((metric) =>
        metric.path.startsWith("custom."),
      );

      // The package's own configuration — conventions and all — is what
      // answers. Nothing here is a function of which folder was measured, so
      // its own "Corpus" input is resolved too, and reported as a failure
      // rather than gating anything: this bare run neither writes nor checks,
      // and a failure fails only a run that does one of those.
      expect(counters.map((metric) => metric.path)).toStrictEqual([
        "custom.Service Files",
        "custom.Unit Tests",
        "custom.Static Methods",
      ]);
      expect(readTarget(parent, "Corpus").empty).toBe(true);
      expect(parent.failures).toHaveLength(1);
    });
  });
});
