import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { LongestHorizontalRunLengthCharacteristicService } from "../../submatrix/run/longest-horizontal-run-length-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { IsDoubleChainCharacteristicService } from "./is-double-chain-characteristic.service";
import { StrandUtilitiesService } from "./strand-utilities.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsDoubleChainCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsDoubleChainCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsDoubleChainCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "04x03y35634884a339", expected: true, shape: "a double chain" },
      {
        code: "06x04y33563361cc25c29a1ca33339",
        expected: true,
        shape: "a four-row double chain",
      },
      { code: "04x03y356369a5a339", expected: false, shape: "a closed loop" },
      { code: "04x03y6354c48c8a39", expected: false, shape: "a clasp" },
    ])("reports $expected for $shape ($code)", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const base = {
      bettiNumber1Count: 0,
      columns: 6,
      crossCount: 0,
      forkCount: 0,
      isWrappingReversal: true,
      longestHorizontalRunLength: 5,
      longestVerticalRunLength: 2,
      rows: 4,
      strandEnds: 2,
    };
    const values = { ...base };
    let service: IsDoubleChainCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CompoundUtilitiesService,
          IsDoubleChainCharacteristicService,
          {
            provide: BettiNumber1CountCharacteristicService,
            useValue: { compute: (): number => values.bettiNumber1Count },
          },
          {
            provide: CrossCountCharacteristicService,
            useValue: { compute: (): number => values.crossCount },
          },
          {
            provide: ForkCountCharacteristicService,
            useValue: { compute: (): number => values.forkCount },
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
              hasStrandEnds: (
                ...[, strands]: readonly [CharacteristicContext, number]
              ): boolean => strands === values.strandEnds,
              isWrappingReversal: (): boolean => values.isWrappingReversal,
            },
          },
        ],
      }).compile();

      service = await module.resolve(IsDoubleChainCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "two wrapping strands at pitch 2 rows - 2",
      },
      { change: { strandEnds: 1 }, expected: false, reason: "one strand" },
      { change: { strandEnds: 3 }, expected: false, reason: "three strands" },
      { change: { forkCount: 1 }, expected: false, reason: "a fork" },
      { change: { crossCount: 1 }, expected: false, reason: "a cross" },
      { change: { bettiNumber1Count: 1 }, expected: false, reason: "a cycle" },
      {
        change: { columns: 8, longestHorizontalRunLength: 7 },
        expected: false,
        reason: "pitch 2 rows",
      },
      {
        change: { isWrappingReversal: false },
        expected: false,
        reason: "no wrapping reversal",
      },
      {
        change: { longestHorizontalRunLength: 6 },
        expected: false,
        reason: "a full-width horizontal run",
      },
      {
        change: { longestVerticalRunLength: 3 },
        expected: false,
        reason: "a vertical run of rows - 1",
      },
      {
        change: { longestVerticalRunLength: 1 },
        expected: false,
        reason: "a vertical run of rows - 3",
      },
      {
        change: { longestVerticalRunLength: 0 },
        expected: false,
        reason: "no vertical run",
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
