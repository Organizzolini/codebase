import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { RenderService } from "./render.service";

import type { MetricRow, ProjectFailure } from "../changes/changes.types";

/** Builds a row with only the fields a case cares about. */
function buildRow(overrides: Partial<MetricRow> = {}): MetricRow {
  return {
    baseValue: undefined,
    breach: undefined,
    empty: false,
    label: "Compiled JavaScript",
    limit: undefined,
    measured: true,
    name: "Compiled JavaScript.size",
    project: "logger",
    removed: false,
    unit: "bytes",
    value: 1000,
    ...overrides,
  };
}

describe(RenderService, () => {
  let service: RenderService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [RenderService],
    }).compile();

    service = await module.resolve(RenderService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("renderSection", () => {
    it("reports nothing to show when every row is unchanged", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseValue: 1000, value: 1000 })],
      });

      expect(section).toContain("## ⏲️ Codometer");
      expect(section).toContain(
        "No codometer changes to report for this pull request.",
      );
      expect(section).not.toContain("<details");
    });

    it("gives a project with a changed metric its own collapsed block", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseValue: 1000, value: 1200 })],
      });

      expect(section).toContain("<details>");
      expect(section).toContain("`logger` — 1 changed");
      expect(section).toContain("Compiled JavaScript");
      expect(section).toContain("1.20 kB");
      expect(section).toContain("1.00 kB");
      expect(section).toContain("+0.20 kB");
    });

    it("omits a project with nothing changed and nothing failed", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [
          buildRow({ baseValue: 1000, project: "logger", value: 1000 }),
          buildRow({ baseValue: 1000, project: "lexico", value: 1200 }),
        ],
      });

      expect(section).not.toContain("logger");
      expect(section).toContain("lexico");
    });

    it("opens a project's block when it has a breach", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseValue: 1000, breach: "fail", value: 1200 })],
      });

      expect(section).toContain("<details open>");
    });

    it("does not open a project's block for a plain change with no breach", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseValue: 1000, value: 1200 })],
      });

      expect(section).toContain("<details>");
      expect(section).not.toContain("<details open>");
    });

    it("opens a project's block when it has a measurement failure", () => {
      const failure: ProjectFailure = {
        kind: "target",
        project: "logger",
        reason: "the build output is missing",
        subject: "Compiled JavaScript",
      };

      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [failure],
        rows: [],
      });

      expect(section).toContain("<details open>");
      expect(section).toContain("> [!CAUTION]");
      expect(section).toContain("the build output is missing");
    });

    it("gives a project with only a failure a block with no table", () => {
      const failure: ProjectFailure = {
        kind: "target",
        project: "logger",
        reason: "broken",
        subject: "Compiled JavaScript",
      };

      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [failure],
        rows: [],
      });

      expect(section).toContain("`logger`");
      expect(section).not.toContain("| Metric |");
    });

    it("formats a plain count metric without byte units", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [
          buildRow({
            baseValue: 20,
            label: "TypeScript Files",
            name: "codebase.typescript.files",
            unit: null,
            value: 23,
          }),
        ],
      });

      expect(section).toContain("23");
      expect(section).toContain("20");
      expect(section).toContain("+3");
    });

    it("marks a removed metric with strikethrough and no current value", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseValue: 500, removed: true, value: 0 })],
      });

      expect(section).toContain("~~Compiled JavaScript~~");
      expect(section).toContain("🗑️");
    });

    it("marks a warn breach distinctly from a fail breach", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseValue: 1000, breach: "warn", value: 1200 })],
      });

      expect(section).toContain("❗");
      expect(section).not.toContain("❌");
    });

    it("marks a metric that shrank distinctly from one that grew", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseValue: 1200, value: 1000 })],
      });

      expect(section).toContain("📉");
    });

    it("marks a brand-new metric as new", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseValue: undefined, value: 500 })],
      });

      expect(section).toContain("🆕");
    });

    it("groups more than one changed metric under the same project", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [
          buildRow({
            baseValue: 1000,
            label: "Compiled JavaScript",
            value: 1200,
          }),
          buildRow({
            baseValue: 20,
            label: "TypeScript Files",
            name: "codebase.typescript.files",
            unit: null,
            value: 23,
          }),
        ],
      });

      expect(section).toContain("`logger` — 2 changed");
      expect(section).toContain("Compiled JavaScript");
      expect(section).toContain("TypeScript Files");
    });

    it("groups more than one failure under the same project", () => {
      const failures: ProjectFailure[] = [
        {
          kind: "target",
          project: "logger",
          reason: "broken build",
          subject: "Compiled JavaScript",
        },
        {
          kind: "limit",
          project: "logger",
          reason: "unreadable configuration",
          subject: "Custom counter",
        },
      ];

      const section = service.renderSection({
        baselineUrl: undefined,
        failures,
        rows: [],
      });

      expect(section).toContain("broken build");
      expect(section).toContain("unreadable configuration");
    });

    it("marks an empty target distinctly from a breach or plain growth", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseValue: undefined, empty: true, value: 0 })],
      });

      expect(section).toContain("⁉️");
      expect(section).not.toContain("🆕");
    });

    it("names the run a baseline came from when one was given", () => {
      const section = service.renderSection({
        baselineUrl: "https://example.test/actions/runs/1",
        failures: [],
        rows: [buildRow({ baseValue: 1000, value: 1200 })],
      });

      expect(section).toContain(
        "_Compared against [`main`](https://example.test/actions/runs/1)._",
      );
    });

    it("says nothing about a baseline when none was given", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseValue: 1000, value: 1200 })],
      });

      expect(section).not.toContain("Compared against");
    });

    it("renders every changed metric, however many there are", () => {
      const rows = Array.from({ length: 205 }, (_, index) =>
        buildRow({
          baseValue: 1000,
          label: `Metric ${index}`,
          name: `codebase.metric-${index}`,
          project: `project-${index}`,
          value: 1000 + index + 1,
        }),
      );

      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows,
      });

      const rowCount = section
        .split("\n")
        .filter((line) => line.startsWith("| 📈")).length;

      expect(rowCount).toBe(205);
    });
  });
});
