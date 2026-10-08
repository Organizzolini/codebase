import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ReportService } from "./report.service";

import type { CodometerReport } from "@codometer/core";
import type { EvaluatedLimit, TargetMetricIndex } from "@codometer/measurement";

/** Builds one target's index, since only its metrics and file count vary. */
function buildIndex(
  files: number,
  metrics: [string, number][],
): TargetMetricIndex {
  return {
    ambiguous: new Set(),
    files,
    instances: new Map(),
    metrics: new Map(metrics),
  };
}

const codebaseIndex = buildIndex(12, [
  ["files", 12],
  ["typescript.interfaces", 42],
]);

const compiledIndex = buildIndex(2, [
  ["files", 2],
  ["size", 4529],
]);

describe(ReportService, () => {
  let service: ReportService;

  /** Builds a report over the codebase and the compiled target. */
  function build(limits: EvaluatedLimit[] = []): CodometerReport {
    return service.build({
      failures: [],
      indexes: new Map([
        ["codebase", codebaseIndex],
        ["compiled", compiledIndex],
      ]),
      limits,
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ReportService],
    }).compile();

    service = await module.resolve(ReportService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // Spec #749 user story 16: a breach still names its file and line once it
  // reaches the report, not only while it is still in memory.
  it("carries a metric's per-instance breaches through to its report entry", () => {
    const index = buildIndex(9, [["custom.Overlong Comments", 1]]);
    index.instances.set("custom.Overlong Comments", [
      { file: "src/values.yaml", line: 3, measured: 14 },
    ]);

    const report = service.build({
      failures: [],
      indexes: new Map([["codebase", index]]),
      limits: [],
    });

    expect(
      report.targets[0]?.metrics.find(
        (metric) => metric.path === "custom.Overlong Comments",
      )?.instances,
    ).toStrictEqual([{ file: "src/values.yaml", line: 3, measured: 14 }]);
  });

  it("carries `null` instances for a metric that only counts", () => {
    expect(
      build().targets[0]?.metrics.find((metric) => metric.path === "files")
        ?.instances,
    ).toBeNull();
  });

  it("names every metric by its target and its path", () => {
    expect(build().targets[0]?.metrics).toStrictEqual([
      {
        instances: null,
        limits: [],
        name: "codebase.files",
        path: "files",
        unit: null,
        value: 12,
      },
      {
        instances: null,
        limits: [],
        name: "codebase.typescript.interfaces",
        path: "typescript.interfaces",
        unit: null,
        value: 42,
      },
    ]);
  });

  // A count has no unit to get wrong; bytes are raw and decimal, so a renderer
  // showing kilobytes divides by 1000 rather than 1024.
  it("calls out the one metric whose number counts bytes", () => {
    const metrics = build().targets[1]?.metrics;

    expect(metrics?.find((metric) => metric.path === "size")?.unit).toBe(
      "bytes",
    );
    expect(metrics?.find((metric) => metric.path === "files")?.unit).toBeNull();
  });

  it("carries a limit that held, so a consumer can render the headroom", () => {
    const limits: EvaluatedLimit[] = [
      {
        breached: false,
        label: "Bundle",
        limit: 8000,
        measured: 4529,
        metric: "size",
        severity: "fail",
        target: "compiled",
      },
    ];
    const metrics = build(limits).targets[1]?.metrics;

    expect(
      metrics?.find((metric) => metric.path === "size")?.limits,
    ).toStrictEqual([
      {
        breached: false,
        label: "Bundle",
        severity: "fail",
        value: 8000,
      },
    ]);
  });

  it("carries a breach with the severity it was declared at", () => {
    const limits: EvaluatedLimit[] = [
      {
        breached: true,
        label: undefined,
        limit: 40,
        measured: 42,
        metric: "typescript.interfaces",
        severity: "warn",
        target: "codebase",
      },
    ];
    const metrics = build(limits).targets[0]?.metrics;

    expect(
      metrics?.find((metric) => metric.path === "typescript.interfaces")
        ?.limits,
    ).toStrictEqual([
      {
        breached: true,
        // Nothing labelled it, so the report says so rather than leaving the key out.
        label: null,
        severity: "warn",
        value: 40,
      },
    ]);
  });

  it("carries every limit on one metric, not merely the last written", () => {
    // The configuration accepts a `warn` short of a `fail` on one metric on
    // purpose, and the gate enforces both. A report holding one of them could
    // not say what was actually being enforced.
    const limits: EvaluatedLimit[] = [
      {
        breached: true,
        label: undefined,
        limit: 7000,
        measured: 4529,
        metric: "size",
        severity: "warn",
        target: "compiled",
      },
      {
        breached: false,
        label: undefined,
        limit: 8000,
        measured: 4529,
        metric: "size",
        severity: "fail",
        target: "compiled",
      },
    ];
    const metrics = build(limits).targets[1]?.metrics;

    expect(
      metrics?.find((metric) => metric.path === "size")?.limits,
    ).toStrictEqual([
      { breached: true, label: null, severity: "warn", value: 7000 },
      { breached: false, label: null, severity: "fail", value: 8000 },
    ]);
  });

  // Three mutually contradictory signals is what the tool this replaces
  // produced: no limit field, a passing verdict, and a non-zero exit.
  it("says outright that a target matched nothing", () => {
    const report = service.build({
      failures: [],
      indexes: new Map([["compiled", buildIndex(0, [["files", 0]])]]),
      limits: [],
    });

    expect(report.targets[0]).toStrictEqual({
      empty: true,
      files: 0,
      metrics: [
        {
          instances: null,
          limits: [],
          name: "compiled.files",
          path: "files",
          unit: null,
          value: 0,
        },
      ],
      name: "compiled",
    });
  });

  it("carries whatever the run could not do into the document", () => {
    const report = service.build({
      failures: [
        { kind: "limit", reason: "nothing answers", subject: "web.size" },
      ],
      indexes: new Map(),
      limits: [],
    });

    expect(report).toStrictEqual({
      failures: [
        { kind: "limit", reason: "nothing answers", subject: "web.size" },
      ],
      targets: [],
    });
  });

  // The name is the join key a later run is compared against, so it has to
  // come out the same for the same metric however the run was invoked.
  it("names a metric identically across two builds", () => {
    expect(build().targets[1]?.metrics[1]?.name).toBe(
      build().targets[1]?.metrics[1]?.name,
    );
    expect(build().targets[1]?.metrics[1]?.name).toBe("compiled.size");
  });
});
