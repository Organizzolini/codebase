import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { InkPointCountCharacteristicService } from "../../submatrix/point/ink-point-count-characteristic.service";

import { IsDotsCharacteristicService } from "./is-dots-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsDotsCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsDotsCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsDotsCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "01x02y00", expected: true, shape: "a bare pair of dots" },
      { code: "01x03y000", expected: true, shape: "three bare dots" },
      { code: "01x04y0000", expected: true, shape: "four bare dots" },
      {
        code: "01x10y3333333333",
        expected: false,
        shape: "a single full line",
      },
      { code: "02x05y1256a96588", expected: false, shape: "an inked arc" },
    ])("reports $expected for $shape ($code)", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const context: CharacteristicContext = {
      code: { columns: 3, digits: "000000", repeats: 1, rows: 2 },
      columns: 3,
      matrix: [],
      rows: 2,
    };
    const base = {
      inkPointCount: 0,
    };
    const values = { ...base };
    let service: IsDotsCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsDotsCharacteristicService,
          {
            provide: InkPointCountCharacteristicService,
            useValue: { compute: (): number => values.inkPointCount },
          },
        ],
      }).compile();

      service = await module.resolve(IsDotsCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      { change: {}, expected: true, reason: "no ink" },
      {
        change: { inkPointCount: 1 },
        expected: false,
        reason: "one inked point",
      },
      {
        change: { inkPointCount: 4 },
        expected: false,
        reason: "several inked points",
      },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.compute(context)).toBe(expected);
    });
  });
});
