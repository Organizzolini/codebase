import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { PathUtilitiesService } from "./path-utilities.service";

describe(PathUtilitiesService, () => {
  let service: PathUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PathUtilitiesService],
    }).compile();

    service = await module.resolve(PathUtilitiesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("neighborPairs", () => {
    it("pairs each item with the next along an open sequence", () => {
      expect(service.neighborPairs([1, 2, 3], false)).toStrictEqual([
        [1, 2],
        [2, 3],
      ]);
    });

    it("also pairs the last item with the first along a closed sequence", () => {
      expect(service.neighborPairs([1, 2, 3], true)).toStrictEqual([
        [1, 2],
        [2, 3],
        [3, 1],
      ]);
    });

    it("never pairs a lone item with itself", () => {
      expect(service.neighborPairs([1], true)).toStrictEqual([]);
    });
  });

  describe("longestRun", () => {
    it("reads an open sequence without wrapping", () => {
      expect(service.longestRun([1, -1, -1, 1, 1], false)).toBe(2);
    });

    it("joins the run that wraps around a closed sequence", () => {
      expect(service.longestRun([1, -1, -1, 1, 1], true)).toBe(3);
    });

    it("counts every turn of a closed sequence that never changes hand", () => {
      expect(service.longestRun([-1, -1, -1], true)).toBe(3);
    });

    it("is zero for a strand that never turns", () => {
      expect(service.longestRun([], true)).toBe(0);
      expect(service.longestRun([], false)).toBe(0);
    });
  });

  describe("signedTurns", () => {
    it("drops the straight steps and keeps the left and right turns in order", () => {
      expect(
        service.signedTurns({ closed: false, turns: [0, 1, 0, -1, -1, 0] }),
      ).toStrictEqual([1, -1, -1]);
    });
  });

  describe("strands", () => {
    it("reads nothing from a repeat with no edges", () => {
      expect(service.strands([])).toStrictEqual([]);
    });

    it("reads a single-column self-loop as one closed strand going straight on", () => {
      expect(service.strands([{ from: "0,0", to: "0,0" }])).toStrictEqual([
        { closed: true, turns: [0] },
      ]);
    });

    it("reads a two-column row's pair of edges between the same two points as one closed strand", () => {
      expect(
        service.strands([
          { from: "0,0", to: "0,1" },
          { from: "0,1", to: "0,0" },
        ]),
      ).toStrictEqual([{ closed: true, turns: [0, 0] }]);
    });
  });

  describe("rowTouchCount", () => {
    it("is zero for a row no edge reaches", () => {
      expect(service.rowTouchCount([{ from: "0,0", to: "1,0" }], 2)).toBe(0);
    });

    it("merges a run that wraps across the tile boundary into one touch", () => {
      expect(
        service.rowTouchCount(
          [
            { from: "0,2", to: "0,0" },
            { from: "0,0", to: "0,1" },
          ],
          0,
        ),
      ).toBe(1);
    });

    it("counts each separate run along the row", () => {
      expect(
        service.rowTouchCount(
          [
            { from: "0,0", to: "1,0" },
            { from: "0,2", to: "1,2" },
          ],
          0,
        ),
      ).toBe(2);
    });
  });
});
