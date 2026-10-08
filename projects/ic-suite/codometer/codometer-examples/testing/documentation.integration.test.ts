import { beforeAll, describe, expect, it } from "vitest";

import {
  type CodometerReport,
  gateAndMeasureExample,
  type GatedMeasurement,
  measureExample,
  readMetric,
  readMetricInstances,
} from "./codometer.js";

/**
 * The `documentation` examples: comment budgets, measured and gated.
 *
 * Each configuration is run once and every case reads that one run. Where a
 * guide quotes both the numbers a configuration reports and the exit code it
 * gates on, the gating run prints its report too, so one spawn answers both.
 */

describe("every example configuration this package ships", () => {
  describe("documentation limits", () => {
    let documentation: GatedMeasurement;
    let yamlComments: GatedMeasurement;
    let commentsReport: CodometerReport;

    beforeAll(() => {
      documentation = gateAndMeasureExample(
        "documentation",
        "codometer.config.ts",
      );
      yamlComments = gateAndMeasureExample(
        "documentation",
        "yaml-comments.config.ts",
      );
      commentsReport = measureExample("documentation", "comments.config.ts");
    });

    it("counts the declarations of each kind that breach their own budget", () => {
      const { report } = documentation;

      // Only the class and method counters find a breach — one instance each,
      // named by file, line, and measured length. A counter that holds is
      // still measured, just at zero.
      expect(
        readMetricInstances(report, "codebase", "custom.Class Comment Budget"),
      ).toStrictEqual([
        { file: "typescript/catalog.service.ts", line: 18, measured: 8 },
      ]);
      expect(
        readMetricInstances(report, "codebase", "custom.Method Comment Budget"),
      ).toStrictEqual([
        { file: "javascript/receipt.js", line: 12, measured: 7 },
      ]);
      expect(
        readMetric(report, "codebase", "custom.Interface Comment Budget"),
      ).toBe(0);
      expect(
        readMetric(report, "codebase", "custom.Property Comment Budget"),
      ).toBe(0);
    });

    it("is gated by the same flag every other limit is", () => {
      expect(documentation.run.exitCode).toBe(1);
    });

    it("measures a YAML comment block through the same channel", () => {
      const { report } = yamlComments;

      // One block, the note above `pipeline.yaml`'s anchor, carrying two
      // maxima. One line against a maximum of one holds; twelve words against
      // a maximum of five breaches — so the counter reports one breach, at
      // whichever measurement broke its budget, not one entry per maximum.
      expect(
        readMetricInstances(report, "codebase", "custom.YAML Comment Budget"),
      ).toStrictEqual([{ file: "yaml/pipeline.yaml", line: 2, measured: 12 }]);
    });

    it("measures every language, and honours a language override", () => {
      const report = commentsReport;
      const readInstances = (
        label: string,
      ): CodometerReport["targets"][number]["metrics"][number]["instances"] =>
        readMetricInstances(report, "codebase", `custom.${label}`);

      // Every non-JSDoc block in the corpus breaches its own language's
      // three-word budget, except shell's second block, which holds under the
      // eight-word override — so it is absent rather than listed as a breach.
      expect(readInstances("CSS Comment Budget")).toStrictEqual([
        { file: "css/theme.css", line: 1, measured: 12 },
      ]);
      expect(readInstances("HCL Comment Budget")).toStrictEqual([
        { file: "hcl/network.tf", line: 1, measured: 12 },
      ]);
      expect(readInstances("Python Comment Budget")).toStrictEqual([
        { file: "python/inventory.py", line: 7, measured: 10 },
      ]);
      // Line 2, not line 1: a `#!` shebang is never a comment. Only this
      // block breaches the loosened eight-word budget — the second block, at
      // line 8, measures six and holds.
      expect(readInstances("Shell Comment Budget")).toStrictEqual([
        { file: "shell/release.sh", line: 2, measured: 11 },
      ]);
      expect(readInstances("SQL Comment Budget")).toStrictEqual([
        { file: "sql/reporting.sql", line: 1, measured: 7 },
      ]);
      expect(readInstances("TOML Comment Budget")).toStrictEqual([
        { file: "toml/service.toml", line: 1, measured: 5 },
      ]);
      expect(readInstances("YAML Comment Budget")).toStrictEqual([
        { file: "yaml/pipeline.yaml", line: 2, measured: 12 },
      ]);
    });

    it("never measures a JSDoc comment through a plain-language channel", () => {
      // The corpus's TypeScript and JavaScript sources carry only JSDoc
      // comments, and a `comment` selector naming no `kind` skips exactly
      // those — `codometer.config.ts`'s `kind`-based counters measure them
      // instead. The TypeScript counter here finds nothing at all.
      const report = commentsReport;

      expect(
        readMetric(report, "codebase", "custom.TypeScript Comment Budget"),
      ).toBe(0);
    });

    it("gates a YAML comment breach the same way", () => {
      expect(yamlComments.run.exitCode).toBe(1);
    });
  });
});
