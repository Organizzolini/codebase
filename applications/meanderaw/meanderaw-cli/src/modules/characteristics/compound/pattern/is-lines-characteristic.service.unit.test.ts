// Fragments of hexadecimal meander Codes used as test fixtures, not words.
// cspell:ignore fcfcfcf

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { NorthEdgeCountCharacteristicService } from "../../submatrix/point/north-edge-count-characteristic.service";

import { IsLinesCharacteristicService } from "./is-lines-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsLinesCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsLinesCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsLinesCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "01x02y33", expected: true, shape: "two horizontal lines" },
      { code: "01x03y333", expected: true, shape: "three horizontal lines" },
      { code: "01x04y3333", expected: true, shape: "four horizontal lines" },
      {
        code: "01x09y4fcfcfcf8",
        expected: false,
        shape: "lines broken by verticals",
      },
      { code: "02x05y213356a933", expected: false, shape: "a two-row meander" },
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
      bettiNumber1Count: 2,
      northEdgeCount: 0,
    };
    const values = { ...base };
    let service: IsLinesCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsLinesCharacteristicService,
          {
            provide: BettiNumber1CountCharacteristicService,
            useValue: { compute: (): number => values.bettiNumber1Count },
          },
          {
            provide: NorthEdgeCountCharacteristicService,
            useValue: { compute: (): number => values.northEdgeCount },
          },
        ],
      }).compile();

      service = await module.resolve(IsLinesCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "no north ink and one loop per row",
      },
      { change: { northEdgeCount: 1 }, expected: false, reason: "a north arm" },
      {
        change: { bettiNumber1Count: 1 },
        expected: false,
        reason: "fewer loops than rows",
      },
      {
        change: { bettiNumber1Count: 3 },
        expected: false,
        reason: "more loops than rows",
      },
      { change: { bettiNumber1Count: 0 }, expected: false, reason: "no loops" },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.compute(context)).toBe(expected);
    });
  });
});
