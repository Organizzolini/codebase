// Fragments of hexadecimal meander Codes used as test fixtures, not words.
// cspell:ignore ccca

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { InflectionCountCharacteristicService } from "../../path/turn/inflection-count-characteristic.service";
import { MaxMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { TightestTurnCountCharacteristicService } from "../../path/turn/tightest-turn-count-characteristic.service";

import { IsBoxesCharacteristicService } from "./is-boxes-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsBoxesCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsBoxesCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsBoxesCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "04x04y2335635cc29ca339", expected: true },
      { code: "05x05y233356335cc61ccca39ca3339", expected: true },
      { code: "06x06y23333563335cc635cccc29ccca339ca33339", expected: true },
      { code: "03x04y23535a396239", expected: false },
      { code: "02x05y449a65cc88", expected: false },
      { code: "02x06y3333333356a9", expected: false },
    ])("reports $expected for $code", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const context: CharacteristicContext = {
      code: { columns: 4, digits: "0000000000000000", repeats: 1, rows: 4 },
      columns: 4,
      matrix: [],
      rows: 4,
    };
    const base = {
      bettiNumber0Count: 1,
      inflectionCount: 0,
      maxMonotonicTurnLength: 6,
      tightestTurnCount: 1,
    };
    const values = { ...base };
    let service: IsBoxesCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsBoxesCharacteristicService,
          {
            provide: BettiNumber0CountCharacteristicService,
            useValue: { compute: (): number => values.bettiNumber0Count },
          },
          {
            provide: InflectionCountCharacteristicService,
            useValue: { compute: (): number => values.inflectionCount },
          },
          {
            provide: MaxMonotonicTurnLengthCharacteristicService,
            useValue: { compute: (): number => values.maxMonotonicTurnLength },
          },
          {
            provide: TightestTurnCountCharacteristicService,
            useValue: { compute: (): number => values.tightestTurnCount },
          },
        ],
      }).compile();

      service = await module.resolve(IsBoxesCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "winding exceeds inflections by six, one hairpin per component",
      },
      {
        change: { inflectionCount: 3, maxMonotonicTurnLength: 9 },
        expected: true,
        reason: "a difference of six with inflections",
      },
      {
        change: { maxMonotonicTurnLength: 5 },
        expected: false,
        reason: "a difference of five",
      },
      {
        change: { inflectionCount: 1 },
        expected: false,
        reason: "an extra inflection shrinking the difference to five",
      },
      {
        change: { maxMonotonicTurnLength: 7 },
        expected: true,
        reason: "a difference of seven",
      },
      {
        change: { bettiNumber0Count: 2 },
        expected: false,
        reason: "fewer hairpins than components",
      },
      {
        change: { tightestTurnCount: 2 },
        expected: false,
        reason: "more hairpins than components",
      },
      {
        change: { bettiNumber0Count: 2, tightestTurnCount: 2 },
        expected: true,
        reason: "two components with two hairpins",
      },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.compute(context)).toBe(expected);
    });
  });
});
