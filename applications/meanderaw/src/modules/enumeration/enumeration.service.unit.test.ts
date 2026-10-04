import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { environmentSchema } from "../../constants";
import { CodeService } from "../code/code.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { EnumerationService } from "./enumeration.service";
import { TileEnumerationService } from "./tile-enumeration.service";

import type { Environment } from "./enumeration.types";

/** Builds a fresh {@link EnumerationService} against a configured environment, defaulting to today's unconfigured values. */
async function createService(
  overrides: Partial<Environment> = {},
): Promise<EnumerationService> {
  const environment = environmentSchema.parse(overrides);
  const module = await Test.createTestingModule({
    providers: [
      CodeService,
      EnumerationService,
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

  return module.resolve(EnumerationService);
}

// 🧪 Tests

describe(EnumerationService, () => {
  let service: EnumerationService;

  beforeAll(async () => {
    const environment = environmentSchema.parse({});
    const module = await Test.createTestingModule({
      providers: [
        CodeService,
        EnumerationService,
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

    service = await module.resolve(EnumerationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("shapes", () => {
    // 🎯 The whole draw run, as the two numbers that decide it: the edge budget,
    // and the shallowest repeat worth walking. Eleven of these twenty-five
    // shapes are the ones the `mosaic` half of the corpus already commits;
    // the rest are what a budget of twenty-four admits past that family's own
    // row and column ceilings — eight columns at two rows, and single
    // columns down to twelve rows.
    it("draws every shape the edge budget admits, from the shallowest repeat upward", () => {
      expect(
        service.shapes().map(({ columns, rows }) => `${rows}r${columns}c`),
      ).toStrictEqual([
        "2r1c",
        "2r2c",
        "2r3c",
        "2r4c",
        "2r5c",
        "2r6c",
        "2r7c",
        "2r8c",
        "3r1c",
        "3r2c",
        "3r3c",
        "3r4c",
        "4r1c",
        "4r2c",
        "4r3c",
        "5r1c",
        "5r2c",
        "6r1c",
        "6r2c",
        "7r1c",
        "8r1c",
        "9r1c",
        "10r1c",
        "11r1c",
        "12r1c",
      ]);
    });

    it("admits every shape it draws, so no shape is refused for want of budget once the draw run has begun", () => {
      expect(service.shapes().every((shape) => service.isAdmitted(shape))).toBe(
        true,
      );
    });
  });

  describe("bounded by configured rows and columns", () => {
    it("stops the draw run at the configured maximum rows, layered on top of the edge budget", async () => {
      const bounded = await createService({ DRAW_MAXIMUM_ROWS: 3 });

      expect(
        bounded.shapes().map(({ columns, rows }) => `${rows}r${columns}c`),
      ).toStrictEqual([
        "2r1c",
        "2r2c",
        "2r3c",
        "2r4c",
        "2r5c",
        "2r6c",
        "2r7c",
        "2r8c",
        "3r1c",
        "3r2c",
        "3r3c",
        "3r4c",
      ]);
    });

    it("narrows the widest column span at each row to the configured maximum columns", async () => {
      const bounded = await createService({ DRAW_MAXIMUM_COLUMNS: 2 });

      expect(
        bounded.shapes().map(({ columns, rows }) => `${rows}r${columns}c`),
      ).toStrictEqual([
        "2r1c",
        "2r2c",
        "3r1c",
        "3r2c",
        "4r1c",
        "4r2c",
        "5r1c",
        "5r2c",
        "6r1c",
        "6r2c",
        "7r1c",
        "8r1c",
        "9r1c",
        "10r1c",
        "11r1c",
        "12r1c",
      ]);
    });

    it("leaves the draw run exactly as it is today when both bounds are left unconfigured", async () => {
      const unconfigured = await createService();

      expect(unconfigured.shapes()).toStrictEqual(service.shapes());
    });

    // 🎯 The schema always supplies a default, so `ConfigService.get` never
    // actually returns `undefined` for these keys in a running application —
    // this exercises the `??` fallback in isolation, as defensive coding
    // against `ConfigService`'s own loosely-typed `get` signature.
    it("falls back to unbounded rows and columns when the environment leaves them unset", async () => {
      const module = await Test.createTestingModule({
        providers: [
          CodeService,
          EnumerationService,
          SymmetryService,
          TileService,
          TileEnumerationService,
          {
            provide: ConfigService,
            useValue: { get: () => undefined },
          },
        ],
      }).compile();
      const unset = await module.resolve(EnumerationService);

      expect(unset.shapes()).toStrictEqual(service.shapes());
    });
  });

  describe("enumerate", () => {
    // 🎯 The counts the `mosaic` half of the corpus is committed at, which
    // this enumeration reproduces exactly — the same walk over the same
    // space, folded by the same symmetry group, now run for every family
    // rather than for one.
    it.each([
      { columns: 1, count: 6, rows: 2 },
      { columns: 2, count: 21, rows: 2 },
      { columns: 3, count: 74, rows: 2 },
      { columns: 1, count: 20, rows: 3 },
      { columns: 1, count: 72, rows: 4 },
      { columns: 1, count: 272, rows: 5 },
    ])(
      "finds $count distinct meanders at $rows rows and $columns columns",
      ({ columns, count, rows }) => {
        expect(service.enumerate({ columns, rows })).toHaveLength(count);
      },
    );

    // 🎯 The whole space at its smallest shape, spelled out: two inked dots,
    // one vertical bar, one wrapped rule, a bar beside a rule, two rules —
    // which is the `lines` region — and every edge there is, which is
    // `mesh`. The order is the canonical edge key's, which is what makes the
    // draw run stable across runs rather than dependent on which member of a
    // symmetry class the walk happened to reach first.
    it("spells each one by its Code, at the shape it was enumerated at", () => {
      expect(service.enumerate({ columns: 1, rows: 2 })).toStrictEqual([
        { code: "01x02y00", columns: 1, rows: 2 },
        { code: "01x02y48", columns: 1, rows: 2 },
        { code: "01x02y03", columns: 1, rows: 2 },
        { code: "01x02y4b", columns: 1, rows: 2 },
        { code: "01x02y33", columns: 1, rows: 2 },
        { code: "01x02y7b", columns: 1, rows: 2 },
      ]);
    });

    it("produces no two meanders sharing a Code, since a Code is a meander's whole identity", () => {
      const codes = service
        .enumerate({ columns: 2, rows: 3 })
        .map(({ code }) => code);

      expect(new Set(codes).size).toBe(codes.length);
    });

    it("refuses a shape the budget does not admit, rather than walking it slowly", () => {
      expect(() => service.enumerate({ columns: 3, rows: 5 })).toThrow(
        /past the budget/u,
      );
    });
  });
});
