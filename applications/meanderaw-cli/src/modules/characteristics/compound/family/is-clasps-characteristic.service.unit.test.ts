import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { ReversesAtItsTightestTurnCharacteristicService } from "../../path/turn/reverses-at-its-tightest-turn-characteristic.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { IsClaspsCharacteristicService } from "./is-clasps-characteristic.service";
import { StrandUtilitiesService } from "./strand-utilities.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsClaspsCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsClaspsCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsClaspsCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "04x03y6354c48c8a39", expected: true, shape: "a single clasp" },
      {
        code: "05x04y63354c61cccc29c8a339",
        expected: true,
        shape: "a four-row single clasp",
      },
      {
        code: "08x03y46356354c84cc48ca3988a39",
        expected: true,
        shape: "a double clasp",
      },
      { code: "03x02y4448a9", expected: true, shape: "a two-row clasp" },
      { code: "04x03y6354c69c8a39", expected: false, shape: "a whirl" },
      { code: "05x03y65635c8c4ca39a9", expected: false, shape: "a swirl" },
    ])("reports $expected for $shape ($code)", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const base = {
      columns: 4,
      isTileBoundCoil: true,
      reversesAtItsTightestTurn: true,
      rows: 3,
      strandEnds: 2,
    };
    const values = { ...base };
    let service: IsClaspsCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsClaspsCharacteristicService,
          {
            provide: ReversesAtItsTightestTurnCharacteristicService,
            useValue: {
              compute: (): boolean => values.reversesAtItsTightestTurn,
            },
          },
          {
            provide: StrandUtilitiesService,
            useValue: {
              hasStrandEnds: (
                ...[, strands]: readonly [CharacteristicContext, number]
              ): boolean => strands === values.strandEnds,
              isTileBoundCoil: (): boolean => values.isTileBoundCoil,
            },
          },
        ],
      }).compile();

      service = await module.resolve(IsClaspsCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "two strands at pitch rows + 1",
      },
      {
        change: { columns: 8, strandEnds: 4 },
        expected: true,
        reason: "four strands at pitch 2 rows + 2",
      },
      {
        change: { columns: 8 },
        expected: false,
        reason: "two strands at the double pitch",
      },
      {
        change: { strandEnds: 4 },
        expected: false,
        reason: "four strands at the single pitch",
      },
      { change: { strandEnds: 1 }, expected: false, reason: "one strand" },
      { change: { columns: 3 }, expected: false, reason: "pitch rows" },
      {
        change: { reversesAtItsTightestTurn: false },
        expected: false,
        reason: "no reversal at the tightest turn",
      },
      {
        change: { isTileBoundCoil: false },
        expected: false,
        reason: "no tile-bound coil",
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
