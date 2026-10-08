import { describe, expect, it } from "vitest";

import {
  corpusDirectory,
  exampleConfiguration,
  gateAndMeasureExample,
  gateExample,
  readTarget,
  runCodometer,
} from "./codometer.js";

/**
 * The `limits` examples that decide whether a run fails: severity, the gate
 * flag, and an input that matched nothing.
 *
 * The examples that decide what a limit's path and value mean — and the
 * refusals when they mean nothing — are in `limit-paths.integration.test.ts`.
 */

describe("every example configuration this package ships", () => {
  describe("limits", () => {
    it("prints a warning breach without changing the exit code", () => {
      const run = gateExample("limits", "warn.config.ts");

      expect(run.exitCode).toBe(0);
      expect(run.standardError).toContain("Breached a warning limit");
    });

    it("fails on a breach at the default severity, reporting both limits", () => {
      const run = gateExample("limits", "fail.config.ts");

      expect(run.exitCode).toBe(1);
      expect(run.standardError).toContain("Breached a failing limit");
      expect(run.standardError).toContain("Breached a warning limit");
    });

    it("reports a breach without failing when nothing asked for a gate", () => {
      const run = runCodometer(
        ["--config", exampleConfiguration("limits", "fail.config.ts")],
        corpusDirectory,
      );

      // A breach is a finding; only `--check limits` turns a finding into a gate.
      expect(run.exitCode).toBe(0);
      expect(run.standardError).toContain("Breached a failing limit");
    });

    it("fails an empty target if and only if a limit is written against it", () => {
      const limited = gateExample("limits", "empty-target-limited.config.ts");
      const unlimited = gateAndMeasureExample(
        "limits",
        "empty-target-unlimited.config.ts",
      );

      expect(limited.exitCode).toBe(1);
      expect(limited.standardError).toContain("matched no files");
      expect(unlimited.run.exitCode).toBe(0);
      // Said outright rather than left to be inferred from a size of zero.
      expect(readTarget(unlimited.report, "Never Built").empty).toBe(true);
    });
  });
});
