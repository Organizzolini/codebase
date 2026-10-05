import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { SubmatrixUtilitiesService } from "./submatrix-utilities.service";

import type {
  Matrix,
  MatrixPoint,
  MatrixPointArm,
} from "../../matrix/matrix.types";

/** A point carrying exactly the named arms. */
function point(...arms: MatrixPointArm[]): MatrixPoint {
  return {
    east: arms.includes("east"),
    north: arms.includes("north"),
    south: arms.includes("south"),
    west: arms.includes("west"),
  };
}

describe(SubmatrixUtilitiesService, () => {
  let service: SubmatrixUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [SubmatrixUtilitiesService],
    }).compile();

    service = await module.resolve(SubmatrixUtilitiesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("countPointsWithExactArms", () => {
    const matrix: Matrix = [
      [point(), point("east", "west"), point("north", "east")],
      [point("north", "east", "west"), point(), point("east", "west")],
    ];

    it("counts only points whose arms are exactly the named set", () => {
      expect(service.countPointsWithExactArms(matrix, ["east", "west"])).toBe(
        2,
      );
      expect(service.countPointsWithExactArms(matrix, ["north", "east"])).toBe(
        1,
      );
    });

    it("treats an empty arm set as a bare point", () => {
      expect(service.countPointsWithExactArms(matrix, [])).toBe(2);
    });

    it("ignores the order the arms are named in", () => {
      expect(service.countPointsWithExactArms(matrix, ["west", "east"])).toBe(
        2,
      );
    });

    it("counts nothing in an empty matrix", () => {
      expect(service.countPointsWithExactArms([], [])).toBe(0);
    });
  });

  describe("countPointsWithArm", () => {
    const matrix: Matrix = [
      [point("north"), point("north", "south"), point("east")],
      [
        point("north", "east", "west"),
        point(),
        point("north", "east", "south", "west"),
      ],
    ];

    it("counts every point carrying the arm, whatever its other arms", () => {
      expect(service.countPointsWithArm(matrix, "north")).toBe(4);
      expect(service.countPointsWithArm(matrix, "east")).toBe(3);
    });

    it("skips points without the arm", () => {
      expect(service.countPointsWithArm(matrix, "south")).toBe(2);
      expect(service.countPointsWithArm(matrix, "west")).toBe(2);
    });

    it("counts nothing in an empty matrix", () => {
      expect(service.countPointsWithArm([], "north")).toBe(0);
    });
  });

  describe("pointDigitAt", () => {
    const matrix: Matrix = [[point("north", "east"), point("south", "west")]];

    it("spells a point's arms as its hexadecimal Code digit", () => {
      expect(service.pointDigitAt(matrix, 0, 0)).toBe(10);
      expect(service.pointDigitAt(matrix, 0, 1)).toBe(5);
    });

    it("wraps columns in both directions", () => {
      expect(service.pointDigitAt(matrix, 0, 2)).toBe(10);
      expect(service.pointDigitAt(matrix, 0, -1)).toBe(5);
    });

    it("reads -1 past the top or bottom row", () => {
      expect(service.pointDigitAt(matrix, -1, 0)).toBe(-1);
      expect(service.pointDigitAt(matrix, 1, 0)).toBe(-1);
    });
  });

  describe("digitGrid", () => {
    it("spells every point's arms as its hexadecimal Code digit, row by row", () => {
      const matrix: Matrix = [
        [point("north", "east"), point("south", "west")],
        [point(), point("north", "south", "east", "west")],
      ];

      expect(service.digitGrid(matrix)).toStrictEqual([
        [10, 5],
        [0, 15],
      ]);
    });

    it("reads an empty matrix as an empty grid", () => {
      expect(service.digitGrid([])).toStrictEqual([]);
    });
  });

  describe("countIsolatedGlyphs", () => {
    const square: Matrix = [
      [point("south", "east"), point("south", "west"), point()],
      [point("north", "east"), point("north", "west"), point()],
    ];

    it("counts windows whose glyph points carry exactly the template's arms", () => {
      expect(service.countIsolatedGlyphs(square, ["65", "a9"])).toBe(1);
    });

    it("treats a blank template cell as outside the glyph, whatever ink it holds", () => {
      const beside: Matrix = [
        [point("south", "east"), point("south", "west"), point("south")],
        [point("north", "east"), point("north", "west"), point("north")],
      ];

      expect(service.countIsolatedGlyphs(beside, ["65.", "a9."])).toBe(1);
    });

    it("refuses a glyph with an arm its template lacks", () => {
      const joined: Matrix = [
        [point("south", "east"), point("south", "west", "east"), point("west")],
        [point("north", "east"), point("north", "west"), point()],
      ];

      expect(service.countIsolatedGlyphs(joined, ["65", "a9"])).toBe(0);
    });

    it("checks every glyph point, the first as much as the last", () => {
      const joinedAcrossTheSeam: Matrix = [
        [point("south", "east", "west"), point("south", "west"), point("east")],
        [point("north", "east"), point("north", "west"), point()],
      ];

      expect(
        service.countIsolatedGlyphs(joinedAcrossTheSeam, ["65", "a9"]),
      ).toBe(0);
    });

    it("checks the last glyph point too, refusing a stray arm on it alone", () => {
      const joinedAtTheLastPoint: Matrix = [
        [point("south", "east"), point("south", "west"), point()],
        [point("north", "east"), point("north", "west", "east"), point("west")],
      ];

      expect(
        service.countIsolatedGlyphs(joinedAtTheLastPoint, ["65", "a9"]),
      ).toBe(0);
    });

    it("matches a glyph that crosses the tile's seam", () => {
      const seam: Matrix = [
        [point("south", "west"), point(), point("south", "east")],
        [point("north", "west"), point(), point("north", "east")],
      ];

      expect(service.countIsolatedGlyphs(seam, ["65", "a9"])).toBe(1);
    });

    it("counts nothing when the glyph is wider than the tile or taller than the band", () => {
      // Two points whose digits repeat exactly around a 2-column tile: a
      // template naively wrapped past the guard would still match this
      // template at column 0, so the guard is what keeps the count at 0.
      const twoColumns: Matrix = [
        [point("south", "west"), point("north", "east")],
      ];

      expect(service.countIsolatedGlyphs(twoColumns, ["5a5a"])).toBe(0);
      expect(service.countIsolatedGlyphs(square, ["4", "c", "8"])).toBe(0);
      expect(service.countIsolatedGlyphs([], ["4", "8"])).toBe(0);
    });
  });

  describe("glyphFormula", () => {
    it("typesets the template as a matrix of digits with blanks as dots", () => {
      expect(service.glyphFormula(["4.", "a1"])).toBe(
        String.raw`\left|\left\{\, W \subseteq M : W \equiv \begin{matrix} 4 & \cdot \\ a & 1 \end{matrix},\ W \text{ isolated} \,\right\}\right|`,
      );
    });
  });

  describe("glyphWindow", () => {
    it("measures a template as one column per character and one row per line", () => {
      expect(service.glyphWindow(["4.", "a1", "8."])).toStrictEqual({
        columns: 2,
        rows: 3,
      });
    });

    it("counts a blank cell toward the window like a glyph point", () => {
      expect(service.glyphWindow(["..4", "6a9"])).toStrictEqual({
        columns: 3,
        rows: 2,
      });
    });
  });
});
