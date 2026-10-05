import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { IsMeshCharacteristicService } from "./is-mesh-characteristic.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsMeshCharacteristicService, () => {
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
  let service: IsMeshCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
      providers: [CharacteristicContextService],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(IsMeshCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    { code: "01x02y7b", expected: true },
    { code: "01x03y7fb", expected: true },
    { code: "02x02y77bb", expected: true },
    { code: "01x02y4b", expected: false },
  ])("reports $expected for the real Code $code", ({ code, expected }) => {
    expect(service.compute(contextService.create(code))).toBe(expected);
  });

  it.each([
    { columns: 1, digits: "7b", expected: true, rows: 2 },
    { columns: 1, digits: "7fb", expected: true, rows: 3 },
    { columns: 1, digits: "7ffb", expected: true, rows: 4 },
    { columns: 2, digits: "77bb", expected: true, rows: 2 },
    { columns: 3, digits: "777bbb", expected: true, rows: 2 },
    { columns: 2, digits: "77ffbb", expected: true, rows: 3 },
    { columns: 2, digits: "77ffffbb", expected: true, rows: 4 },
    { columns: 1, digits: "3", expected: false, rows: 1 },
    { columns: 2, digits: "77bf", expected: false, rows: 2 },
    { columns: 2, digits: "3333", expected: false, rows: 2 },
  ])(
    "reports $expected for the unit $digits over $rows rows and $columns columns",
    ({ columns, digits, expected, rows }) => {
      expect(service.compute(unit(digits, rows, columns))).toBe(expected);
    },
  );
});
