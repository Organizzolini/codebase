import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import { ChangesService } from "./changes.service";

import type {
  CodometerReport,
  MetricSeverity,
  MetricUnit,
  ReportLimit,
  ReportTarget,
} from "./changes.types";

/** Overrides for the one metric target most cases need. */
interface MetricTargetOverrides {
  breached?: boolean;
  empty?: boolean;
  label?: null | string;
  limit?: number | undefined;
  /** Written out in full when a case needs more than one limit on the metric. */
  limits?: ReportLimit[];
  name?: string;
  severity?: MetricSeverity;
  unit?: MetricUnit;
  value?: number;
}

/** Builds a target carrying a single metric. */
function buildMetricTarget(
  overrides: MetricTargetOverrides = {},
): ReportTarget {
  const {
    breached = false,
    empty = false,
    label = null,
    limit,
    name = "Compiled JavaScript",
    severity = "fail",
    unit = "bytes",
    value = 0,
  } = overrides;

  const limits =
    overrides.limits ??
    (limit === undefined ? [] : [{ breached, label, severity, value: limit }]);

  return {
    empty,
    metrics: [{ limits, name: `${name}.size`, unit, value }],
    name,
  };
}

/** Builds a report around whichever targets a case declares. */
function buildReport(targets: ReportTarget[]): CodometerReport {
  return { targets };
}

describe(ChangesService, () => {
  let service: ChangesService;
  let logger: LoggerService;
  const temporaryDirectories: string[] = [];

  /** Lays out codometer reports inside a throwaway workspace. */
  function writeWorkspace(
    reports: Record<string, CodometerReport | string>,
  ): string {
    const workingDirectory = mkdtempSync(
      path.join(tmpdir(), "codometer-changes-"),
    );
    temporaryDirectories.push(workingDirectory);

    for (const [reportPath, report] of Object.entries(reports)) {
      const absolute = path.join(workingDirectory, reportPath);
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(
        absolute,
        typeof report === "string" ? report : JSON.stringify(report),
        "utf8",
      );
    }

    return workingDirectory;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChangesService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(ChangesService);
    logger = await module.resolve(LoggerService);
  });

  afterAll(() => {
    for (const directory of temporaryDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChangesService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    await module.resolve(ChangesService);
    const freshLogger = await module.resolve(LoggerService);

    expect(freshLogger.setContext).toHaveBeenCalledWith("ChangesService");
  });

  it("logs how many reports it found on each side", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ value: 40 }),
      ]),
      "packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ value: 50 }),
      ]),
    });

    service.collect({ baselineDirectory: ".baseline", workingDirectory });

    expect(logger.debug).toHaveBeenCalledWith(
      "📂 Found the codometer reports",
      undefined,
      { baseline: 1, current: 1 },
    );
  });

  it("reads a report from every workspace directory", () => {
    const workingDirectory = writeWorkspace({
      "applications/lexico/codometer-report.json": buildReport([
        buildMetricTarget({ limit: 200, name: "Client JS", value: 100 }),
      ]),
      "codometer-report.json": buildReport([buildMetricTarget({ value: 300 })]),
      "packages/ic-suite/codometer/codometer-cli/codometer-report.json":
        buildReport([buildMetricTarget({ value: 75 })]),
      "packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ value: 50 }),
      ]),
      "tools/synchronization/codometer-report.json": buildReport([
        buildMetricTarget({ value: 25 }),
      ]),
    });

    const rows = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(rows.map((row) => row.project)).toStrictEqual([
      "lexico",
      "codebase",
      "codometer-cli",
      "logging",
      "synchronization",
    ]);
    expect(rows.every((row) => row.measured)).toBe(true);
    expect(rows.every((row) => row.baseValue === undefined)).toBe(true);
  });

  it("reads every metric, not only the ones denominated in bytes", () => {
    const workingDirectory = writeWorkspace({
      "packages/logging/codometer-report.json": {
        targets: [
          {
            empty: false,
            metrics: [
              {
                limits: [],
                name: "codebase.typescript.files",
                unit: null,
                value: 22,
              },
            ],
            name: "codebase",
          },
          buildMetricTarget({ value: 50 }),
        ],
      },
    });

    const rows = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(rows.map((row) => row.name)).toStrictEqual([
      "codebase.typescript.files",
      "Compiled JavaScript.size",
    ]);
    expect(rows.map((row) => row.unit)).toStrictEqual([null, "bytes"]);
  });

  // The redesigned report drops its top-level `documentation` array — a
  // configured counter's breach detail now lives inside the metric itself,
  // addressed under `custom.<label>` like any other custom counter — and
  // reports no longer carry that field at all. A diff must join this metric
  // by name exactly like any other, rather than erroring on the report's
  // shape or silently leaving the counter out of the table.
  it("diffs a custom counter's metric against its baseline without dropping it", () => {
    const buildCustomCounterReport = (value: number): CodometerReport => ({
      targets: [
        {
          empty: false,
          metrics: [
            {
              limits: [
                { breached: false, label: null, severity: "fail", value: 100 },
              ],
              name: "codebase.custom.Service Files",
              unit: null,
              value,
            },
          ],
          name: "codebase",
        },
      ],
    });
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logging/codometer-report.json":
        buildCustomCounterReport(12),
      "packages/logging/codometer-report.json": buildCustomCounterReport(15),
    });

    const rows = service.collect({
      baselineDirectory: ".baseline",
      workingDirectory,
    }).rows;

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("codebase.custom.Service Files");
    expect(rows[0]?.baseValue).toBe(12);
    expect(rows[0]?.value).toBe(15);
    expect(rows[0]?.measured).toBe(true);
  });

  it("joins a measured metric to its baseline by name", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ value: 40 }),
      ]),
      "packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ value: 50 }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: ".baseline",
      workingDirectory,
    }).rows;

    expect(row?.baseValue).toBe(40);
    expect(row?.value).toBe(50);
    expect(row?.measured).toBe(true);
  });

  it("joins on the metric name even when the limit was relabelled", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ label: "Old label", limit: 100, value: 40 }),
      ]),
      "packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ label: "New label", limit: 100, value: 50 }),
      ]),
    });

    const rows = service.collect({
      baselineDirectory: ".baseline",
      workingDirectory,
    }).rows;

    expect(rows).toHaveLength(1);
    expect(rows[0]?.baseValue).toBe(40);
    expect(rows[0]?.label).toBe("New label");
  });

  it("labels a row with its own metric name when the limit wrote no label", () => {
    const workingDirectory = writeWorkspace({
      "packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ name: "Library bundle", value: 50 }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(row?.label).toBe("Library bundle.size");
    expect(row?.name).toBe("Library bundle.size");
  });

  it("marks a baseline metric the rebuild dropped as removed", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ value: 40 }),
        buildMetricTarget({ name: "Retired", value: 10 }),
      ]),
      "packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ value: 50 }),
      ]),
    });

    const rows = service.collect({
      baselineDirectory: ".baseline",
      workingDirectory,
    }).rows;
    const retired = rows.find((row) => row.label === "Retired.size");

    expect(retired?.removed).toBe(true);
    expect(retired?.value).toBe(0);
    expect(retired?.baseValue).toBe(10);
  });

  it("carries the baseline value for a project this run never rebuilt", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ value: 40 }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: ".baseline",
      workingDirectory,
    }).rows;

    expect(row?.measured).toBe(false);
    expect(row?.removed).toBe(false);
    expect(row?.value).toBe(40);
  });

  it("distinguishes a target that matched nothing from one measuring zero", () => {
    const workingDirectory = writeWorkspace({
      "applications/lexico/codometer-report.json": buildReport([
        buildMetricTarget({ empty: true, value: 0 }),
      ]),
      "packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ empty: false, value: 0 }),
      ]),
    });

    const rows = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(
      rows.map((row) => [row.project, row.empty, row.value]),
    ).toStrictEqual([
      ["lexico", true, 0],
      ["logging", false, 0],
    ]);
  });

  it.each([
    { label: "malformed", report: "{ not json" },
    { label: "missing its targets", report: '{"failures":[]}' },
    { label: "shaped like the outgoing tool's", report: '[{"name":"x"}]' },
  ])("tolerates a report $label", ({ report }) => {
    const workingDirectory = writeWorkspace({
      "packages/logging/codometer-report.json": report,
    });

    expect(
      service.collect({ baselineDirectory: undefined, workingDirectory }),
    ).toStrictEqual({ failures: [], rows: [] });
    expect(logger.warn).toHaveBeenCalledWith(
      "⚠️ Skipped an unreadable codometer report",
      undefined,
      {
        reportPath: "packages/logging/codometer-report.json",
        workingDirectory,
      },
    );
  });

  it("leaves a metric nothing limits without a limit or a severity", () => {
    const workingDirectory = writeWorkspace({
      "packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ value: 90 }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(row?.limit).toBeUndefined();
    expect(row?.breach).toBeUndefined();
  });

  it("reports a warn breach beside a fail that held as advisory, not passing", () => {
    // The case the plural limits exist for: neither may mask the other.
    const workingDirectory = writeWorkspace({
      "packages/lexico-components/codometer-report.json": buildReport([
        buildMetricTarget({
          limits: [
            { breached: true, label: null, severity: "warn", value: 180_000 },
            { breached: false, label: null, severity: "fail", value: 200_000 },
          ],
          name: "Library bundle",
          value: 196_157,
        }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    // Advisory, not failing — and the enforced limit is still the fail limit.
    expect(row?.breach).toBe("warn");
    expect(row?.limit).toBe(200_000);
  });

  it("reports a breached fail beside a breached warn as failing", () => {
    const workingDirectory = writeWorkspace({
      "packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({
          limits: [
            { breached: true, label: null, severity: "warn", value: 40 },
            { breached: true, label: null, severity: "fail", value: 50 },
          ],
          value: 90,
        }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(row?.breach).toBe("fail");
    expect(row?.limit).toBe(50);
  });

  it("falls back to the advisory limit when nothing fails the metric", () => {
    const workingDirectory = writeWorkspace({
      "packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({
          limits: [
            { breached: false, label: null, severity: "warn", value: 90 },
          ],
          value: 50,
        }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(row?.limit).toBe(90);
    expect(row?.breach).toBeUndefined();
  });

  it.each([
    { label: "unmeasured", removed: false },
    { label: "removed", removed: true },
  ])(
    "drops the baseline's breach from a $label row, so `main` cannot mark this change",
    ({ removed }) => {
      const breaching = buildMetricTarget({
        breached: true,
        empty: true,
        limit: 180_000,
        name: "Library bundle",
        severity: "warn",
        value: 196_157,
      });
      const workingDirectory = writeWorkspace({
        ".baseline/packages/lexico-components/codometer-report.json":
          buildReport([breaching]),
        // Present but holding a different metric, so the baseline-only row is
        // reported removed rather than merely skipped.
        ...(removed
          ? {
              "packages/lexico-components/codometer-report.json": buildReport([
                buildMetricTarget({ name: "Something else", value: 10 }),
              ]),
            }
          : {}),
      });

      const row = service
        .collect({ baselineDirectory: ".baseline", workingDirectory })
        .rows.find((candidate) => candidate.label === "Library bundle.size");

      expect(row?.measured).toBe(false);
      expect(row?.removed).toBe(removed);
      // The numbers are `main`'s; the verdicts are not carried across.
      expect(row?.baseValue).toBe(196_157);
      expect(row?.breach).toBeUndefined();
      expect(row?.empty).toBe(false);
    },
  );

  it("carries a failure through, tagged with the project it came from", () => {
    const workingDirectory = writeWorkspace({
      "packages/logging/codometer-report.json": {
        failures: [
          {
            kind: "target",
            reason: "the build output is missing",
            subject: "Compiled JavaScript",
          },
        ],
        targets: [],
      },
    });

    const collection = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    });

    expect(collection.rows).toStrictEqual([]);
    expect(collection.failures).toStrictEqual([
      {
        kind: "target",
        project: "logging",
        reason: "the build output is missing",
        subject: "Compiled JavaScript",
      },
    ]);
  });

  it("ignores a failure the baseline run hit, which this change did not cause", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logging/codometer-report.json": {
        failures: [
          { kind: "target", reason: "broken on main", subject: "Ghost" },
        ],
        targets: [buildMetricTarget({ value: 40 })],
      },
      "packages/logging/codometer-report.json": buildReport([
        buildMetricTarget({ value: 50 }),
      ]),
    });

    const collection = service.collect({
      baselineDirectory: ".baseline",
      workingDirectory,
    });

    expect(collection.failures).toStrictEqual([]);
    expect(collection.rows[0]?.baseValue).toBe(40);
  });

  it.each([{ severity: "fail" as const }, { severity: "warn" as const }])(
    "reports a breached $severity limit at that severity",
    ({ severity }) => {
      const workingDirectory = writeWorkspace({
        "packages/logging/codometer-report.json": buildReport([
          buildMetricTarget({ breached: true, limit: 50, severity, value: 90 }),
        ]),
      });

      const [row] = service.collect({
        baselineDirectory: undefined,
        workingDirectory,
      }).rows;

      expect(row?.breach).toBe(severity);
      expect(row?.limit).toBe(50);
    },
  );
});
