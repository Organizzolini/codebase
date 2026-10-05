import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GeometryService } from "./geometry.service";

describe(GeometryService, () => {
  let service: GeometryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [GeometryService],
    }).compile();

    service = await module.resolve(GeometryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("compute", () => {
    it.each([
      { expected: { offset: 3.75, strokeWidth: 7.5, unit: 15 }, rows: 3 },
      { expected: { offset: 3, strokeWidth: 6, unit: 12 }, rows: 4 },
      { expected: { offset: 2.5, strokeWidth: 5, unit: 10 }, rows: 5 },
    ])(
      "derives the grid unit, offset, and stroke width from $rows rows",
      ({ expected, rows }) => {
        const geometry = service.compute(rows);

        expect(geometry.height).toBe(60);
        expect(geometry.unit).toBeCloseTo(expected.unit);
        expect(geometry.offset).toBeCloseTo(expected.offset);
        expect(geometry.strokeWidth).toBeCloseTo(expected.strokeWidth);
      },
    );

    it("keeps offset at one quarter of the unit and stroke width at half", () => {
      const geometry = service.compute(6);

      expect(geometry.offset).toBeCloseTo(geometry.unit / 4);
      expect(geometry.strokeWidth).toBeCloseTo(geometry.unit / 2);
    });
  });

  describe("borderPath", () => {
    // 🎯 The run three families share. Each passes its own right edge and
    // nothing else, so this is the whole of what they have in common — and
    // the assertion is on the literal path data rather than on a parse of
    // it, because the committed corpus is bytes and an extraction that
    // reordered these two runs would rewrite every drawing in it.
    it("rules both border rows from the right edge back to the left", () => {
      expect(service.borderPath(service.compute(4), 123)).toBe(
        "M123 63H3M123 3H3",
      );
    });

    it("reads the band's depth off the geometry rather than the row count", () => {
      const shallow = service.borderPath(service.compute(1), 40);
      const deep = service.borderPath(service.compute(11), 40);

      expect(shallow).not.toBe(deep);
      expect(shallow).toBe("M40 67.5H7.5M40 7.5H7.5");
      expect(deep).toBe("M40 61.25H1.25M40 1.25H1.25");
    });
  });

  describe("formatCoordinate", () => {
    it("renders a whole number with no decimal point", () => {
      expect(service.formatCoordinate(15)).toBe("15");
    });

    it("rounds a repeating decimal to five decimal places", () => {
      expect(service.formatCoordinate(60 / 7)).toBe("8.57143");
    });

    it("trims trailing zeros left after rounding", () => {
      expect(service.formatCoordinate(3.75)).toBe("3.75");
    });
  });
});
