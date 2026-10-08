import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { MaxMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { IsSingleArcCharacteristicService } from "../structure/is-single-arc-characteristic.service";

import { IsWaterfallsCharacteristicService } from "./is-waterfalls-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsWaterfallsCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsWaterfallsCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsWaterfallsCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "03x04y23535a5a3a31", expected: true },
      { code: "04x03y2335335a31a3", expected: true },
      { code: "06x02y23333533331a", expected: true },
      { code: "02x01y21", expected: false },
      { code: "02x05y2156cca921", expected: false },
    ])("reports $expected for $code", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const makeContext = (
      rows: number,
      columns: number,
    ): CharacteristicContext => ({
      code: { columns, digits: "000000", repeats: 1, rows },
      columns,
      matrix: [],
      rows,
    });
    const base = {
      isSingleArc: true,
      maxMonotonicTurnLength: 1,
    };
    const values = { ...base };
    let service: IsWaterfallsCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsWaterfallsCharacteristicService,
          {
            provide: IsSingleArcCharacteristicService,
            useValue: { compute: (): boolean => values.isSingleArc },
          },
          {
            provide: MaxMonotonicTurnLengthCharacteristicService,
            useValue: { compute: (): number => values.maxMonotonicTurnLength },
          },
        ],
      }).compile();

      service = await module.resolve(IsWaterfallsCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        columns: 3,
        expected: true,
        reason: "a single arc that alternates every turn",
        rows: 2,
      },
      {
        change: { isSingleArc: false },
        columns: 3,
        expected: false,
        reason: "not a single arc",
        rows: 2,
      },
      {
        change: { maxMonotonicTurnLength: 0 },
        columns: 3,
        expected: false,
        reason: "a turn run of zero",
        rows: 2,
      },
      {
        change: { maxMonotonicTurnLength: 2 },
        columns: 3,
        expected: false,
        reason: "a turn run of two",
        rows: 2,
      },
    ])(
      "reports $expected for $reason",
      ({ change, columns, expected, rows }) => {
        Object.assign(values, change);

        expect(service.compute(makeContext(rows, columns))).toBe(expected);
      },
    );
  });
});
