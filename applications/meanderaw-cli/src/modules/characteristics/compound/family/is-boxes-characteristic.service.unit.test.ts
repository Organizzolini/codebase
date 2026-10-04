import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { EndsAreLatticeNeighborsCharacteristicService } from "../../path/end/ends-are-lattice-neighbors-characteristic.service";
import { TileCrossingCountCharacteristicService } from "../../path/tile-crossing/tile-crossing-count-characteristic.service";
import { IsSingleArcCharacteristicService } from "../structure/is-single-arc-characteristic.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { IsBoxesCharacteristicService } from "./is-boxes-characteristic.service";
import { IsWaterfallsCharacteristicService } from "./is-waterfalls-characteristic.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsBoxesCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsBoxesCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsBoxesCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "02x03y52a529", expected: true, shape: "a boxed arc" },
      { code: "02x03y255aa1", expected: false, shape: "a waterfall" },
      { code: "04x04y2335635cc29ca339", expected: false, shape: "a whirl" },
      { code: "02x03y56cca9", expected: false, shape: "a closed loop" },
    ])("reports $expected for $shape ($code)", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const base = {
      columns: 3,
      endsAreLatticeNeighbors: false,
      isSingleArc: true,
      isWaterfalls: false,
      rows: 4,
      tileCrossingCount: 1,
    };
    const values = { ...base };
    let service: IsBoxesCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsBoxesCharacteristicService,
          {
            provide: EndsAreLatticeNeighborsCharacteristicService,
            useValue: {
              compute: (): boolean => values.endsAreLatticeNeighbors,
            },
          },
          {
            provide: IsSingleArcCharacteristicService,
            useValue: { compute: (): boolean => values.isSingleArc },
          },
          {
            provide: IsWaterfallsCharacteristicService,
            useValue: { compute: (): boolean => values.isWaterfalls },
          },
          {
            provide: TileCrossingCountCharacteristicService,
            useValue: { compute: (): number => values.tileCrossingCount },
          },
        ],
      }).compile();

      service = await module.resolve(IsBoxesCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "a tile-crossing arc at pitch rows - 1",
      },
      {
        change: { tileCrossingCount: 2 },
        expected: true,
        reason: "two tile crossings",
      },
      {
        change: { columns: 1, rows: 2 },
        expected: true,
        reason: "one column over two rows",
      },
      { change: { isSingleArc: false }, expected: false, reason: "no arc" },
      { change: { columns: 4 }, expected: false, reason: "pitch rows" },
      { change: { columns: 2 }, expected: false, reason: "pitch rows - 2" },
      {
        change: { tileCrossingCount: 0 },
        expected: false,
        reason: "no tile crossing",
      },
      {
        change: { endsAreLatticeNeighbors: true },
        expected: false,
        reason: "neighboring ends",
      },
      {
        change: { isWaterfalls: true },
        expected: false,
        reason: "a waterfall",
      },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);
      const { columns, rows } = values;
      const context: CharacteristicContext = {
        code: { columns, digits: "0".repeat(rows * columns), repeats: 1, rows },
        columns,
        matrix: [],
        rows,
      };

      expect(service.compute(context)).toBe(expected);
    });
  });
});
