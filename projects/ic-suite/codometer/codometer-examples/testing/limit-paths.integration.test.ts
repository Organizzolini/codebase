import { describe, expect, it } from "vitest";

import {
  gateAndMeasureExample,
  gateExample,
  measureExample,
  readMetric,
  readMetricLimits,
} from "./codometer.js";

/**
 * The `limits` examples that decide what a limit's path and value mean, and
 * the refusal each prints when they mean nothing.
 *
 * Each refusal is reproduced with the sentence both guides quote, so a message
 * that changes wording fails here. The examples deciding whether a run fails
 * at all are in `limits.integration.test.ts`.
 */

describe("every example configuration this package ships", () => {
  describe("limits", () => {
    it("refuses an ambiguous path, naming both readings", () => {
      const run = gateExample("limits", "ambiguous.config.ts");

      expect(run.exitCode).toBe(1);
      expect(run.standardError).toContain(
        String.raw`it could be the \"markdown\" target's \"files\" metric`,
      );
    });

    it("refuses an unprefixed path even where only one target was measured", () => {
      const run = gateExample("limits", "unprefixed.config.ts");

      expect(run.exitCode).toBe(1);
      // The exact sentence both guides quote. `linesOfCode` is real, spelled
      // correctly, and on the only target measured — and still binds to
      // nothing, because no `defaultInput` says which target it belongs to.
      expect(run.standardError).toContain(
        String.raw`Cannot bind the limit written against \"linesOfCode\": nothing measured answers to it.`,
      );
      expect(run.standardError).toContain(
        "Write the target's name in front of the metric path, or configure a default input.",
      );
    });

    it("refuses a path naming nothing, and one naming an analysis never run", () => {
      const run = gateExample("limits", "unbound.config.ts");

      expect(run.exitCode).toBe(1);
      // Both failures are collected and reported together rather than one run at
      // a time.
      expect(run.standardError).toContain("nowhere.at.all");
      expect(run.standardError).toContain("Compiled.typescript.files");
    });

    it("reads an unprefixed path as the default input's", () => {
      const { report, run } = gateAndMeasureExample(
        "limits",
        "default-target.config.ts",
      );

      expect(run.exitCode).toBe(0);
      expect(report.failures).toStrictEqual([]);
      // `typescript.interfaces` bound to the codebase's six, not to the target
      // also called `typescript`.
      expect(readMetric(report, "codebase", "typescript.interfaces")).toBe(6);
    });

    it("reads a decimal unit, and refuses one it cannot read", () => {
      const report = measureExample("limits", "units.config.ts");
      const limits = readMetricLimits(report, "Corpus", "size");
      const refused = gateExample("limits", "unreadable-unit.config.ts");

      // "8 KB" is 8000 bytes and "1 MB" is 1000000 — decimal, not binary.
      expect(limits.map((limit) => limit.value)).toStrictEqual([
        8000, 1_000_000,
      ]);
      expect(refused.exitCode).toBe(1);
      expect(refused.standardError).toContain(
        String.raw`so \"8 K\" is not a size`,
      );
    });
  });
});
