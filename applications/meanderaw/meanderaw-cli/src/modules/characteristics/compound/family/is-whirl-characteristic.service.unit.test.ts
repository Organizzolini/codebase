import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { IsWhirlCharacteristicService } from "./is-whirl-characteristic.service";
import { StrandUtilitiesService } from "./strand-utilities.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsWhirlCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsWhirlCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsWhirlCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "04x03y6354c69c8a39", expected: true, shape: "a single whirl" },
      {
        code: "04x04y2335635cc29ca339",
        expected: true,
        shape: "a single whirl as wide as deep",
      },
      {
        code: "08x03y46356354ca5cc69ca3988a39",
        expected: true,
        shape: "a double whirl",
      },
      { code: "04x03y6354c48c8a39", expected: false, shape: "a clasp" },
      { code: "05x03y65635c8c4ca39a9", expected: false, shape: "a swirl" },
    ])("reports $expected for $shape ($code)", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const base = { columns: 4, isTileBoundCoil: true, rows: 3, strandEnds: 1 };
    const values = { ...base };
    let service: IsWhirlCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsWhirlCharacteristicService,
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

      service = await module.resolve(IsWhirlCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "one strand at pitch rows + 1",
      },
      {
        change: { columns: 4, rows: 4 },
        expected: true,
        reason: "one strand at pitch rows over four rows",
      },
      {
        change: { columns: 3, rows: 3 },
        expected: false,
        reason: "one strand at pitch rows over three rows",
      },
      {
        change: { columns: 8, strandEnds: 2 },
        expected: true,
        reason: "two strands at pitch 2 rows + 2",
      },
      {
        change: { columns: 8, rows: 4, strandEnds: 2 },
        expected: true,
        reason: "two strands at pitch 2 rows over four rows",
      },
      {
        change: { columns: 6, strandEnds: 2 },
        expected: false,
        reason: "two strands at pitch 2 rows over three rows",
      },
      {
        change: { columns: 8 },
        expected: false,
        reason: "one strand at the double pitch",
      },
      {
        change: { strandEnds: 2 },
        expected: false,
        reason: "two strands at the single pitch",
      },
      { change: { strandEnds: 3 }, expected: false, reason: "three strands" },
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
