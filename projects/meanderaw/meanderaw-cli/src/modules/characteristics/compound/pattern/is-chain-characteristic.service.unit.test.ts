// Fragments of hexadecimal meander Codes used as test fixtures, not words.
// cspell:ignore ccca

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { TileCrossingComponentDeltaCountCharacteristicService } from "../../path/tile-crossing/tile-crossing-component-delta-count-characteristic.service";
import { MaxMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { TightestTurnCountCharacteristicService } from "../../path/turn/tightest-turn-count-characteristic.service";

import { IsChainCharacteristicService } from "./is-chain-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsChainCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsChainCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsChainCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "06x04y33563361cc25c29a1ca33339", expected: true },
      { code: "05x05y33356635ccc48ccca39ca3339", expected: true },
      { code: "06x06y3333566335ccc61ccccc29ccca339ca33339", expected: true },
      { code: "04x03y35634884a339", expected: false },
      { code: "02x05y44a956a921", expected: false },
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
      maxMonotonicTurnLength: 5,
      tightestTurnCount: 1,
      tileCrossingComponentDeltaCount: 1,
    };
    const values = { ...base };
    let service: IsChainCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsChainCharacteristicService,
          {
            provide: MaxMonotonicTurnLengthCharacteristicService,
            useValue: { compute: (): number => values.maxMonotonicTurnLength },
          },
          {
            provide: TightestTurnCountCharacteristicService,
            useValue: { compute: (): number => values.tightestTurnCount },
          },
          {
            provide: TileCrossingComponentDeltaCountCharacteristicService,
            useValue: {
              compute: (): number => values.tileCrossingComponentDeltaCount,
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
        reason: "winding four past the hairpins and one merged component",
      },
      {
        change: { maxMonotonicTurnLength: 4 },
        expected: false,
        reason: "a difference of three",
      },
      {
        change: { maxMonotonicTurnLength: 6 },
        expected: true,
        reason: "a difference of five",
      },
      {
        change: { tightestTurnCount: 2 },
        expected: false,
        reason: "an extra hairpin shrinking the difference to three",
      },
      {
        change: { tileCrossingComponentDeltaCount: 0 },
        expected: false,
        reason: "no components merged at the tile edge",
      },
      {
        change: { tileCrossingComponentDeltaCount: 2 },
        expected: false,
        reason: "two components merged at the tile edge",
      },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.compute(context)).toBe(expected);
    });
  });
});
