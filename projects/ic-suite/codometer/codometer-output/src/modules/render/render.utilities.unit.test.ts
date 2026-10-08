import { describe, expect, it } from "vitest";

import {
  formatBytes,
  formatCount,
  formatDelta,
  formatValue,
  hasChanged,
} from "./render.utilities";

import type { MetricRow } from "../changes/changes.types";

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

describe("codometer markdown render utilities", () => {
  describe(formatBytes, () => {
    it.each([
      { bytes: 0, expected: "0.00 kB" },
      { bytes: 1000, expected: "1.00 kB" },
      { bytes: -2500, expected: "-2.50 kB" },
      { bytes: 1_000_000, expected: "1.00 MB" },
      { bytes: -1_500_000, expected: "-1.50 MB" },
    ])("formats $bytes as $expected", ({ bytes, expected }) => {
      expect(formatBytes(bytes)).toBe(expected);
    });

    it("uses decimal kilobytes, matching what codometer parses", () => {
      // `"8 KB"` in a config is 8000 bytes, so 8000 must print as 8.00 kB.
      expect(formatBytes(8000)).toBe("8.00 kB");
    });
  });

  describe(formatCount, () => {
    it.each([
      { expected: "0", value: 0 },
      { expected: "1", value: 1 },
      { expected: "1,234", value: 1234 },
      { expected: "-3", value: -3 },
    ])("formats $value as $expected", ({ expected, value }) => {
      expect(formatCount(value)).toBe(expected);
    });
  });

  describe(formatValue, () => {
    it("formats a byte-denominated value as bytes", () => {
      expect(formatValue(1500, "bytes")).toBe("1.50 kB");
    });

    it("formats a plain count as a count", () => {
      expect(formatValue(1234, null)).toBe("1,234");
    });
  });

  describe(formatDelta, () => {
    it.each([
      { delta: undefined, expected: "—", unit: "bytes" as const },
      { delta: 0, expected: "+0.00 kB", unit: "bytes" as const },
      { delta: 1500, expected: "+1.50 kB", unit: "bytes" as const },
      { delta: -1500, expected: "-1.50 kB", unit: "bytes" as const },
      { delta: 3, expected: "+3", name: "count", unit: null },
      { delta: -3, expected: "-3", name: "count", unit: null },
    ])("formats $delta as $expected", ({ delta, expected, unit }) => {
      expect(formatDelta(delta, unit)).toBe(expected);
    });
  });

  describe(hasChanged, () => {
    it("is false for a row unchanged from its baseline", () => {
      expect(hasChanged(buildRow({ baseValue: 1000, value: 1000 }))).toBe(
        false,
      );
    });

    it("is true for a row whose value differs from its baseline", () => {
      expect(hasChanged(buildRow({ baseValue: 900, value: 1000 }))).toBe(true);
    });

    it("is true for a brand-new metric with no baseline", () => {
      expect(hasChanged(buildRow({ baseValue: undefined, value: 1000 }))).toBe(
        true,
      );
    });

    it("is false for a brand-new metric that measured nothing", () => {
      expect(hasChanged(buildRow({ baseValue: undefined, value: 0 }))).toBe(
        false,
      );
    });

    it("is true for a metric breaching its limit even with no change", () => {
      expect(
        hasChanged(buildRow({ baseValue: 1000, breach: "fail", value: 1000 })),
      ).toBe(true);
    });
  });
});
