import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  createFixtureTree,
  removeFixtureTree,
} from "../../../testing/fixture-tree";
import { MainModule } from "../../main.module";

import { MeasureCommand } from "./measure.command";

import type { CodometerReport } from "@codometer/core";

const REPORT_FILE_NAME = "codometer-report.json";

/**
 * A long comment codometer-configured (see below) to breach a
 * `comment`-selector custom statistic's word budget.
 */
const LONG_YAML_COMMENT = [
  "# This comment runs on for far more words than the configured budget",
  "# allows, so the comment-selector custom statistic below counts it as a",
  "# breach and records exactly where it was found.",
].join("\n");

describe("measure command over a fixture directory", () => {
  let metrics: Map<string, number>;
  let firstReport: string;
  let secondReport: string;
  let firstReadme: string;
  let secondReadme: string;
  let workingDirectory: string;
  let originalWorkingDirectory: string;

  /** Runs the measure command with the process rooted at the fixture tree. */
  async function run(options: Parameters<MeasureCommand["run"]>[1]): Promise<{
    exitCode: number;
  }> {
    process.chdir(workingDirectory);
    process.exitCode = 0;

    const module = await Test.createTestingModule({
      imports: [MainModule],
    }).compile();
    const command = module.get(MeasureCommand, { strict: false });

    await command.run([], options);

    const exitCode = process.exitCode;

    process.exitCode = 0;
    process.chdir(originalWorkingDirectory);

    return {
      exitCode: typeof exitCode === "string" ? Number(exitCode) : exitCode,
    };
  }

  beforeAll(async () => {
    originalWorkingDirectory = process.cwd();
    workingDirectory = createFixtureTree();

    // The fixture is not a git repository and never becomes one. Discovery
    // that shelled out to `git ls-files` could not measure it at all.
    writeFileSync(
      path.join(workingDirectory, "codometer.config.json"),
      JSON.stringify({
        custom: [
          {
            color: "dc2626",
            comment: {
              language: "yaml",
              maximumWords: 10,
              severity: "fail",
            },
            group: "conventions",
            label: "Overlong YAML Comments",
          },
        ],
        excludeFrom: [".codometerignore"],
        format: "json",
        limits: [
          { metric: "codebase.custom.Overlong YAML Comments", value: 0 },
        ],
        outputs: [
          {
            custom: ["Overlong YAML Comments"],
            path: REPORT_FILE_NAME,
            type: "json",
          },
          {
            path: "README.md",
            type: "markdown",
          },
        ],
      }),
    );
    writeFileSync(
      path.join(workingDirectory, "src/values.yaml"),
      `${LONG_YAML_COMMENT}\nname: fixture\n`,
    );

    const readmePath = path.join(workingDirectory, "README.md");
    const reportPath = path.join(workingDirectory, REPORT_FILE_NAME);

    await run({ outputJson: true, outputMarkdown: true });

    firstReport = readFileSync(reportPath, "utf8");
    firstReadme = readFileSync(readmePath, "utf8");

    // Everything the first run wrote is now on disk. A tool that measured its
    // own output would count the badges it just wrote and produce a different
    // document the second time round.
    await run({ outputJson: true, outputMarkdown: true });

    secondReport = readFileSync(reportPath, "utf8");
    secondReadme = readFileSync(readmePath, "utf8");

    const report = JSON.parse(firstReport) as CodometerReport;
    const codebase = report.targets.find(
      (target) => target.name === "codebase",
    );

    metrics = new Map(
      codebase?.metrics.map((metric) => [metric.path, metric.value]),
    );
  }, 60_000);

  afterAll(() => {
    removeFixtureTree(workingDirectory);
  });

  it("measures the files discovery kept", () => {
    expect.hasAssertions();

    // Four TypeScript files survive: nested/deep/deeper.ts, the one under the
    // `redistribute` directory a `dist` glob must not claim, and the two under
    // src. `nested/generated/thing.ts`, `build/output.js`, `vendor/vendored.ts`
    // and `node_modules/library/index.ts` are all gone.
    expect(metrics.get("typescript.files")).toBe(4);
    expect(metrics.get("javascript.files")).toBe(1);
    expect(metrics.get("javascript.testFiles")).toBe(1);
    expect(metrics.get("sourceFiles")).toBe(5);
  });

  it("applies the configured ignore file and the nested gitignore files", () => {
    expect.hasAssertions();

    // `AGENTS.md` and `nested/keep.md`. `README.md` is the file the badge
    // block is spliced into, so codometer leaves it out without being told;
    // `nested/drop.md` is claimed by the nested gitignore file, and
    // `CLAUDE.md` is a symlink to `AGENTS.md` rather than a document.
    expect(metrics.get("markdown.files")).toBe(2);
    // The fixture's own `codometer.config.json` and `src/data.json`. The
    // report codometer writes beside them is its own output and is never
    // measured, and the notebook is measured as a notebook rather than JSON.
    expect(metrics.get("json.files")).toBe(2);
    expect(metrics.get("jupyter.files")).toBe(1);
  });

  it("measures every other language it discovered", () => {
    expect.hasAssertions();

    expect(metrics.get("css.files")).toBe(1);
    expect(metrics.get("hcl.files")).toBe(1);
    expect(metrics.get("shell.files")).toBe(1);
    expect(metrics.get("sql.files")).toBe(1);
    expect(metrics.get("toml.files")).toBe(1);
    expect(metrics.get("yaml.files")).toBe(1);
  });

  it("names every metric by the input it was measured on", () => {
    const report = JSON.parse(firstReport) as CodometerReport;
    const codebase = report.targets.find(
      (target) => target.name === "codebase",
    );

    expect(codebase?.empty).toBe(false);
    expect(
      codebase?.metrics.find((metric) => metric.path === "typescript.files"),
    ).toStrictEqual({
      instances: null,
      limits: [],
      name: "codebase.typescript.files",
      path: "typescript.files",
      unit: null,
      value: 4,
    });
  });

  // A `comment`-selector custom statistic counts real breaches from real
  // source files, with `instances` populated — spec user story 16 — and an
  // ordinary `limits[]` entry gates it exactly like any other custom
  // statistic, with no new shape added to `limits`.
  it("counts a real comment-selector breach, with a traceable instance", () => {
    const report = JSON.parse(firstReport) as CodometerReport;
    const codebase = report.targets.find(
      (target) => target.name === "codebase",
    );
    const metric = codebase?.metrics.find(
      (candidate) => candidate.path === "custom.Overlong YAML Comments",
    );

    expect(metric?.value).toBe(1);
    expect(metric?.limits).toStrictEqual([
      { breached: true, label: null, severity: "fail", value: 0 },
    ]);
    // The instance itself — file and line — is what lets a maintainer find
    // the breaching comment rather than only knowing one exists.
    expect(metric?.instances).toStrictEqual([
      {
        file: expect.stringContaining("src/values.yaml") as string,
        line: 1,
        measured: expect.any(Number) as number,
      },
    ]);
  });

  // The property the auto-exclusion exists for. Badges are images with links,
  // so a spliced block changes the markdown counters, which changes the
  // badges: measuring its own output makes every written report stale the
  // moment it lands.
  it("produces byte-identical output on two consecutive runs", () => {
    expect.hasAssertions();

    expect(secondReadme).toBe(firstReadme);
    expect(secondReport).toBe(firstReport);
  });

  it("spliced the badge block into the file it was pointed at", () => {
    expect(firstReadme).toContain("<!-- codometer:start -->");
    expect(firstReadme).toContain("![Lines of Code]");
    expect(firstReadme).not.toContain("\nold\n");
  });

  it("fails the run when --check limits sees the breach", async () => {
    const { exitCode } = await run({ check: "limits", outputJson: true });

    expect(exitCode).toBe(1);
  });

  it("passes a bare run gating nothing, even with the same breach", async () => {
    const { exitCode } = await run({ outputJson: true });

    expect(exitCode).toBe(0);
  });

  // `--inputs` replaces every configured input, not a filter narrowing it —
  // the built-in `codebase` input is not active either.
  it("--inputs measures exactly the given globs, with no configured input active", async () => {
    await run({ inputs: ["src/**/*.ts"], outputJson: true });

    const report = JSON.parse(
      readFileSync(path.join(workingDirectory, REPORT_FILE_NAME), "utf8"),
    ) as CodometerReport;

    expect(report.targets).toHaveLength(1);
    expect(report.targets[0]?.name).toBe("Command Line");
    // Both `src/app.ts` and its own `.unit.test.ts` match the glob.
    expect(
      report.targets[0]?.metrics.find(
        (metric) => metric.path === "typescript.files",
      )?.value,
    ).toBe(2);
  });

  // The reviewer-found defect: `MeasureService.measure()` used to derive the
  // headline `MeasurementResult.statistics` — what the console and markdown
  // badges render from — by looking up an input literally named "codebase".
  // `--inputs` never leaves an input by that name active, so every badge
  // reported zero for a run that genuinely measured real files. The JSON
  // report's own per-input metrics (asserted above) were never affected —
  // they come from `MetricIndexService`, not from the headline field — so
  // this has to be checked against what actually reads the headline: the
  // markdown badge block printed to standard output.
  it("--inputs produces real, non-zero headline statistics for the console badges, not a name lookup that misses", async () => {
    const standardOutput = vi
      .spyOn(process.stdout, "write")
      .mockReturnValue(true);

    await run({
      format: "markdown",
      inputs: ["src/**/*.ts"],
      outputJson: true,
    });

    const report = JSON.parse(
      readFileSync(path.join(workingDirectory, REPORT_FILE_NAME), "utf8"),
    ) as CodometerReport;
    const linesOfCode = report.targets[0]?.metrics.find(
      (metric) => metric.path === "linesOfCode",
    )?.value;

    expect(linesOfCode).toBeGreaterThan(0);

    const printed = standardOutput.mock.calls
      .map(([chunk]) => String(chunk))
      .join("");

    expect(printed).toContain(`Lines_of_Code-${linesOfCode}-`);

    standardOutput.mockRestore();
  });

  // The refusal a run has no way to have produced a destination for, before
  // anything is measured. Last in this file: it rewrites the fixture's own
  // configuration to a bare one naming no output at all.
  it("refuses a bare --output-markdown with no configured markdown output", async () => {
    writeFileSync(
      path.join(workingDirectory, "codometer.config.json"),
      JSON.stringify({ format: "json" }),
    );

    const { exitCode } = await run({ outputMarkdown: true });

    expect(exitCode).toBe(1);
  });
});
