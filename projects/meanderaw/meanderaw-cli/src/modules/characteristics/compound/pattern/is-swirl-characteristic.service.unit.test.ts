// Fragments of hexadecimal meander Codes used as test fixtures, not words.
// cspell:ignore ccffcca

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { MaxMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { TightestTurnCountCharacteristicService } from "../../path/turn/tightest-turn-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import { IsSwirlCharacteristicService } from "./is-swirl-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsSwirlCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsSwirlCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsSwirlCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "05x03y65635c8c4ca39a9", expected: true },
      { code: "07x04y6356335c4cc65cca9cc8ca339a39", expected: true },
      { code: "10x03y6356565635c4c8cc8c4ca9a39a39a9", expected: true },
      { code: "01x10y37b7b7b7b3", expected: false },
      { code: "02x05y56ccffcca9", expected: false },
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
      bettiNumber1Count: 0,
      crossCount: 0,
      forkCount: 0,
      freeEndCount: 2,
      maxMonotonicTurnLength: 6,
      tightestTurnCount: 2,
    };
    const values = { ...base };
    let service: IsSwirlCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CompoundUtilitiesService,
          IsSwirlCharacteristicService,
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
            provide: FreeEndCountCharacteristicService,
            useValue: { compute: (): number => values.freeEndCount },
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

      service = await module.resolve(IsSwirlCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        columns: 3,
        expected: true,
        reason: "a four-row spiral of six turns",
        rows: 4,
      },
      {
        change: { maxMonotonicTurnLength: 4 },
        columns: 3,
        expected: true,
        reason: "a three-row spiral at the four-turn floor",
        rows: 3,
      },
      {
        change: { maxMonotonicTurnLength: 8 },
        columns: 3,
        expected: true,
        reason: "a five-row spiral of eight turns",
        rows: 5,
      },
      {
        change: { forkCount: 1 },
        columns: 3,
        expected: false,
        reason: "a fork",
        rows: 4,
      },
      {
        change: { crossCount: 1 },
        columns: 3,
        expected: false,
        reason: "a cross",
        rows: 4,
      },
      {
        change: { bettiNumber1Count: 1 },
        columns: 3,
        expected: false,
        reason: "a cycle",
        rows: 4,
      },
      {
        change: { maxMonotonicTurnLength: 2 },
        columns: 3,
        expected: false,
        reason: "two rows below the four-turn floor",
        rows: 2,
      },
      {
        change: { maxMonotonicTurnLength: 5 },
        columns: 3,
        expected: false,
        reason: "one turn under two per row less two",
        rows: 4,
      },
      {
        change: { maxMonotonicTurnLength: 7 },
        columns: 3,
        expected: false,
        reason: "one turn over two per row less two",
        rows: 4,
      },
      {
        change: { maxMonotonicTurnLength: 6 },
        columns: 3,
        expected: false,
        reason: "a six-turn run on five rows",
        rows: 5,
      },
      {
        change: { tightestTurnCount: 1 },
        columns: 3,
        expected: false,
        reason: "fewer hairpins than free ends",
        rows: 4,
      },
      {
        change: { tightestTurnCount: 3 },
        columns: 3,
        expected: false,
        reason: "more hairpins than free ends",
        rows: 4,
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
