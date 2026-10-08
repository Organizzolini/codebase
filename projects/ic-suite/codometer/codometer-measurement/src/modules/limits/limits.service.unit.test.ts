import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildCodeStatistics } from "../../../testing/mocks";

import { LimitsService } from "./limits.service";
import { MetricIndexService } from "./metric-index.service";

import type {
  LimitsEvaluation,
  MeasuredTarget,
  TargetMetricIndex,
} from "./limits.types";
import type {
  ResolvedCodometerConfiguration,
  ResolvedCodometerLimit,
} from "@codometer/configuration";
import type { CodometerSeverity } from "@codometer/core";

const zeroes = buildCodeStatistics();

/** The repository's own metrics, with a counter in every shape a limit reads. */
const codebaseTarget: MeasuredTarget = {
  files: 12,
  language: buildCodeStatistics({
    custom: [
      {
        color: "7c3aed",
        count: 3,
        group: "conventions",
        label: "Service Files",
      },
    ],
    linesOfCode: 700,
    markdown: { ...zeroes.markdown, files: 9 },
    typescript: { ...zeroes.typescript, interfaces: 42 },
  }),
  name: "codebase",
  size: undefined,
};

/** A declared target measuring compiled output and nothing else. */
const compiledTarget: MeasuredTarget = {
  files: 2,
  language: undefined,
  name: "Compiled JavaScript",
  size: { bytes: 4529, compression: "gzip", files: 2 },
};

/** Builds a resolved configuration carrying nothing but its limits. */
function buildConfiguration(
  limits: ResolvedCodometerLimit[],
  defaultInput?: string,
): ResolvedCodometerConfiguration {
  return {
    custom: [],
    defaultInput,
    exclude: [],
    excludeFrom: [],
    format: "json",
    inputs: [],
    limits,
    outputs: [],
    python: { command: "python3" },
  };
}

/** Builds a resolved limit, since only its metric and value ever vary. */
function buildLimit(
  metric: string,
  value: number,
  severity: CodometerSeverity = "fail",
): ResolvedCodometerLimit {
  return { label: undefined, metric, severity, value };
}

describe(LimitsService, () => {
  let service: LimitsService;
  let metricIndexService: MetricIndexService;

  /** Indexes the given targets the way the measurement pipeline does. */
  function index(
    targets: MeasuredTarget[],
  ): ReadonlyMap<string, TargetMetricIndex> {
    return metricIndexService.index(targets).indexes;
  }

  /** Holds one limit against the codebase and the compiled target. */
  function evaluate(
    limit: ResolvedCodometerLimit,
    targets: MeasuredTarget[] = [codebaseTarget, compiledTarget],
    defaultInput?: string,
  ): LimitsEvaluation {
    return service.evaluate({
      configuration: buildConfiguration([limit], defaultInput),
      indexes: index(targets),
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LimitsService, MetricIndexService],
    }).compile();

    service = await module.resolve(LimitsService);
    metricIndexService = await module.resolve(MetricIndexService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    ["codebase.typescript.interfaces", 42],
    ["codebase.markdown.files", 9],
    ["codebase.linesOfCode", 700],
    ["codebase.custom.Service Files", 3],
    ["codebase.files", 12],
    ["Compiled JavaScript.size", 4529],
    ["Compiled JavaScript.files", 2],
  ])("reads %s as the metric measuring %i", (metric, measured) => {
    expect(evaluate(buildLimit(metric, 1_000_000)).limits[0]?.measured).toBe(
      measured,
    );
  });

  it("reports a fail breach with the metric, its limit, and its value", () => {
    expect(
      service.evaluate({
        configuration: buildConfiguration([
          {
            label: "Compiled bundle",
            metric: "Compiled JavaScript.size",
            severity: "fail",
            value: 4000,
          },
        ]),
        indexes: index([codebaseTarget, compiledTarget]),
      }),
    ).toStrictEqual({
      failures: [],
      limits: [
        {
          breached: true,
          label: "Compiled bundle",
          limit: 4000,
          measured: 4529,
          metric: "size",
          severity: "fail",
          target: "Compiled JavaScript",
        },
      ],
    });
  });

  it("reports a warn breach the same way, carrying its severity", () => {
    expect(
      evaluate(buildLimit("codebase.typescript.interfaces", 40, "warn")).limits,
    ).toStrictEqual([
      {
        breached: true,
        label: undefined,
        limit: 40,
        measured: 42,
        metric: "typescript.interfaces",
        severity: "warn",
        target: "codebase",
      },
    ]);
  });

  // A limit is the highest the metric may be, so sitting exactly on it is
  // not going over it.
  it.each([
    [42, false],
    [41, true],
    [43, false],
  ])(
    "holds 42 interfaces to a limit of %i as breached=%s",
    (value, breached) => {
      expect(
        evaluate(buildLimit("codebase.typescript.interfaces", value)).limits[0]
          ?.breached,
      ).toBe(breached);
    },
  );

  it("gates nothing when no limit was declared", () => {
    expect(
      service.evaluate({
        configuration: buildConfiguration([]),
        indexes: index([codebaseTarget, compiledTarget]),
      }),
    ).toStrictEqual({ failures: [], limits: [] });
  });

  it("reads an unqualified path as the default target's metric", () => {
    const [evaluated] = evaluate(
      buildLimit("typescript.interfaces", 100),
      [codebaseTarget, compiledTarget],
      "codebase",
    ).limits;

    expect(evaluated?.target).toBe("codebase");
    expect(evaluated?.measured).toBe(42);
  });

  it("resolves a target whose own name holds a dot", () => {
    const legacyTarget: MeasuredTarget = {
      ...compiledTarget,
      name: "dist.old",
    };
    const [evaluated] = evaluate(buildLimit("dist.old.size", 5000), [
      codebaseTarget,
      legacyTarget,
    ]).limits;

    expect(evaluated?.target).toBe("dist.old");
    expect(evaluated?.metric).toBe("size");
  });

  it("refuses a path that could be read two ways", () => {
    const markdownTarget: MeasuredTarget = {
      ...compiledTarget,
      name: "markdown",
    };
    const { failures } = evaluate(
      buildLimit("markdown.files", 20),
      [codebaseTarget, markdownTarget],
      "codebase",
    );

    expect(failures[0]?.reason).toMatch(
      /could be the "markdown" target's "files" metric, or the "codebase" target's "markdown.files" metric/,
    );
  });

  it("refuses a path two counters in one target answer to", () => {
    const doubledTarget: MeasuredTarget = {
      ...codebaseTarget,
      language: buildCodeStatistics({
        custom: [
          { color: "7c3aed", count: 3, group: "conventions", label: "Tests" },
          { color: "0284c7", count: 5, group: "conventions", label: "Tests" },
        ],
      }),
    };
    const { failures } = evaluate(buildLimit("codebase.custom.Tests", 10), [
      doubledTarget,
    ]);

    expect(failures[0]?.reason).toMatch(
      /more than one metric called "custom.Tests"/,
    );
  });

  it("indexes nothing from a statistic that holds no number", () => {
    const language = buildCodeStatistics();
    // Written past the type rather than through it: nothing a statistics
    // report holds is anything but a counter or a group of them, and the walk
    // steps over whatever else it is handed rather than indexing it.
    Reflect.set(language, "sourceFiles", "many");
    const oddTarget: MeasuredTarget = { ...codebaseTarget, language };
    const { failures } = evaluate(buildLimit("codebase.sourceFiles", 1), [
      oddTarget,
    ]);

    expect(failures[0]?.reason).toMatch(/nothing measured answers to it/);
  });

  it("refuses a path nothing measured answers to", () => {
    expect(
      evaluate(buildLimit("codebase.typescript.traits", 10)).failures,
    ).toStrictEqual([
      {
        metric: "codebase.typescript.traits",
        reason: expect.stringContaining(
          "Cannot bind the limit written against",
        ) as string,
      },
    ]);
  });

  it("refuses an unqualified path when no default target is configured", () => {
    expect(
      evaluate(buildLimit("typescript.interfaces", 10)).failures[0]?.reason,
    ).toMatch(
      /nothing measured answers to it. Measured targets: "codebase", "Compiled JavaScript"/,
    );
  });

  // The target ran size analysis alone, so its language counters were never
  // measured — a limit on one would otherwise be held against a zero.
  it("refuses a metric from an analysis the target never ran", () => {
    expect(
      evaluate(buildLimit("Compiled JavaScript.typescript.interfaces", 10))
        .failures,
    ).toHaveLength(1);
  });

  it("refuses a default target that was never measured", () => {
    expect(
      evaluate(buildLimit("typescript.interfaces", 10), [codebaseTarget], "web")
        .failures[0]?.reason,
    ).toMatch(/default input "web" was never measured/);
  });

  // One run has to name every limit that cannot be bound. Reporting only the
  // first turns one repair into as many runs as there are mistakes.
  it("collects every limit that binds to nothing rather than stopping at the first", () => {
    const { failures, limits } = service.evaluate({
      configuration: buildConfiguration([
        buildLimit("codebase.typescript.traits", 10),
        buildLimit("codebase.files", 100),
        buildLimit("nowhere.at.all", 10),
      ]),
      indexes: index([codebaseTarget, compiledTarget]),
    });

    expect(failures.map((failure) => failure.metric)).toStrictEqual([
      "codebase.typescript.traits",
      "nowhere.at.all",
    ]);
    expect(limits).toHaveLength(1);
  });

  it("fails a target that matched nothing while carrying a limit", () => {
    const { failures } = evaluate(
      buildLimit("Compiled JavaScript.size", 10_000),
      [codebaseTarget, { ...compiledTarget, files: 0 }],
    );

    expect(failures[0]?.reason).toMatch(/matched no files/);
  });

  // Without a limit there is nothing to assert the files exist, so an empty
  // match is a measurement of zero and unremarkable.
  it("leaves a target that matched nothing alone when nothing limits it", () => {
    const [evaluated] = evaluate(buildLimit("codebase.files", 20), [
      codebaseTarget,
      { ...compiledTarget, files: 0 },
    ]).limits;

    expect(evaluated?.breached).toBe(false);
  });
});
