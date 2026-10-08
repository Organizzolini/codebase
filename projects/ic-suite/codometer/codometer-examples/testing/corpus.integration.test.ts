import { beforeAll, describe, expect, it } from "vitest";

import {
  type CodometerReport,
  corpusDirectory,
  exampleConfiguration,
  measure,
  packageDirectory,
  readCounters,
  readMetric,
  readTarget,
  runCodometer,
} from "./codometer.js";

/**
 * The counts every guide in this package quotes.
 *
 * A guide saying "the corpus holds four service files" is only worth reading if
 * the tool agrees, so each stated number is asserted here against a real run.
 * What is deliberately absent is as important: line counts and byte sizes are
 * checked as ranges rather than literals, because they move whenever a sample
 * gains a comment, and a test that pinned them would fail for reasons no reader
 * cares about.
 */

/**
 * The corpus measured once, with the package's own configuration.
 *
 * Every bare run finds that configuration, and every test below reads the same
 * report from it — so it is measured once rather than once per assertion. Each
 * spawn bootstraps Nest and reaches a Python interpreter, and eight of them
 * for one unchanging directory is the difference between a suite that is slow
 * and one that is slow enough to fail on a loaded machine.
 */
let corpusReport: CodometerReport;

describe("the sample corpus and the counts its guides quote", () => {
  beforeAll(() => {
    corpusReport = measure([], corpusDirectory);
  });

  describe("the sample corpus", () => {
    it("holds twenty-eight files across twelve language folders", () => {
      const report = corpusReport;
      const codebase = readTarget(report, "codebase");

      // Twenty-seven samples and the `.gitignore` that hides `generated/` from
      // this target — a dot file discovery walks into and counts like any other.
      expect(codebase.files).toBe(28);
      expect(codebase.empty).toBe(false);
      expect(readMetric(report, "codebase", "folders")).toBe(12);
      expect(readMetric(report, "codebase", "sourceFiles")).toBe(18);
    });

    it("counts one file per language, and fifteen TypeScript ones", () => {
      const report = corpusReport;
      const fileCounts = Object.fromEntries(
        [
          "css",
          "hcl",
          "javascript",
          "json",
          "jupyter",
          "markdown",
          "python",
          "shell",
          "sql",
          "toml",
          "typescript",
          "yaml",
        ].map((language) => [
          language,
          readMetric(report, "codebase", `${language}.files`),
        ]),
      );

      expect(fileCounts).toStrictEqual({
        css: 1,
        hcl: 1,
        javascript: 2,
        json: 1,
        jupyter: 1,
        markdown: 1,
        python: 1,
        shell: 1,
        sql: 1,
        toml: 1,
        typescript: 15,
        yaml: 1,
      });
    });

    it("counts TypeScript and JavaScript declarations in one group", () => {
      const report = corpusReport;

      // Five classes: four in TypeScript and one in JavaScript. The group is
      // "TypeScript & JavaScript" rather than two, which is why a TypeScript
      // class is found under `javascript.classes` and not `typescript.classes`.
      expect(readMetric(report, "codebase", "javascript.classes")).toBe(5);
      expect(readMetric(report, "codebase", "typescript.interfaces")).toBe(6);
      expect(readMetric(report, "codebase", "typescript.enums")).toBe(1);
      expect(readMetric(report, "codebase", "javascript.testFiles")).toBe(7);
    });

    it("measures one directory, not the compiled output beside it", () => {
      const report = corpusReport;

      // The two stand-ins for build output live in `compiled/`, a sibling of
      // the corpus, so the codebase target never sees them and only the two
      // JavaScript samples inside the corpus are counted. What happens when
      // they are copied into the corpus's ignored `generated/` folder is
      // asserted in examples.integration.test.ts, under "targets".
      expect(readMetric(report, "codebase", "javascript.files")).toBe(2);
    });

    it("excludes dot files from a target unless a glob spells one out", () => {
      // This package's own configuration gates a `Corpus` target declared as
      // `corpus/**`. It holds the 27 samples and not the `.gitignore` beside
      // them, while the codebase target above counts all 28.
      const report = measure([], packageDirectory);

      expect(readTarget(report, "Corpus").files).toBe(27);
    });

    it("measures a few hundred lines and a few kilobytes", () => {
      const report = corpusReport;

      expect(readMetric(report, "codebase", "linesOfCode")).toBeGreaterThan(
        250,
      );
      expect(readMetric(report, "codebase", "repositoryBytes")).toBeGreaterThan(
        10_000,
      );
    });
  });

  describe("notebooks measured by composition", () => {
    it("hands the envelope, the code cells, and the prose to three analyzers", () => {
      const report = corpusReport;
      const readJupyter = (metric: string): number =>
        readMetric(report, "codebase", `jupyter.${metric}`);

      // The notebook analyzer's own share: cells, executions, outputs.
      expect(readJupyter("files")).toBe(1);
      expect(readJupyter("cells")).toBe(5);
      expect(readJupyter("codeCells")).toBe(3);
      expect(readJupyter("markdownCells")).toBe(2);
      expect(readJupyter("executedCells")).toBe(3);
      expect(readJupyter("outputs")).toBe(2);

      // The JSON analyzer's share, over the envelope: the notebook is a JSON
      // document, so its node count and depth come from the same parser that
      // measures `corpus/json/catalog.json`.
      expect(readJupyter("totalNodes")).toBe(74);
      expect(readJupyter("maxDepth")).toBe(8);

      // The Python analyzer's share, over the code cells.
      expect(readJupyter("classes")).toBe(1);
      expect(readJupyter("functions")).toBe(1);
      expect(readJupyter("codeLines")).toBe(18);

      // The markdown analyzer's share, over the markdown cells.
      expect(readJupyter("headings")).toBe(2);
      expect(readJupyter("links")).toBe(1);
      expect(readJupyter("markdownLines")).toBe(8);
    });

    it("keeps the notebook out of the JSON, Python, and markdown file counts", () => {
      const report = corpusReport;

      // Composition is about what is counted, not where it is filed: the
      // notebook's contents reach three analyzers, and the notebook itself is
      // still one Jupyter file rather than also a JSON one.
      expect(readMetric(report, "codebase", "json.files")).toBe(1);
      expect(readMetric(report, "codebase", "python.files")).toBe(1);
      expect(readMetric(report, "codebase", "markdown.files")).toBe(1);
    });
  });

  describe("python through an interpreter", () => {
    it("analyzes the sample module through the configured interpreter", () => {
      const report = corpusReport;
      const readPython = (metric: string): number =>
        readMetric(report, "codebase", `python.${metric}`);

      // Non-zero at all is the assertion that matters: Python analysis runs
      // through an interpreter, so `python: { command: "uv run python" }` being
      // wrong reads as a repository with no Python in it.
      expect(readPython("classes")).toBe(3);
      expect(readPython("functions")).toBe(4);
      expect(readPython("protocols")).toBe(1);
      expect(readPython("docstrings")).toBe(8);
      expect(readPython("decorators")).toBe(2);
    });

    it("agrees with the default interpreter where python3 is adequate", () => {
      const named = measure(
        ["--config", exampleConfiguration("python", "uv.config.ts")],
        corpusDirectory,
      );
      const byDefault = measure(
        [
          "--config",
          exampleConfiguration("python", "default-interpreter.config.ts"),
        ],
        corpusDirectory,
      );
      const readPython = (
        report: ReturnType<typeof measure>,
      ): Record<string, number> =>
        Object.fromEntries(
          ["classes", "docstrings", "files", "functions", "protocols"].map(
            (metric) => [
              metric,
              readMetric(report, "codebase", `python.${metric}`),
            ],
          ),
        );

      // Naming the interpreter is what stops the numbers being a property of
      // whichever machine the run happened on — not a different measurement
      // where the default happens to be adequate.
      expect(readPython(byDefault)).toStrictEqual(readPython(named));
    });

    it("reports a corpus with no Python when the interpreter is unreachable", () => {
      const run = runCodometer(
        [
          "--config",
          exampleConfiguration("python", "unreachable-interpreter.config.ts"),
          "--format",
          "json",
        ],
        corpusDirectory,
      );
      const report = JSON.parse(run.standardOutput) as ReturnType<
        typeof measure
      >;

      // Not an error — a warning, a clean exit, and a report that describes a
      // repository with no Python in it.
      expect(run.exitCode).toBe(0);
      expect(run.standardError).toContain("Skipped Python analysis");
      expect(readMetric(report, "codebase", "python.files")).toBe(0);
      expect(readMetric(report, "codebase", "python.classes")).toBe(0);

      // Composition means the missing interpreter takes a slice out of the
      // notebook too: its cells survive, its Python declarations do not.
      expect(readMetric(report, "codebase", "jupyter.cells")).toBe(5);
      expect(readMetric(report, "codebase", "jupyter.markdownCells")).toBe(2);
      expect(readMetric(report, "codebase", "jupyter.classes")).toBe(0);
      expect(readMetric(report, "codebase", "jupyter.functions")).toBe(0);
    });
  });

  describe("custom statistics", () => {
    let counters: Record<string, number>;

    beforeAll(() => {
      counters = readCounters(
        measure(
          [
            "--config",
            exampleConfiguration("statistics", "codometer.config.ts"),
          ],
          corpusDirectory,
        ),
      );
    });

    it("counts files by pattern and declarations by shape", () => {
      expect(counters).toStrictEqual({
        "Exported Interfaces": 6,
        "Integration Tests": 1,
        "Service Files": 4,
        "Service Static Methods": 3,
        "Static Methods": 4,
        "Static Properties": 1,
        "Unit Tests": 6,
      });
    });

    it("narrows a symbol counter with patterns rather than counting files", () => {
      // Four static methods exist; three are in `*.service.ts`. The narrowed
      // counter reports three rather than the four service files it was pointed
      // at, which is the whole distinction between the two kinds of counter.
      expect(counters["Service Static Methods"]).toBe(3);
      expect(counters["Static Methods"]).toBe(4);
      expect(counters["Service Files"]).toBe(4);
    });

    it("does not find a static arrow property by asking for static methods", () => {
      // `CatalogService.blank` is a class field holding an arrow function, so it
      // is a static property and carries none of a method's modifiers.
      expect(counters["Static Properties"]).toBe(1);
    });
  });
});
