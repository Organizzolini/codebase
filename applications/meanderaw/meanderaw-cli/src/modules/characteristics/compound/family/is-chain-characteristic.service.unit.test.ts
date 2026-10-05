import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { LongestHorizontalRunLengthCharacteristicService } from "../../submatrix/run/longest-horizontal-run-length-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";
import { IsSingleArcCharacteristicService } from "../structure/is-single-arc-characteristic.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { IsChainCharacteristicService } from "./is-chain-characteristic.service";
import { StrandUtilitiesService } from "./strand-utilities.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsChainCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsChainCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsChainCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "04x03y35634884a339", expected: false, shape: "a double chain" },
      { code: "04x04y335661ccc29ca339", expected: false, shape: "a square" },
      { code: "04x03y356369a5a339", expected: false, shape: "a closed loop" },
      { code: "02x03y52a529", expected: false, shape: "a boxed arc" },
    ])("reports $expected for $shape ($code)", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const base = {
      columns: 4,
      isSingleArc: true,
      isWrappingReversal: true,
      longestHorizontalRunLength: 4,
      longestVerticalRunLength: 3,
      rows: 4,
    };
    const values = { ...base };
    let service: IsChainCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsChainCharacteristicService,
          {
            provide: IsSingleArcCharacteristicService,
            useValue: { compute: (): boolean => values.isSingleArc },
          },
          {
            provide: LongestHorizontalRunLengthCharacteristicService,
            useValue: {
              compute: (): number => values.longestHorizontalRunLength,
            },
          },
          {
            provide: LongestVerticalRunLengthCharacteristicService,
            useValue: {
              compute: (): number => values.longestVerticalRunLength,
            },
          },
          {
            provide: StrandUtilitiesService,
            useValue: {
              isWrappingReversal: (): boolean => values.isWrappingReversal,
            },
          },
        ],
      }).compile();

      service = await module.resolve(IsChainCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "a wrapping reversal as wide as deep with a full-width run",
      },
      {
        change: {
          columns: 2,
          longestHorizontalRunLength: 2,
          longestVerticalRunLength: 1,
          rows: 2,
        },
        expected: true,
        reason: "two rows",
      },
      { change: { isSingleArc: false }, expected: false, reason: "no arc" },
      {
        change: { isWrappingReversal: false },
        expected: false,
        reason: "no wrapping reversal",
      },
      {
        change: { columns: 5, longestHorizontalRunLength: 5 },
        expected: false,
        reason: "pitch rows + 1",
      },
      {
        change: { longestHorizontalRunLength: 3 },
        expected: false,
        reason: "a horizontal run short of the width",
      },
      {
        change: { longestVerticalRunLength: 4 },
        expected: false,
        reason: "a vertical run of rows",
      },
      {
        change: { longestVerticalRunLength: 2 },
        expected: false,
        reason: "a vertical run of rows - 2",
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
