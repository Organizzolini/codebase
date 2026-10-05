import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { RectangleUtilitiesService } from "./rectangle-utilities.service";

import type {
  Matrix,
  MatrixPoint,
  MatrixPointArm,
} from "../../../matrix/matrix.types";

/** A point carrying exactly the named arms. */
function point(...arms: MatrixPointArm[]): MatrixPoint {
  return {
    east: arms.includes("east"),
    north: arms.includes("north"),
    south: arms.includes("south"),
    west: arms.includes("west"),
  };
}

describe(RectangleUtilitiesService, () => {
  let service: RectangleUtilitiesService;

  /** Counts every isolated rectangle, whatever its proportions. */
  function countAny(matrix: Matrix): number {
    return service.countIsolatedRectangles(matrix, () => true);
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [RectangleUtilitiesService, SubmatrixUtilitiesService],
    }).compile();

    service = await module.resolve(RectangleUtilitiesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("countIsolatedRectangles", () => {
    const box: Matrix = [
      [point("south", "east"), point("east", "west"), point("south", "west")],
      [point("north", "east"), point("east", "west"), point("north", "west")],
    ];

    it("measures a ring's width and height in edges", () => {
      const sizes: string[] = [];

      service.countIsolatedRectangles(box, (width, height) => {
        sizes.push(`${String(width)}x${String(height)}`);

        return true;
      });

      expect(sizes).toStrictEqual(["2x1"]);
    });

    it("finds nothing in an empty matrix", () => {
      expect(countAny([])).toBe(0);
    });

    it("refuses a ring whose far side never closes", () => {
      const open: Matrix = [
        [point("south", "east"), point("east", "west"), point("east", "west")],
        [point("north", "east"), point("east", "west"), point("east", "west")],
      ];

      expect(countAny(open)).toBe(0);
    });

    it("refuses a ring whose bottom edge is broken", () => {
      const broken: Matrix = [
        [point("south", "east"), point("east", "west"), point("south", "west")],
        [point("north", "east"), point(), point("north", "west")],
      ];

      expect(countAny(broken)).toBe(0);
    });

    it("counts a ring exactly columns - 1 edges wide (03x02y635a39)", () => {
      // box is 3 columns wide with a 2-edge-wide ring — the widest a ring can
      // be without overlapping its own repeat across the tile's seam.
      expect(countAny(box)).toBe(1);
    });

    it("finds nothing in a matrix with a single row (03x01y210)", () => {
      const oneRow: Matrix = [[point("east"), point("west"), point()]];

      expect(countAny(oneRow)).toBe(0);
    });

    it("finds nothing in a matrix with a single column (01x03y4c8)", () => {
      const oneColumn: Matrix = [
        [point("south")],
        [point("north", "south")],
        [point("north")],
      ];

      expect(countAny(oneColumn)).toBe(0);
    });
  });
});
