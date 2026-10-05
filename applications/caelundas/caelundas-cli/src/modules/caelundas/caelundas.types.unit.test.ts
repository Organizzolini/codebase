import { describe, expect, it } from "vitest";

import {
  capitalize,
  groupByToMap,
  isAspect,
  isBody,
  isDecan,
  isKeyOf,
  isLunarPhase,
  isMajorAspect,
  isMinorAspect,
  isSign,
  isSpecialtyAspect,
  objectEntries,
  typedFromEntries,
  uncapitalize,
} from "./caelundas.types";

describe("caelundas.types", () => {
  it("capitalizes and uncapitalizes string literal types", () => {
    expect(capitalize("mars")).toBe("Mars");
    expect(uncapitalize("Mars")).toBe("mars");
  });

  it("groups arrays into typed maps", () => {
    const grouped = groupByToMap(
      [
        { category: "sun", value: 1 },
        { category: "sun", value: 2 },
        { category: "moon", value: 3 },
      ],
      (item) => item.category,
    );

    expect(grouped.get("sun")).toHaveLength(2);
    expect(grouped.get("moon")).toHaveLength(1);
  });

  it("preserves typed object entries and fromEntries", () => {
    const entries = objectEntries({ moon: 2, sun: 1 });

    expect(entries).toStrictEqual([
      ["moon", 2],
      ["sun", 1],
    ]);

    const record = typedFromEntries(entries);

    expect(record).toStrictEqual({ moon: 2, sun: 1 });
  });

  it("recognizes valid celestial keys", () => {
    expect(isAspect("conjunct")).toBe(true);
    expect(isBody("sun")).toBe(true);
    expect(isDecan("1")).toBe(true);
    expect(isLunarPhase("full")).toBe(true);
    expect(isMajorAspect("trine")).toBe(true);
    expect(isMinorAspect("quincunx")).toBe(true);
    expect(isSign("aries")).toBe(true);
    expect(isSpecialtyAspect("quintile")).toBe(true);
  });

  it("rejects invalid celestial keys", () => {
    expect(isAspect("not-an-aspect")).toBe(false);
    expect(isBody("not-a-body")).toBe(false);
    expect(isDecan("4")).toBe(false);
    expect(isLunarPhase("not-a-phase")).toBe(false);
    expect(isMajorAspect("not-a-major-aspect")).toBe(false);
    expect(isMinorAspect("not-a-minor-aspect")).toBe(false);
    expect(isSign("not-a-sign")).toBe(false);
    expect(isSpecialtyAspect("not-a-specialty-aspect")).toBe(false);
  });

  it("checks object keys safely", () => {
    const object = { moon: 2, sun: 1 };

    expect(isKeyOf(object, "sun")).toBe(true);
    expect(isKeyOf(object, "mars")).toBe(false);
  });
});
