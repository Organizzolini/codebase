import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { IsDotsCharacteristicService } from "./is-dots-characteristic.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsDotsCharacteristicService, () => {
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
  let contextService: CharacteristicContextService;
  let service: IsDotsCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
      providers: [CharacteristicContextService],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(IsDotsCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    { code: "01x02y00", expected: true },
    { code: "02x02y0000", expected: true },
    { code: "02x02y3333", expected: false },
    { code: "01x03y04b", expected: false },
  ])("reports $expected for the real Code $code", ({ code, expected }) => {
    expect(service.compute(contextService.create(code))).toBe(expected);
  });

  it.each([
    { columns: 1, digits: "0", expected: true, rows: 1 },
    { columns: 1, digits: "00", expected: true, rows: 2 },
    { columns: 2, digits: "0000", expected: true, rows: 2 },
    { columns: 2, digits: "000000", expected: true, rows: 3 },
    { columns: 1, digits: "03", expected: false, rows: 2 },
    { columns: 2, digits: "0004", expected: false, rows: 2 },
    { columns: 2, digits: "3333", expected: false, rows: 2 },
    { columns: 0, digits: "", expected: false, rows: 0 },
  ])(
    "reports $expected for the unit $digits over $rows rows and $columns columns",
    ({ columns, digits, expected, rows }) => {
      expect(service.compute(unit(digits, rows, columns))).toBe(expected);
    },
  );
});
