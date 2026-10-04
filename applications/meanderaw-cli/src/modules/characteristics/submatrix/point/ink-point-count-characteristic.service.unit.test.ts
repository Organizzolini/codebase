import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { InkPointCountCharacteristicService } from "./ink-point-count-characteristic.service";
import { PointUtilitiesService } from "./point-utilities.service";

describe(InkPointCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: InkPointCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        InkPointCountCharacteristicService,
        PointUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(InkPointCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    { code: { columns: 1, digits: "", repeats: 1, rows: 0 }, expected: 0 },
    { code: { columns: 1, digits: "0", repeats: 1, rows: 1 }, expected: 0 },
    { code: { columns: 2, digits: "21", repeats: 1, rows: 1 }, expected: 2 },
    { code: { columns: 2, digits: "2100", repeats: 1, rows: 2 }, expected: 2 },
    { code: { columns: 2, digits: "4080", repeats: 1, rows: 2 }, expected: 2 },
    { code: { columns: 2, digits: "40a1", repeats: 1, rows: 2 }, expected: 3 },
    { code: { columns: 2, digits: "44a9", repeats: 1, rows: 2 }, expected: 4 },
    { code: { columns: 1, digits: "7", repeats: 1, rows: 1 }, expected: 1 },
    { code: { columns: 1, digits: "f", repeats: 1, rows: 1 }, expected: 1 },
  ])("computes $expected for $code.digits", ({ code, expected }) => {
    expect(service.compute(contextService.create(code))).toBe(expected);
  });
});
