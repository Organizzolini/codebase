import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildTile } from "../../../testing/tiles";

import { MalformedTileError } from "./tile.constants";
import { TileService } from "./tile.service";

import type { Directions, Tile } from "./tile.types";

// 🔧 Configuration

/** All four bits clear, to be spread over with whichever ones a case is about. */
const BARE: Directions = {
  east: false,
  north: false,
  south: false,
  west: false,
};

// 🧪 Tests

describe(TileService, () => {
  let service: TileService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TileService],
    }).compile();

    service = await module.resolve(TileService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("build", () => {
    it("gives the point an edge reaches the matching bit, so a pair of neighbors agree", () => {
      const tile = buildTile(["e.", "..", ".."]);

      expect(tile.points[0]?.[0]).toStrictEqual({ ...BARE, east: true });
      expect(tile.points[0]?.[1]).toStrictEqual({ ...BARE, west: true });
    });

    it("gives the point below a southward edge its north bit", () => {
      const tile = buildTile(["s", ".", "."]);

      expect(tile.points[0]?.[0]).toStrictEqual({ ...BARE, south: true });
      expect(tile.points[1]?.[0]).toStrictEqual({ ...BARE, north: true });
    });

    it("wraps an eastward edge on the last column into the first, which is what makes a tile tile", () => {
      const tile = buildTile([".e", ".."]);

      expect(tile.points[0]?.[1]?.east).toBe(true);
      expect(tile.points[0]?.[0]?.west).toBe(true);
    });

    it("sets east and west together at one column, where the edge wraps onto its own point", () => {
      const tile = buildTile(["e", "."]);

      expect(tile.points[0]?.[0]).toStrictEqual({
        ...BARE,
        east: true,
        west: true,
      });
    });

    it("leaves the first row carrying no north and the last carrying no south, since the cap ticks are not tile points", () => {
      const tile = buildTile(["s", "s", "s"]);

      expect(tile.points[0]?.[0]?.north).toBe(false);
      expect(tile.points[2]?.[0]?.south).toBe(false);
    });

    it("gives a tile the same number of rows as strings passed", () => {
      expect(buildTile([".", ".", ".", "."])).toMatchObject({
        columns: 1,
        rows: 4,
      });
    });
  });

  describe("edges", () => {
    it("holds each edge once, at the point that owns it", () => {
      expect(service.edges(buildTile(["e.", ".s", ".."]))).toStrictEqual({
        horizontal: [
          [true, false],
          [false, false],
          [false, false],
        ],
        vertical: [
          [false, false],
          [false, true],
        ],
      });
    });

    it("round-trips a tile through its own edges unchanged", () => {
      const tile = buildTile(["b.", ".s", "e."]);

      expect(
        service.build({ columns: 2, rows: 3 }, service.edges(tile)),
      ).toStrictEqual(tile);
    });

    it("handles sparse edges when building a tile", () => {
      const built = service.build(
        { columns: 1, rows: 2 },
        { horizontal: [], vertical: [] },
      );

      expect(built.points[0]?.[0]).toStrictEqual(BARE);
      expect(built.points[1]?.[0]).toStrictEqual(BARE);
    });
  });

  describe("degree", () => {
    it("counts a bare point as nothing and a dash end as one", () => {
      expect(service.degree(BARE)).toBe(0);
      expect(service.degree({ ...BARE, east: true })).toBe(1);
    });

    it("counts a corner, a T-junction, and a crossing as two, three, and four", () => {
      expect(service.degree({ ...BARE, east: true, south: true })).toBe(2);
      expect(
        service.degree({ ...BARE, east: true, south: true, west: true }),
      ).toBe(3);
      expect(
        service.degree({ east: true, north: true, south: true, west: true }),
      ).toBe(4);
    });

    it("counts a single column's wrapped edge twice, because the ink really does leave both ways", () => {
      const tile = buildTile(["e", "."]);
      const point = tile.points[0]?.[0];

      expect(point && service.degree(point)).toBe(2);
    });
  });

  describe("incidentEdges", () => {
    it("counts a single column's wrapped edge once, because it is one edge", () => {
      expect(service.incidentEdges(buildTile(["e", "."]), 0, 0)).toBe(1);
    });

    it("agrees with the degree wherever an edge joins two different points", () => {
      const tile = buildTile(["e.", "s.", ".."]);

      expect(service.incidentEdges(tile, 0, 0)).toBe(1);
      expect(service.incidentEdges(tile, 1, 0)).toBe(1);
      expect(service.incidentEdges(tile, 2, 0)).toBe(1);
    });

    it("counts nothing at a point outside the tile", () => {
      expect(service.incidentEdges(buildTile(["."]), 4, 4)).toBe(0);
    });
  });

  describe("isBare", () => {
    it("is true of a point on no edge and false of one on any", () => {
      expect(service.isBare(BARE)).toBe(true);
      expect(service.isBare({ ...BARE, north: true })).toBe(false);
    });
  });

  describe("blankEdges and mark", () => {
    it("starts every edge unset, one grid per direction", () => {
      expect(service.blankEdges({ columns: 2, rows: 3 })).toStrictEqual({
        horizontal: [
          [false, false],
          [false, false],
          [false, false],
        ],
        vertical: [
          [false, false],
          [false, false],
        ],
      });
    });

    it("ignores a row the grid does not have, so a caller may walk past the last one", () => {
      const edges = service.blankEdges({ columns: 1, rows: 2 });

      expect(() => service.mark(edges.vertical, 5, 0)).not.toThrow();
      expect(edges.vertical).toStrictEqual([[false]]);
    });
  });

  describe("assertWellFormed", () => {
    it("accepts a tile its own builder produced", () => {
      expect(() =>
        service.assertWellFormed(buildTile(["e.", ".s", ".."])),
      ).not.toThrow();
    });

    it("refuses a grid with the wrong number of rows", () => {
      const tile: Tile = { columns: 1, points: [[BARE]], rows: 5 };

      expect(() => service.assertWellFormed(tile)).toThrow(MalformedTileError);
    });

    it("refuses a row that does not span the tile's own columns", () => {
      const tile: Tile = { columns: 2, points: [[BARE]], rows: 1 };

      expect(() => service.assertWellFormed(tile)).toThrow(MalformedTileError);
    });

    it("refuses a point where the point itself is undefined in the matrix", () => {
      const tile: Tile = { columns: 1, points: [[]], rows: 1 };

      expect(() => service.assertWellFormed(tile)).toThrow(MalformedTileError);
    });

    it("refuses two points that disagree about the edge between them", () => {
      const tile: Tile = {
        columns: 2,
        points: [[{ ...BARE, east: true }, BARE]],
        rows: 1,
      };

      expect(() => service.assertWellFormed(tile)).toThrow(
        /east at row 0 column 0/u,
      );
    });

    it("refuses a southward bit the point below does not answer with a north", () => {
      const tile: Tile = {
        columns: 1,
        points: [[{ ...BARE, south: true }], [BARE]],
        rows: 2,
      };

      expect(() => service.assertWellFormed(tile)).toThrow(
        /south at row 0 column 0/u,
      );
    });

    it("refuses a north on the first row, where the top cap tick is not a tile point", () => {
      const tile: Tile = {
        columns: 1,
        points: [[{ ...BARE, north: true }]],
        rows: 1,
      };

      expect(() => service.assertWellFormed(tile)).toThrow(
        /the first row carries no north/u,
      );
    });

    it("accepts north on non-zero rows when matching south above", () => {
      const tile: Tile = {
        columns: 1,
        points: [[{ ...BARE, south: true }], [{ ...BARE, north: true }]],
        rows: 2,
      };

      expect(() => service.assertWellFormed(tile)).not.toThrow();
    });

    it("refuses ragged rows where point or rightward point is missing", () => {
      const tile: Tile = {
        columns: 2,
        points: [[BARE, undefined as never]],
        rows: 1,
      };

      expect(() => service.assertWellFormed(tile)).toThrow(/row 0 is ragged/u);
    });
  });
});
