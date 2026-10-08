import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildCodeStatistics } from "../../../testing/mocks";

import { MetricIndexService } from "./metric-index.service";

import type { MeasuredTarget } from "./limits.types";

const zeroes = buildCodeStatistics();

/** The repository's own metrics, with a counter in every shape a path reads. */
const codebaseTarget: MeasuredTarget = {
  files: 12,
  language: buildCodeStatistics({
    custom: [
      { color: "7c3aed", count: 3, group: "conventions", label: "Services" },
    ],
    typescript: { ...zeroes.typescript, interfaces: 42 },
  }),
  name: "codebase",
  size: undefined,
};

/** A declared target measuring compiled output and nothing else. */
const compiledTarget: MeasuredTarget = {
  files: 2,
  language: undefined,
  name: "compiled",
  size: { bytes: 4529, compression: "gzip", files: 2 },
};

describe(MetricIndexService, () => {
  let service: MetricIndexService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MetricIndexService],
    }).compile();

    service = await module.resolve(MetricIndexService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    ["files", 12],
    ["typescript.interfaces", 42],
    ["custom.Services", 3],
  ])("indexes %s as %i", (metricPath, value) => {
    const { indexes } = service.index([codebaseTarget]);

    expect(indexes.get("codebase")?.metrics.get(metricPath)).toBe(value);
  });

  it("indexes the size of a target that measured one", () => {
    const { indexes } = service.index([codebaseTarget, compiledTarget]);

    expect(indexes.get("compiled")?.metrics.get("size")).toBe(4529);
    expect(indexes.get("codebase")?.metrics.has("size")).toBe(false);
  });

  // Spec #749 user story 16: a per-instance selector's breaches have to
  // survive indexing, not only the count they add up to.
  it("indexes a custom statistic's per-instance breaches alongside its count", () => {
    const withInstances: MeasuredTarget = {
      ...codebaseTarget,
      language: buildCodeStatistics({
        custom: [
          {
            color: "dc2626",
            count: 1,
            group: "conventions",
            instances: [{ file: "src/values.yaml", line: 3, measured: 14 }],
            label: "Overlong Comments",
          },
        ],
      }),
    };
    const { indexes } = service.index([withInstances]);

    expect(
      indexes.get("codebase")?.instances.get("custom.Overlong Comments"),
    ).toStrictEqual([{ file: "src/values.yaml", line: 3, measured: 14 }]);
  });

  it("indexes no instances for a counter that only counts", () => {
    const { indexes } = service.index([codebaseTarget]);

    expect(indexes.get("codebase")?.instances.has("custom.Services")).toBe(
      false,
    );
  });

  it("marks a path two counters answer to as ambiguous", () => {
    const doubled: MeasuredTarget = {
      ...codebaseTarget,
      language: buildCodeStatistics({
        custom: [
          { color: "7c3aed", count: 3, group: "conventions", label: "Tests" },
          { color: "0284c7", count: 5, group: "conventions", label: "Tests" },
        ],
      }),
    };
    const { indexes } = service.index([doubled]);

    expect(indexes.get("codebase")?.ambiguous.has("custom.Tests")).toBe(true);
  });

  it("collects a repeated target name and keeps the first of them", () => {
    const { duplicates, indexes } = service.index([
      codebaseTarget,
      { ...codebaseTarget, files: 99 },
    ]);

    expect(duplicates).toStrictEqual([
      {
        reason: expect.stringContaining(
          'Two measured targets are called "codebase"',
        ) as string,
        target: "codebase",
      },
    ]);
    expect(indexes.get("codebase")?.files).toBe(12);
  });

  it("keeps the order the targets were measured in", () => {
    const { indexes } = service.index([codebaseTarget, compiledTarget]);

    expect([...indexes.keys()]).toStrictEqual(["codebase", "compiled"]);
  });
});
