import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { environmentSchema } from "../../constants";
import { CodeService } from "../code/code.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { OversizedTileError } from "./enumeration.constants";
import { TileEnumerationService } from "./tile-enumeration.service";

import type { Environment } from "./enumeration.types";

/** Builds a fresh {@link TileEnumerationService} against a configured environment, defaulting to today's unconfigured values. */
async function createService(
  overrides: Partial<Environment> = {},
): Promise<TileEnumerationService> {
  const environment = environmentSchema.parse(overrides);
  const module = await Test.createTestingModule({
    providers: [
      CodeService,
      SymmetryService,
      TileService,
      TileEnumerationService,
      {
        provide: ConfigService,
        useValue: {
          get: (key: keyof Environment) => environment[key],
        },
      },
    ],
  }).compile();

  return module.resolve(TileEnumerationService);
}

// 🔧 Configuration

/**
 * The eleven shapes the `mosaic` half of the corpus commits — every shape a
 * budget of sixteen admitted up to five rows — with the tile counts each
 * holds: how many the family enumerates now, and how many of those the
 * original exact-cover rule would have found. Today's budget admits all of
 * them and more; `enumeration.service.unit.test.ts` lists the rest.
 *
 * Written out rather than derived, because these numbers are the thing being
 * asserted. A change to the enumeration rule that resized the space would
 * pass a derived table and fails this one.
 */
const ADMITTED_SHAPES: readonly {
  readonly columns: number;
  readonly matchings: number;
  readonly rows: number;
  readonly tiles: number;
}[] = [
  { columns: 1, matchings: 4, rows: 2, tiles: 6 },
  { columns: 2, matchings: 6, rows: 2, tiles: 21 },
  { columns: 3, matchings: 9, rows: 2, tiles: 74 },
  { columns: 4, matchings: 20, rows: 2, tiles: 354 },
  { columns: 5, matchings: 36, rows: 2, tiles: 1884 },
  { columns: 1, matchings: 8, rows: 3, tiles: 20 },
  { columns: 2, matchings: 15, rows: 3, tiles: 204 },
  { columns: 3, matchings: 33, rows: 3, tiles: 3100 },
  { columns: 1, matchings: 18, rows: 4, tiles: 72 },
  { columns: 2, matchings: 50, rows: 4, tiles: 2544 },
  { columns: 1, matchings: 40, rows: 5, tiles: 272 },
];

// 🧪 Tests

describe(TileEnumerationService, () => {
  let service: TileEnumerationService;
  let codeService: CodeService;
  let symmetryService: SymmetryService;
  let tileService: TileService;

  beforeAll(async () => {
    const environment = environmentSchema.parse({});
    const module = await Test.createTestingModule({
      providers: [
        CodeService,
        SymmetryService,
        TileService,
        TileEnumerationService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: keyof Environment) => environment[key],
          },
        },
      ],
    }).compile();

    service = await module.resolve(TileEnumerationService);
    codeService = await module.resolve(CodeService);
    symmetryService = await module.resolve(SymmetryService);
    tileService = await module.resolve(TileService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("the edge budget", () => {
    it("pins the eleven `mosaic` shapes, none of them above five rows", () => {
      expect(
        ADMITTED_SHAPES.map(({ columns, rows }) => `${rows}x${columns}`),
      ).toStrictEqual([
        "2x1",
        "2x2",
        "2x3",
        "2x4",
        "2x5",
        "3x1",
        "3x2",
        "3x3",
        "4x1",
        "4x2",
        "5x1",
      ]);
    });

    it("gives a shallower band more columns, since a tile's edge count grows in both dimensions at once", () => {
      expect(service.maximumColumns(2)).toBe(8);
      expect(service.maximumColumns(3)).toBe(4);
      expect(service.maximumColumns(4)).toBe(3);
      expect(service.maximumColumns(5)).toBe(2);
      expect(service.maximumColumns(7)).toBe(1);
    });

    it("counts a shape's edges as columns times two rows less one", () => {
      expect(service.edges({ columns: 2, rows: 4 })).toBe(14);
      expect(service.edges({ columns: 5, rows: 2 })).toBe(15);
    });

    /**
     * The shape the negative-space survey measured, which the budget no
     * longer admits.
     *
     * `README.md` reports 2,013 folded tiles at 7 rows and 2 columns from
     * 11,275 unfolded — under the old exact-cover rule. Without a degree
     * ceiling that same shape holds 2 ** 26 assignments, which is what the
     * budget exists to refuse: the shapes the matching rule made cheap are
     * exactly the ones an unbounded degree makes ruinous.
     */
    it("refuses a shape past the budget rather than enumerating it slowly", () => {
      expect(service.isAdmitted({ columns: 2, rows: 7 })).toBe(false);
      expect(() => service.enumerate(7, 2)).toThrow(OversizedTileError);
    });
  });

  describe("the configured edge budget", () => {
    it("reads a smaller budget than today's default from the environment", async () => {
      const configured = await createService({ DRAW_EDGE_BUDGET: 10 });

      expect(configured.isAdmitted({ columns: 3, rows: 2 })).toBe(true);
      expect(configured.isAdmitted({ columns: 4, rows: 2 })).toBe(false);
      expect(configured.maximumColumns(2)).toBe(3);
    });

    it("names the configured budget rather than today's default in a refusal", async () => {
      const configured = await createService({ DRAW_EDGE_BUDGET: 10 });

      expect(() => configured.enumerate(2, 4)).toThrow(
        /past the budget of 10/u,
      );
    });

    // 🎯 The schema always supplies a default, so `ConfigService.get` never
    // actually returns `undefined` for this key in a running application —
    // this exercises the `??` fallback in isolation, as defensive coding
    // against `ConfigService`'s own loosely-typed `get` signature.
    it("falls back to today's default when the environment leaves the budget unset", async () => {
      const module = await Test.createTestingModule({
        providers: [
          CodeService,
          SymmetryService,
          TileService,
          TileEnumerationService,
          {
            provide: ConfigService,
            useValue: { get: () => undefined },
          },
        ],
      }).compile();
      const unset = await module.resolve(TileEnumerationService);

      expect(unset.isAdmitted({ columns: 8, rows: 2 })).toBe(true);
      expect(unset.isAdmitted({ columns: 9, rows: 2 })).toBe(false);
    });
  });

  describe("enumerate", () => {
    it("reaches every one of the sixteen direction-bit patterns a point can carry", () => {
      const seen = new Set(
        service
          .enumerate(3, 3)
          .flatMap((tile) =>
            tile.points.flatMap((row) =>
              row.map(
                ({ east, north, south, west }) =>
                  `${Number(north)}${Number(south)}${Number(east)}${Number(west)}`,
              ),
            ),
          ),
      );

      // Three rows and three columns is the smallest shape a crossing fits
      // in: a point needs a row above and below it for its northward and
      // southward edges, and three columns for its eastward and westward
      // ones to be two different edges rather than one wrapped pair.
      expect(seen.size).toBe(16);
    });

    it.each(ADMITTED_SHAPES)(
      "draws a T-junction and a crossing somewhere in the space at $rows rows and $columns columns",
      ({ columns, rows }) => {
        const degrees = service
          .enumerate(rows, columns)
          .flatMap((tile) =>
            tile.points.flatMap((row) =>
              row.map((point) => tileService.degree(point)),
            ),
          );

        expect(Math.max(...degrees)).toBeGreaterThanOrEqual(3);
      },
    );

    it("returns one tile per symmetry class, never two that draw the same pattern", () => {
      const tiles = service.enumerate(3, 2);
      const identifiers = tiles.map((tile) => codeService.spellCanonical(tile));

      expect(new Set(identifiers).size).toBe(tiles.length);
    });

    it("orders tiles by the key it folds on, so a draw run is stable across runs", () => {
      const keys = service
        .enumerate(4, 1)
        .map((tile) => symmetryService.edgeKey(tile));

      expect(keys).toStrictEqual(keys.toSorted());
    });

    it("returns the representative of each class rather than whichever member the walk reached first", () => {
      for (const tile of service.enumerate(4, 2)) {
        expect(symmetryService.canonicalTile(tile)).toStrictEqual(tile);
      }
    });

    it("includes the three named members of the family at 5 rows", () => {
      const singleColumn = service
        .enumerate(5, 1)
        .map((tile) => codeService.spellCanonical(tile));
      const twoColumn = service
        .enumerate(4, 2)
        .map((tile) => codeService.spellCanonical(tile));

      // `dots` is a bare point on every row, so `0` throughout;
      // `lines` is the single column's wrapped rule on every row, so `3`
      // — east and west — throughout; `dashes` alternates the anchor `2`
      // with the point `1` it reaches across a two-column tile.
      expect(singleColumn).toContain("01x05y00000");
      expect(singleColumn).toContain("01x05y33333");
      expect(twoColumn).toContain("02x04y21212121");
    });

    it("finds only the dot and the line at the smallest tile there is", () => {
      const identifiers = service
        .enumerate(3, 1)
        .map((tile) => codeService.spellCanonical(tile));

      // Three rows, one column. Every point bare, every point on
      // the wrapped rule, and a southward edge over the lower two rows —
      // the last being the representative its own top-to-bottom mirror
      // folds onto.
      expect(identifiers).toContain("01x03y000");
      expect(identifiers).toContain("01x03y333");
      expect(identifiers).toContain("01x03y048");
    });

    // 🎯 The walk keeps one assignment per symmetry class without building
    // the rest, so it is checked against the walk it replaced: build every
    // assignment, fold each to its class's representative, keep the
    // distinct ones. The two must name exactly the same tiles.
    it.each(
      ADMITTED_SHAPES.filter(
        ({ columns, rows }) => columns * (2 * rows - 1) <= 12,
      ),
    )(
      "keeps exactly the classes a walk over every assignment finds, at $rows rows and $columns columns",
      ({ columns, rows }) => {
        const shape = { columns, rows };
        const everyClass = new Set<string>();

        for (let mask = 0; mask < 2 ** service.edges(shape); mask += 1) {
          everyClass.add(
            symmetryService.edgeKey(
              symmetryService.canonicalTile(service.tile(shape, mask)),
            ),
          );
        }

        expect(
          service
            .enumerate(rows, columns)
            .map((tile) => symmetryService.edgeKey(tile)),
        ).toStrictEqual(
          [...everyClass].toSorted((first, second) =>
            first.localeCompare(second),
          ),
        );
      },
    );

    it("keeps one bitmask per symmetry class, which is how many tiles a shape enumerates", () => {
      expect(service.orbitMinima(3, 3)).toHaveLength(
        service.enumerate(3, 3).length,
      );
    });

    it("reads a bitmask's set bits as the edges of a tile, in edge-key order", () => {
      expect(
        symmetryService.edgeKey(
          service.tile({ columns: 2, rows: 2 }, 0b100101),
        ),
      ).toBe("101001");
    });

    it.each(ADMITTED_SHAPES)(
      "enumerates $tiles distinct tiles at $rows rows and $columns columns",
      ({ columns, rows, tiles }) => {
        expect(service.enumerate(rows, columns)).toHaveLength(tiles);
      },
    );

    it("enumerates 8,551 tiles across the whole space the budget admits", () => {
      const total = ADMITTED_SHAPES.reduce(
        (running, { columns, rows }) =>
          running + service.enumerate(rows, columns).length,
        0,
      );

      expect(total).toBe(8551);
    });

    /**
     * The claim that makes this a widening rather than a replacement.
     *
     * The family's original rule was one incident edge per point — an exact
     * cover of its cells. That is a region strictly inside a ceiling of two
     * direction bits, so filtering the wider enumeration down to it has to
     * return exactly the set the narrower rule returned, shape for shape.
     * The five shapes the old draw run committed are the last five rows here,
     * and 8 / 15 / 18 / 50 / 40 are the file counts those directories held.
     */
    it.each(ADMITTED_SHAPES)(
      "still finds the $matchings tiles the old exact-cover rule found at $rows rows and $columns columns",
      ({ columns, matchings, rows }) => {
        const covers = service
          .enumerate(rows, columns)
          .filter((tile) => service.isMatching(tile));

        expect(covers).toHaveLength(matchings);
      },
    );

    it("returns tiles whose direction bits agree, so every one of them denotes a drawing", () => {
      const tiles = service.enumerate(3, 3);
      const malformed = tiles.filter((tile) => {
        try {
          tileService.assertWellFormed(tile);

          return tile.points.length !== tile.rows;
        } catch {
          return true;
        }
      });

      expect(tiles.length).toBeGreaterThan(0);
      expect(malformed).toStrictEqual([]);
    });
  });
});
