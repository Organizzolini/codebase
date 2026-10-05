import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { EndsOnBorderRulesCharacteristicService } from "../../path/end/ends-on-border-rules-characteristic.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { IsSwirlCharacteristicService } from "./is-swirl-characteristic.service";
import { StrandUtilitiesService } from "./strand-utilities.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsSwirlCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsSwirlCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsSwirlCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      {
        code: "05x03y65635c8c4ca39a9",
        expected: true,
        shape: "a single swirl",
      },
      {
        code: "07x04y6356335c4cc65cca9cc8ca339a39",
        expected: true,
        shape: "a four-row single swirl",
      },
      {
        code: "10x03y6356565635c4c8cc8c4ca9a39a39a9",
        expected: true,
        shape: "a double swirl",
      },
      { code: "04x03y6354c69c8a39", expected: false, shape: "a whirl" },
      { code: "04x03y6354c48c8a39", expected: false, shape: "a clasp" },
    ])("reports $expected for $shape ($code)", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const base = {
      columns: 5,
      endsOnBorderRules: false,
      isTileBoundCoil: true,
      rows: 3,
      strandEnds: 1,
    };
    const values = { ...base };
    let service: IsSwirlCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsSwirlCharacteristicService,
          {
            provide: EndsOnBorderRulesCharacteristicService,
            useValue: { compute: (): boolean => values.endsOnBorderRules },
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

      service = await module.resolve(IsSwirlCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "one strand at pitch 2 rows - 1",
      },
      {
        change: { columns: 10, strandEnds: 2 },
        expected: true,
        reason: "two strands at pitch 4 rows - 2",
      },
      {
        change: { columns: 10 },
        expected: false,
        reason: "one strand at the double pitch",
      },
      {
        change: { strandEnds: 2 },
        expected: false,
        reason: "two strands at the single pitch",
      },
      { change: { columns: 4 }, expected: false, reason: "pitch rows + 1" },
      { change: { strandEnds: 3 }, expected: false, reason: "three strands" },
      {
        change: { endsOnBorderRules: true },
        expected: false,
        reason: "ends on the border rules",
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
