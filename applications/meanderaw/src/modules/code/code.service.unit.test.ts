import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildTile } from "../../../testing/tiles";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import {
  InvalidCodeCharacterError,
  InvalidCodeFormatError,
  InvalidCodeLengthError,
} from "./code.constants";
import { CodeService } from "./code.service";

import type { Tile } from "../tile/tile.types";

// 🔧 Configuration

/** The point that carries no ink at all, which is what a position off the Code reads as. */
const BARE = { east: false, north: false, south: false, west: false };

// 🧪 Tests

describe(CodeService, () => {
  let service: CodeService;
  let symmetryService: SymmetryService;

  // Five rows, one column: five interior rows whose top point sends a
  // southward edge, then a bare point, then the wrapped east-west rule,
  // then another bare point.
  const singleColumn = buildTile(["s", ".", ".", "e", "."]);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CodeService, SymmetryService, TileService],
    }).compile();

    service = await module.resolve(CodeService);
    symmetryService = await module.resolve(SymmetryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("directionsAt", () => {
    it("returns bare point if row is below 0", () => {
      const parsed = service.parse("02x02y36c9r01");

      expect(service.directionsAt(parsed, -1, 0)).toStrictEqual(BARE);
    });

    it("returns bare point if row is beyond maximum rows", () => {
      const parsed = service.parse("02x02y36c9r01");

      expect(service.directionsAt(parsed, 2, 0)).toStrictEqual(BARE);
    });

    it("returns bare point if column is below 0", () => {
      const parsed = service.parse("02x02y36c9r01");

      expect(service.directionsAt(parsed, 0, -1)).toStrictEqual(BARE);
    });

    it("returns bare point if column is beyond maximum columns", () => {
      const parsed = service.parse("02x02y36c9r01");

      expect(service.directionsAt(parsed, 0, 2)).toStrictEqual(BARE);
    });

    it("returns decoded directions if within bounds", () => {
      const parsed = service.parse("02x02y36c9r01");

      expect(service.directionsAt(parsed, 0, 0)).toStrictEqual({
        east: true,
        north: false,
        south: false,
        west: true,
      });
    });

    it.each([
      ["0", BARE],
      ["3", { ...BARE, east: true, west: true }],
      ["c", { ...BARE, north: true, south: true }],
      ["6", { ...BARE, east: true, south: true }],
      ["f", { east: true, north: true, south: true, west: true }],
    ])("reads %s as the four bits it spells", (digit, directions) => {
      expect(
        service.directionsAt(service.parse(digit, 1, 1), 0, 0),
      ).toStrictEqual(directions);
    });

    it("finds a point at row times columns plus column, which is the whole of the addressing", () => {
      const code = service.parse("0369", 2, 2);

      expect(service.directionsAt(code, 0, 0)).toStrictEqual(BARE);
      expect(service.directionsAt(code, 1, 1)).toStrictEqual({
        ...BARE,
        north: true,
        west: true,
      });
    });

    it.each([
      ["a row past the last", 2, 0],
      ["a row before the first", -1, 0],
      ["a column past the last", 0, 2],
      ["a column before the first", 0, -1],
    ])(
      "reads %s as carrying no ink, since nothing is there to be inked",
      (_name, row, column) => {
        expect(
          service.directionsAt(service.parse("0369", 2, 2), row, column),
        ).toStrictEqual(BARE);
      },
    );

    it("returns empty directions when rows are out of bounds", () => {
      expect(
        service.directionsAt(
          { columns: 1, digits: "0", repeats: 1, rows: 0 },
          0,
          0,
        ),
      ).toStrictEqual({
        east: false,
        north: false,
        south: false,
        west: false,
      });
    });

    it("returns empty directions when columns are out of bounds", () => {
      const code = service.parse("0", 1, 1);

      expect(service.directionsAt(code, 0, -1)).toStrictEqual({
        east: false,
        north: false,
        south: false,
        west: false,
      });
      expect(service.directionsAt(code, 0, 1)).toStrictEqual({
        east: false,
        north: false,
        south: false,
        west: false,
      });
    });

    it("handles out of bounds indices when array lookup fails but coordinates are within limits", () => {
      // Create an artificial code object with mismatched digits vs dimensions
      const code = {
        columns: 2,
        digits: "f",
        repeats: 1,
        rows: 1,
      };

      // The length is 1, but we ask for [0 * 2 + 1] = [1]
      expect(service.directionsAt(code, 0, 1)).toStrictEqual({
        east: false,
        north: false,
        south: false,
        west: false,
      });
    });
  });

  describe("format", () => {
    it("formats a CodeObject without repeats segment when repeats is 1", () => {
      expect(
        service.format({
          columns: 2,
          digits: "36c9",
          repeats: 1,
          rows: 2,
        }),
      ).toBe("02x02y36c9");
    });

    it("formats larger column and row counts properly and includes repeats suffix when repeats > 1", () => {
      expect(
        service.format({
          columns: 12,
          digits: "0".repeat(24),
          repeats: 3,
          rows: 2,
        }),
      ).toBe(`12x02y${"0".repeat(24)}r03`);
    });
  });

  describe("parse", () => {
    it("parses a self-contained Code string with padded numbers", () => {
      expect(service.parse("02x02y36c9r01")).toStrictEqual({
        columns: 2,
        digits: "36c9",
        repeats: 1,
        rows: 2,
      });
    });

    it("parses a self-contained Code string without the repeats segment, defaulting to 1", () => {
      expect(service.parse("02x02y36c9")).toStrictEqual({
        columns: 2,
        digits: "36c9",
        repeats: 1,
        rows: 2,
      });
    });

    it("parses case-insensitively and normalizes digits to lowercase", () => {
      expect(service.parse("02X02Y36CAr03")).toStrictEqual({
        columns: 2,
        digits: "36ca",
        repeats: 3,
        rows: 2,
      });
    });

    it("reads bare hexadecimal digits when rows and columns are passed", () => {
      expect(service.parse("36c9", 2, 2)).toStrictEqual({
        columns: 2,
        digits: "36c9",
        repeats: 1,
        rows: 2,
      });
    });

    it("throws InvalidCodeFormatError if the code is invalid without rows and columns", () => {
      expect(() => service.parse("invalid-code")).toThrow(
        InvalidCodeFormatError,
      );
    });

    it("refuses a Code whose length disagrees with the rows and columns", () => {
      expect(() => service.parse("02x02y36cr01")).toThrow(
        InvalidCodeLengthError,
      );
      expect(() => service.parse("36c", 2, 2)).toThrow(InvalidCodeLengthError);
    });

    it("refuses a character outside the hexadecimal alphabet", () => {
      expect(() => service.parse("02x02y36czr01")).toThrow(
        InvalidCodeCharacterError,
      );
      expect(() => service.parse("36cz", 2, 2)).toThrow(
        InvalidCodeCharacterError,
      );
    });
  });

  describe("reduceToUnit", () => {
    it("returns unmodified code if it has 0 columns", () => {
      expect(
        service.reduceToUnit({
          columns: 0,
          digits: "",
          repeats: 1,
          rows: 1,
        }),
      ).toStrictEqual({
        columns: 0,
        digits: "",
        repeats: 1,
        rows: 1,
      });
    });

    it("finds the smallest repeating sub-tile", () => {
      const code = service.parse("3366cc99", 4, 2);

      expect(service.reduceToUnit(code)).toStrictEqual({
        columns: 1,
        digits: "36c9",
        repeats: 1,
        rows: 4,
      });
    });

    it("returns the original Code if it is not repeating", () => {
      const code = service.parse("36c9", 4, 1);

      expect(service.reduceToUnit(code)).toStrictEqual(code);
    });

    it("reduces across multiple repeating pieces", () => {
      const code = service.parse("36369c9c", 2, 4);

      expect(service.reduceToUnit(code)).toStrictEqual({
        columns: 2,
        digits: "369c",
        repeats: 1,
        rows: 2,
      });
    });
  });

  describe("spell", () => {
    it("writes a self-contained Code string in the format {columns}x{rows}y{digits} without r suffix when repeats is 1", () => {
      expect(service.spell(singleColumn)).toBe("01x05y48030");
    });

    it("allows specifying custom repeats count and includes r suffix when repeats > 1", () => {
      expect(service.spell(singleColumn, 3)).toBe("01x05y48030r03");
    });

    it("reads row-major, so a two-column tile interleaves its columns", () => {
      expect(service.spell(buildTile(["e.", ".."]))).toBe("02x02y2100");
      expect(service.spell(buildTile([".e", ".."]))).toBe("02x02y1200");
    });

    it("writes a single column's wrapped edge as both east and west, which is what its ink does", () => {
      expect(service.spell(buildTile(["e"]))).toBe("01x01y3");
      expect(service.spell(buildTile(["e."]))).toBe("02x01y21");
    });

    it("writes a point owning both its edges as one character, which a per-mark letter had none for", () => {
      expect(service.spell(buildTile(["b.", "..", ".."]))).toBe("02x03y618000");
    });

    it("round-trips a tile through a Code and back to the same tile", () => {
      const tile = buildTile(["bs", "e."]);

      expect(service.tile(service.parse(service.spell(tile)))).toStrictEqual(
        tile,
      );
    });

    it("names a tile completely, so two tiles of one shape share it only when they are the same tile", () => {
      expect(service.spell(buildTile(["e.", "e.", ".."]))).not.toBe(
        service.spell(buildTile(["e.", ".e", ".."])),
      );
    });
  });

  describe("spellDigits", () => {
    it("writes one lowercase digit per point in reading order, with no shape prefix", () => {
      expect(service.spellDigits(singleColumn)).toBe("48030");
      expect(service.spellDigits(buildTile(["b.", "..", ".."]))).toBe("618000");
    });

    it("is exactly the digits spell writes", () => {
      const tile = buildTile(["e.", ".e", ".."]);

      expect(service.spell(tile)).toBe(`02x03y${service.spellDigits(tile)}`);
    });

    it("writes nothing for a tile with no rows", () => {
      expect(service.spellDigits({ columns: 1, points: [], rows: 0 })).toBe("");
    });
  });

  describe("spellCanonical", () => {
    it("gives a tile and its own top-to-bottom mirror the same name", () => {
      const flipped = buildTile([".", "e", ".", "s", "."]);

      expect(service.spellCanonical(flipped)).toBe(
        service.spellCanonical(singleColumn),
      );
    });

    it("gives a tile and its own column shift the same name, since shifting only re-phases the pattern", () => {
      expect(service.spellCanonical(buildTile([".e", ".."]))).toBe(
        service.spellCanonical(buildTile(["e.", ".."])),
      );
    });

    it("is the representative's own formatted code string", () => {
      expect(service.spellCanonical(singleColumn)).toBe(
        service.spell(symmetryService.canonicalTile(singleColumn)),
      );
      expect(service.spellCanonical(singleColumn)).toBe("01x05y03048");
    });

    it("keeps two genuinely different tiles apart", () => {
      expect(service.spellCanonical(buildTile(["e.", "e.", ".."]))).not.toBe(
        service.spellCanonical(buildTile(["e.", ".e", ".."])),
      );
    });
  });

  describe("rotate", () => {
    it("shifts every row's own columns west by the same amount", () => {
      const code = service.parse("1230abc0", 4, 2);

      expect(service.rotate(code, 1).digits).toBe("2103ba0c");
    });

    it("leaves the Code alone at a shift of no columns", () => {
      const code = service.parse("36c9", 2, 2);

      expect(service.rotate(code, 0).digits).toBe("36c9");
    });

    it("returns to the Code it started from after a whole span of shifts", () => {
      const code = service.parse("012345", 2, 3);

      expect(service.rotate(code, 3).digits).toBe("012345");
    });

    it("takes a shift past the span modulo it, since every integer names a real phase", () => {
      const code = service.parse("012345", 2, 3);

      expect(service.rotate(code, 4).digits).toBe(
        service.rotate(code, 1).digits,
      );
    });

    it("reads a negative shift as the phase it names rather than refusing it", () => {
      const code = service.parse("012345", 2, 3);

      expect(service.rotate(code, -1).digits).toBe(
        service.rotate(code, 2).digits,
      );
    });

    it("keeps the shape it was given, since re-phasing a band cuts it elsewhere rather than resizing it", () => {
      const rotated = service.rotate(service.parse("012345", 2, 3), 1);

      expect(rotated).toStrictEqual({
        columns: 3,
        digits: "120453",
        repeats: 1,
        rows: 2,
      });
    });
  });

  describe("symmetricalCodes", () => {
    /** Ranks every phase alike, so a phase is chosen by its digits alone. */
    const rankedAlike = (): number => 0;

    /** A tile's Code at its own canonical phase, as a row would store it. */
    const storedCode = (tile: Tile): string =>
      service.format(
        service.canonicalPhase(service.parse(service.spell(tile)), rankedAlike),
      );

    it("is empty for a meander every mirror and flip maps onto itself", () => {
      const bare = service.parse(service.spell(buildTile(["..", ".."])));

      expect(service.symmetricalCodes(bare, rankedAlike)).toStrictEqual([]);
    });

    it("names the flip a meander's own Code cannot reach, and never the meander itself", () => {
      const own = service.canonicalPhase(
        service.parse(service.spell(singleColumn)),
        rankedAlike,
      );

      expect(service.symmetricalCodes(own, rankedAlike)).toStrictEqual([
        storedCode(buildTile([".", "e", ".", "s", "."])),
      ]);
    });

    it("names every member of the symmetry class a shift alone cannot reach, so no member is lost to the fold", () => {
      const tile = buildTile(["s.", ".e", ".."]);
      const own = service.canonicalPhase(
        service.parse(service.spell(tile)),
        rankedAlike,
      );

      expect(
        new Set([
          service.format(own),
          ...service.symmetricalCodes(own, rankedAlike),
        ]),
      ).toStrictEqual(
        new Set(
          symmetryService.variants(tile).map((variant) => storedCode(variant)),
        ),
      );
    });
  });
});
