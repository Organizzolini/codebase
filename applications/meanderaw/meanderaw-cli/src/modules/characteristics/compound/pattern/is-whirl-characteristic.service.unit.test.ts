// Fragments of hexadecimal meander Codes used as test fixtures, not words.
// cspell:ignore cccca

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { InflectionCountCharacteristicService } from "../../path/turn/inflection-count-characteristic.service";
import { MaxMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { TotalTurnCountCharacteristicService } from "../../path/turn/total-turn-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { LongestHorizontalRunLengthCharacteristicService } from "../../submatrix/run/longest-horizontal-run-length-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import { IsWhirlCharacteristicService } from "./is-whirl-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsWhirlCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsWhirlCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsWhirlCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "04x03y6354c69c8a39", expected: true },
      { code: "05x04y63354c65cccca9c8a339", expected: true },
      { code: "08x03y46356354ca5cc69ca3988a39", expected: true },
      { code: "01x09y7b7b7b7b3", expected: false },
      { code: "02x05y449a659a21", expected: false },
      { code: "04x03y00214254a398", expected: false },
    ])("reports $expected for $code", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const makeContext = (rows: number): CharacteristicContext => ({
      code: { columns: 3, digits: "000000", repeats: 1, rows },
      columns: 3,
      matrix: [],
      rows,
    });
    const base = {
      bettiNumber0Count: 1,
      bettiNumber1Count: 0,
      crossCount: 0,
      dotCount: 0,
      forkCount: 0,
      freeEndCount: 2,
      inflectionCount: 1,
      longestHorizontalRunLength: 3,
      maxMonotonicTurnLength: 4,
      totalTurnCount: 8,
    };
    const values = { ...base };
    let service: IsWhirlCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CompoundUtilitiesService,
          IsWhirlCharacteristicService,
          {
            provide: BettiNumber0CountCharacteristicService,
            useValue: { compute: (): number => values.bettiNumber0Count },
          },
          {
            provide: BettiNumber1CountCharacteristicService,
            useValue: { compute: (): number => values.bettiNumber1Count },
          },
          {
            provide: CrossCountCharacteristicService,
            useValue: { compute: (): number => values.crossCount },
          },
          {
            provide: DotCountCharacteristicService,
            useValue: { compute: (): number => values.dotCount },
          },
          {
            provide: ForkCountCharacteristicService,
            useValue: { compute: (): number => values.forkCount },
          },
          {
            provide: FreeEndCountCharacteristicService,
            useValue: { compute: (): number => values.freeEndCount },
          },
          {
            provide: InflectionCountCharacteristicService,
            useValue: { compute: (): number => values.inflectionCount },
          },
          {
            provide: LongestHorizontalRunLengthCharacteristicService,
            useValue: {
              compute: (): number => values.longestHorizontalRunLength,
            },
          },
          {
            provide: MaxMonotonicTurnLengthCharacteristicService,
            useValue: { compute: (): number => values.maxMonotonicTurnLength },
          },
          {
            provide: TotalTurnCountCharacteristicService,
            useValue: { compute: (): number => values.totalTurnCount },
          },
        ],
      }).compile();

      service = await module.resolve(IsWhirlCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "a four-row whirl of one strand",
        rows: 4,
      },
      {
        change: {
          longestHorizontalRunLength: 2,
          maxMonotonicTurnLength: 3,
          totalTurnCount: 6,
        },
        expected: true,
        reason: "a three-row whirl at the row floor",
        rows: 3,
      },
      {
        change: {
          bettiNumber0Count: 2,
          freeEndCount: 4,
          inflectionCount: 2,
          totalTurnCount: 16,
        },
        expected: true,
        reason: "a four-row whirl of two strands",
        rows: 4,
      },
      {
        change: {
          longestHorizontalRunLength: 1,
          maxMonotonicTurnLength: 2,
          totalTurnCount: 4,
        },
        expected: false,
        reason: "two rows, below the row floor",
        rows: 2,
      },
      {
        change: { forkCount: 1 },
        expected: false,
        reason: "a fork",
        rows: 4,
      },
      {
        change: { crossCount: 1 },
        expected: false,
        reason: "a cross",
        rows: 4,
      },
      {
        change: { dotCount: 1 },
        expected: false,
        reason: "a bare dot",
        rows: 4,
      },
      {
        change: { bettiNumber1Count: 1 },
        expected: false,
        reason: "a cycle",
        rows: 4,
      },
      {
        change: { freeEndCount: 4 },
        expected: false,
        reason: "more free ends than two per strand",
        rows: 4,
      },
      {
        change: { maxMonotonicTurnLength: 3 },
        expected: false,
        reason: "one turn under the row count",
        rows: 4,
      },
      {
        change: { maxMonotonicTurnLength: 5 },
        expected: false,
        reason: "one turn over the row count",
        rows: 4,
      },
      {
        change: { totalTurnCount: 7 },
        expected: false,
        reason: "one turn short of winding in and back out",
        rows: 4,
      },
      {
        change: { totalTurnCount: 9 },
        expected: false,
        reason: "one turn past winding in and back out",
        rows: 4,
      },
      {
        change: { inflectionCount: 0 },
        expected: false,
        reason: "a strand that never changes hand",
        rows: 4,
      },
      {
        change: { inflectionCount: 2 },
        expected: false,
        reason: "a strand that changes hand twice",
        rows: 4,
      },
      {
        change: { longestHorizontalRunLength: 2 },
        expected: false,
        reason: "a horizontal run under rows less one",
        rows: 4,
      },
      {
        change: { longestHorizontalRunLength: 4 },
        expected: false,
        reason: "a horizontal run over rows less one",
        rows: 4,
      },
    ])("reports $expected for $reason", ({ change, expected, rows }) => {
      Object.assign(values, change);

      expect(service.compute(makeContext(rows))).toBe(expected);
    });
  });
});
