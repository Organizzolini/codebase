import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { FamilyUtilitiesService } from "./family-utilities.service";
import { IsBarsCharacteristicService } from "./is-bars-characteristic.service";
import { IsCombCharacteristicService } from "./is-comb-characteristic.service";
import { IsLinesCharacteristicService } from "./is-lines-characteristic.service";
import { IsMeshCharacteristicService } from "./is-mesh-characteristic.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsCombCharacteristicService, () => {
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
    let service: IsCombCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsCombCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "01x02y4b", expected: true },
      { code: "01x03y4cb", expected: true },
      { code: "02x02y44bb", expected: true },
      { code: "02x03y61e1a1", expected: true },
      { code: "02x02y4488", expected: false },
      { code: "02x03y44ad29", expected: false },
    ])("reports $expected for the real Code $code", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });

    it.each([
      { columns: 2, digits: "61e1a1", expected: true, rows: 3 },
      { columns: 2, digits: "748b", expected: true, rows: 2 },
      { columns: 1, digits: "4b", expected: true, rows: 2 },
      { columns: 2, digits: "4488", expected: false, rows: 2 },
      { columns: 2, digits: "3333", expected: false, rows: 2 },
      { columns: 2, digits: "77bb", expected: false, rows: 2 },
      { columns: 1, digits: "3", expected: false, rows: 1 },
      { columns: 1, digits: "4", expected: false, rows: 1 },
      { columns: 0, digits: "", expected: false, rows: 2 },
      { columns: 2, digits: "61e", expected: false, rows: 3 },
      { columns: 2, digits: "334488", expected: false, rows: 3 },
      { columns: 2, digits: "778855", expected: false, rows: 3 },
      { columns: 2, digits: "61937a1", expected: false, rows: 3 },
      { columns: 2, digits: "7089", expected: false, rows: 2 },
      { columns: 2, digits: "77", expected: false, rows: 1 },
      { columns: 2, digits: "334433", expected: false, rows: 3 },
      { columns: 2, digits: "778899", expected: false, rows: 3 },
      { columns: 2, digits: "7144a1", expected: false, rows: 3 },
      { columns: 2, digits: "7a0b", expected: false, rows: 2 },
      { columns: 2, digits: "618114a1", expected: false, rows: 4 },
      { columns: 2, digits: "112233", expected: false, rows: 3 },
      { columns: 3, digits: "001122", expected: false, rows: 2 },
      { columns: 2, digits: "6a6a6a", expected: false, rows: 3 },
      { columns: 2, digits: "cd12de34", expected: false, rows: 4 },
      { columns: 3, digits: "77b", expected: false, rows: 1 },
      { columns: 2, digits: "c7d7e7", expected: false, rows: 3 },
      { columns: 2, digits: "000000", expected: false, rows: 3 },
      { columns: 2, digits: "777777", expected: false, rows: 3 },
      { columns: 0, digits: "", expected: false, rows: 0 },
      { columns: 1, digits: "611", expected: false, rows: 3 },
      { columns: 2, digits: "cccccccc", expected: false, rows: 4 },
      { columns: 2, digits: "7c8c3c3c", expected: false, rows: 4 },
      { columns: 2, digits: "cc12", expected: false, rows: 2 },
      { columns: 2, digits: "3700", expected: false, rows: 2 },
      { columns: 3, digits: "000011112222", expected: false, rows: 4 },
      { columns: 4, digits: "000011112222", expected: false, rows: 3 },
      { columns: 2, digits: "648c8a9", expected: false, rows: 3 },
      { columns: 2, digits: "638c4ca3", expected: false, rows: 4 },
      { columns: 1, digits: "68c4a", expected: false, rows: 4 },
      { columns: 2, digits: "e121", expected: false, rows: 2 },
      { columns: 2, digits: "7670123", expected: false, rows: 3 },
      { columns: 2, digits: "1231b9a", expected: false, rows: 3 },
      { columns: 2, digits: "c40d40", expected: false, rows: 3 },
    ])(
      "reports $expected for the unit $digits over $rows rows and $columns columns",
      ({ columns, digits, expected, rows }) => {
        expect(service.compute(unit(digits, rows, columns))).toBe(expected);
      },
    );
  });

  describe("with mocked excluded families", () => {
    const excluded = { isBars: false, isLines: false, isMesh: false };
    const values = { ...excluded };
    let service: IsCombCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsCombCharacteristicService,
          FamilyUtilitiesService,
          {
            provide: IsBarsCharacteristicService,
            useValue: { compute: (): boolean => values.isBars },
          },
          {
            provide: IsLinesCharacteristicService,
            useValue: { compute: (): boolean => values.isLines },
          },
          {
            provide: IsMeshCharacteristicService,
            useValue: { compute: (): boolean => values.isMesh },
          },
        ],
      }).compile();

      service = await module.resolve(IsCombCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, excluded);
    });

    it("accepts the template when no excluded family matches", () => {
      expect(service.compute(unit("61e1a1", 3, 2))).toBe(true);
    });

    it.each([
      { family: "isBars" },
      { family: "isLines" },
      { family: "isMesh" },
    ])("rejects the template when it is also $family", ({ family }) => {
      Object.assign(values, { [family]: true });

      expect(service.compute(unit("61e1a1", 3, 2))).toBe(false);
    });
  });
});
