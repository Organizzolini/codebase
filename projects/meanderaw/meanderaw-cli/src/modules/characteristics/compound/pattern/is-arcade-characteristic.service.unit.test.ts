// Fragments of hexadecimal meander Codes used as test fixtures, not words.
// cspell:ignore ccccccbb ccccccccbbb ccccccccccccbb

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";

import { IsArcadeCharacteristicService } from "./is-arcade-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsArcadeCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsArcadeCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsArcadeCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      {
        code: "06x03y446775ccccccbb988a",
        expected: true,
        shape: "a three-column arcade",
      },
      {
        code: "06x04y446775ccccccccccccbb988a",
        expected: true,
        shape: "a four-column arcade",
      },
      {
        code: "08x03y44467775ccccccccbbb9888a",
        expected: true,
        shape: "a tall arcade",
      },
      { code: "02x03y56cca9", expected: false, shape: "a small loop" },
      { code: "02x01y21", expected: false, shape: "a single vertical" },
      { code: "02x05y3333333321", expected: false, shape: "a hooked line" },
    ])("reports $expected for $shape ($code)", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const context: CharacteristicContext = {
      code: { columns: 3, digits: "000000", repeats: 1, rows: 3 },
      columns: 3,
      matrix: [],
      rows: 3,
    };
    const base = {
      bettiNumber1Count: 1,
      crossCount: 0,
      dotCount: 0,
      forkCount: 2,
      freeEndCount: 2,
      longestVerticalRunLength: 2,
    };
    const values = { ...base };
    let service: IsArcadeCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsArcadeCharacteristicService,
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
            provide: LongestVerticalRunLengthCharacteristicService,
            useValue: {
              compute: (): number => values.longestVerticalRunLength,
            },
          },
        ],
      }).compile();

      service = await module.resolve(IsArcadeCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "looped rails with one tooth per fork",
      },
      {
        change: { forkCount: 3, freeEndCount: 3 },
        expected: true,
        reason: "three forks and three free ends",
      },
      {
        change: { bettiNumber1Count: 3 },
        expected: true,
        reason: "several loops",
      },
      { change: { crossCount: 1 }, expected: false, reason: "a cross" },
      { change: { dotCount: 1 }, expected: false, reason: "a bare dot" },
      {
        change: { forkCount: 1, freeEndCount: 1 },
        expected: false,
        reason: "a single fork",
      },
      {
        change: { freeEndCount: 3 },
        expected: false,
        reason: "more free ends than forks",
      },
      {
        change: { freeEndCount: 1 },
        expected: false,
        reason: "fewer free ends than forks",
      },
      { change: { bettiNumber1Count: 0 }, expected: false, reason: "no loop" },
      {
        change: { longestVerticalRunLength: 1 },
        expected: false,
        reason: "a run one short",
      },
      {
        change: { longestVerticalRunLength: 3 },
        expected: false,
        reason: "a run past the band",
      },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.compute(context)).toBe(expected);
    });
  });
});
