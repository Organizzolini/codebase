// Fragments of hexadecimal meander Codes used as test fixtures, not words.
// cspell:ignore ccca ccffcccca

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { DoubleHorizontalEdgeCountCharacteristicService } from "../../submatrix/point/double-horizontal-edge-count-characteristic.service";
import { IsClosedLoopCharacteristicService } from "../structure/is-closed-loop-characteristic.service";

import { IsSnakeCharacteristicService } from "./is-snake-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsSnakeCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsSnakeCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsSnakeCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "04x03y356369a5a339", expected: true },
      { code: "04x04y335665ccca9ca339", expected: true },
      { code: "06x04y33563365cc65ca9a9ca33339", expected: true },
      { code: "02x06y56ccffcccca9", expected: false },
      { code: "02x06y213333659a33", expected: false },
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
      doubleHorizontalEdgeCount: 3,
      isClosedLoop: true,
    };
    const values = { ...base };
    let service: IsSnakeCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsSnakeCharacteristicService,
          {
            provide: DoubleHorizontalEdgeCountCharacteristicService,
            useValue: {
              compute: (): number => values.doubleHorizontalEdgeCount,
            },
          },
          {
            provide: IsClosedLoopCharacteristicService,
            useValue: { compute: (): boolean => values.isClosedLoop },
          },
        ],
      }).compile();

      service = await module.resolve(IsSnakeCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        columns: 4,
        expected: true,
        reason: "a closed loop with columns less one straight points",
        rows: 3,
      },
      {
        change: { doubleHorizontalEdgeCount: 4 },
        columns: 4,
        expected: true,
        reason: "more straight points than the floor",
        rows: 3,
      },
      {
        change: { isClosedLoop: false },
        columns: 4,
        expected: false,
        reason: "not a closed loop",
        rows: 3,
      },
      {
        change: { doubleHorizontalEdgeCount: 2 },
        columns: 4,
        expected: false,
        reason: "one straight point under the floor",
        rows: 3,
      },
      {
        change: { doubleHorizontalEdgeCount: 3 },
        columns: 5,
        expected: false,
        reason: "the floor rising with the column count",
        rows: 3,
      },
      {
        change: { doubleHorizontalEdgeCount: 1 },
        columns: 2,
        expected: true,
        reason: "a two-column band at its floor",
        rows: 3,
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
