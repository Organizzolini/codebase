import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { DensityCharacteristicService } from "./density-characteristic.service";
import { InkPointCountCharacteristicService } from "./ink-point-count-characteristic.service";
import { PointUtilitiesService } from "./point-utilities.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(DensityCharacteristicService, () => {
  describe("with the real ink point count service", () => {
    let contextService: CharacteristicContextService;
    let service: DensityCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, MatrixModule],
        providers: [
          CharacteristicContextService,
          DensityCharacteristicService,
          InkPointCountCharacteristicService,
          PointUtilitiesService,
        ],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(DensityCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: { columns: 1, digits: "0", repeats: 1, rows: 1 }, expected: 0 },
      { code: { columns: 2, digits: "21", repeats: 1, rows: 1 }, expected: 1 },
      {
        code: { columns: 2, digits: "2100", repeats: 1, rows: 2 },
        expected: 0.5,
      },
      {
        code: { columns: 2, digits: "4080", repeats: 1, rows: 2 },
        expected: 0.5,
      },
      {
        code: { columns: 2, digits: "40a1", repeats: 1, rows: 2 },
        expected: 0.75,
      },
      {
        code: { columns: 2, digits: "4488", repeats: 1, rows: 2 },
        expected: 1,
      },
      {
        code: { columns: 2, digits: "44a9", repeats: 1, rows: 2 },
        expected: 1,
      },
      {
        code: { columns: 2, digits: "65a9", repeats: 1, rows: 2 },
        expected: 1,
      },
      {
        code: { columns: 2, digits: "9a56", repeats: 1, rows: 2 },
        expected: 1,
      },
      { code: { columns: 1, digits: "7", repeats: 1, rows: 1 }, expected: 1 },
      { code: { columns: 1, digits: "f", repeats: 1, rows: 1 }, expected: 1 },
    ])("computes $expected for $code.digits", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with a mocked ink point count service", () => {
    const context: CharacteristicContext = {
      code: { columns: 2, digits: "0000", repeats: 1, rows: 2 },
      columns: 2,
      matrix: [],
      rows: 2,
    };
    let service: DensityCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DensityCharacteristicService,
          {
            provide: InkPointCountCharacteristicService,
            useValue: { compute: (): number => 2 },
          },
        ],
      }).compile();

      service = await module.resolve(DensityCharacteristicService);
    });

    it("divides the injected ink point count by the total point count", () => {
      expect(service.compute(context)).toBe(0.5);
    });
  });

  it("reports zero density for a Code with no points", async () => {
    const context: CharacteristicContext = {
      code: { columns: 1, digits: "", repeats: 1, rows: 0 },
      columns: 1,
      matrix: [],
      rows: 0,
    };

    const module = await Test.createTestingModule({
      providers: [
        DensityCharacteristicService,
        {
          provide: InkPointCountCharacteristicService,
          useValue: { compute: (): number => 0 },
        },
      ],
    }).compile();

    const service = await module.resolve(DensityCharacteristicService);

    expect(service.compute(context)).toBe(0);
  });
});
