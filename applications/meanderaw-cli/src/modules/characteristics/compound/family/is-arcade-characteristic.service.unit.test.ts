import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { FamilyUtilitiesService } from "./family-utilities.service";
import { IsArcadeCharacteristicService } from "./is-arcade-characteristic.service";
import { IsBarsCharacteristicService } from "./is-bars-characteristic.service";
import { IsCombCharacteristicService } from "./is-comb-characteristic.service";
import { IsMeshCharacteristicService } from "./is-mesh-characteristic.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsArcadeCharacteristicService, () => {
  const unit = (
    digits: string,
    rows: number,
    columns: number,
  ): CharacteristicContext => ({
    code: { columns, digits, repeats: 1, rows },
    columns,
    matrix: [],
    rows,
  });

  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsArcadeCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsArcadeCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "02x03y56cca9", expected: true },
      { code: "02x03y65cca9", expected: true },
      { code: "03x03y0650cc39a", expected: true },
      { code: "03x03y0650cc0a9", expected: true },
      { code: "02x02y4488", expected: false },
      { code: "02x03y61e1a1", expected: false },
    ])("reports $expected for the real Code $code", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });

    it.each([
      { columns: 4, digits: "6775ccccab98", expected: true, rows: 3 },
      { columns: 6, digits: "677775ccccccab9998", expected: true, rows: 3 },
      { columns: 1, digits: "48", expected: false, rows: 2 },
      { columns: 2, digits: "4488", expected: false, rows: 2 },
      { columns: 0, digits: "", expected: false, rows: 3 },
      { columns: 1, digits: "4cc8", expected: false, rows: 3 },
      { columns: 1, digits: "7fb", expected: false, rows: 3 },
      { columns: 2, digits: "61e1a1", expected: false, rows: 3 },
      { columns: 2, digits: "667", expected: false, rows: 3 },
      { columns: 2, digits: "334488cc", expected: false, rows: 3 },
      { columns: 2, digits: "6448cc", expected: false, rows: 3 },
      { columns: 6, digits: "333333ccccba98", expected: false, rows: 3 },
      { columns: 6, digits: "677533cccc3333", expected: false, rows: 3 },
      { columns: 6, digits: "675533334433", expected: false, rows: 3 },
      { columns: 2, digits: "77bb", expected: false, rows: 2 },
      { columns: 3, digits: "6765ab", expected: false, rows: 2 },
      { columns: 2, digits: "67765ab", expected: false, rows: 3 },
      { columns: 6, digits: "333333cccc3333", expected: false, rows: 3 },
      { columns: 6, digits: "334433ccccba98", expected: false, rows: 3 },
      { columns: 6, digits: "667766cccc333333", expected: false, rows: 3 },
      { columns: 2, digits: "67ab99", expected: false, rows: 3 },
      { columns: 4, digits: "6775cccc0000", expected: false, rows: 3 },
      { columns: 4, digits: "67007500c00c0000", expected: false, rows: 4 },
      { columns: 2, digits: "0000ccccba00", expected: false, rows: 3 },
      { columns: 2, digits: "6700cccc0000", expected: false, rows: 3 },
      { columns: 2, digits: "6700c0cba00", expected: false, rows: 3 },
    ])(
      "reports $expected for the unit $digits over $rows rows and $columns columns",
      ({ columns, digits, expected, rows }) => {
        expect(service.compute(unit(digits, rows, columns))).toBe(expected);
      },
    );
  });

  describe("with mocked excluded families", () => {
    const excluded = { isBars: false, isComb: false, isMesh: false };
    const values = { ...excluded };
    let service: IsArcadeCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsArcadeCharacteristicService,
          FamilyUtilitiesService,
          {
            provide: IsBarsCharacteristicService,
            useValue: { compute: (): boolean => values.isBars },
          },
          {
            provide: IsCombCharacteristicService,
            useValue: { compute: (): boolean => values.isComb },
          },
          {
            provide: IsMeshCharacteristicService,
            useValue: { compute: (): boolean => values.isMesh },
          },
        ],
      }).compile();

      service = await module.resolve(IsArcadeCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, excluded);
    });

    it("accepts the template when no excluded family matches", () => {
      expect(service.compute(unit("6775ccccab98", 3, 4))).toBe(true);
    });

    it.each([{ family: "isBars" }, { family: "isComb" }, { family: "isMesh" }])(
      "rejects the template when it is also $family",
      ({ family }) => {
        Object.assign(values, { [family]: true });

        expect(service.compute(unit("6775ccccab98", 3, 4))).toBe(false);
      },
    );
  });
});
