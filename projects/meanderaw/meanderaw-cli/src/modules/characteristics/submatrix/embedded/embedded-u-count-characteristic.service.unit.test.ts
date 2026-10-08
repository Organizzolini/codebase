import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { EmbeddedUCountCharacteristicService } from "./embedded-u-count-characteristic.service";

describe(EmbeddedUCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: EmbeddedUCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        EmbeddedUCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(EmbeddedUCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    {
      code: { columns: 1, digits: "", repeats: 1, rows: 0 },
      expected: 0,
      shape: "an empty Code",
    },
    {
      code: { columns: 2, digits: "40a1", repeats: 1, rows: 2 },
      expected: 0,
      shape: "an L shape",
    },
    {
      code: { columns: 2, digits: "9a56", repeats: 1, rows: 2 },
      expected: 0,
      shape: "a plus shape",
    },
    {
      code: { columns: 2, digits: "44a9", repeats: 1, rows: 2 },
      expected: 1,
      shape: "a U shape",
    },
    {
      code: { columns: 2, digits: "65a9", repeats: 1, rows: 2 },
      expected: 1,
      shape: "a closed O shape, which also matches one of the U's rotations",
    },
  ])("counts $expected embedded U in $shape", ({ code, expected }) => {
    expect(service.compute(contextService.create(code))).toBe(expected);
  });

  it.each([
    { columns: 2, digits: "61a1", repeats: 1, rows: 2 },
    { columns: 2, digits: "2529", repeats: 1, rows: 2 },
    { columns: 2, digits: "6588", repeats: 1, rows: 2 },
  ])("finds an embedded U in every rotation - %#", (code) => {
    expect(service.compute(contextService.create(code))).toBeGreaterThan(0);
  });

  it("never wraps a window past the last row", () => {
    const context = contextService.create({
      columns: 2,
      digits: "44",
      repeats: 1,
      rows: 1,
    });

    expect(service.compute(context)).toBe(0);
  });
});
