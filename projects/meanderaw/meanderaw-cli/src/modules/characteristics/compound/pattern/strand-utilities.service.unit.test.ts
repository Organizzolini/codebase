import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { EndsOnBorderRulesCharacteristicService } from "../../path/end/ends-on-border-rules-characteristic.service";
import { TileCrossingCountCharacteristicService } from "../../path/tile-crossing/tile-crossing-count-characteristic.service";
import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { ReversesAtItsTightestTurnCharacteristicService } from "../../path/turn/reverses-at-its-tightest-turn-characteristic.service";
import { DensityCharacteristicService } from "../../submatrix/point/density-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";

import { StrandUtilitiesService } from "./strand-utilities.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(StrandUtilitiesService, () => {
  const context: CharacteristicContext = {
    code: { columns: 5, digits: "0".repeat(20), repeats: 1, rows: 4 },
    columns: 5,
    matrix: [],
    rows: 4,
  };
  const base = {
    bettiNumber0Count: 1,
    density: 1,
    dotCount: 0,
    endsOnBorderRules: false,
    freeEndCount: 2,
    reversesAtItsTightestTurn: true,
    tileCrossingCount: 0,
  };
  const values = { ...base };
  let service: StrandUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StrandUtilitiesService,
        {
          provide: BettiNumber0CountCharacteristicService,
          useValue: { compute: (): number => values.bettiNumber0Count },
        },
        {
          provide: DensityCharacteristicService,
          useValue: { compute: (): number => values.density },
        },
        {
          provide: DotCountCharacteristicService,
          useValue: { compute: (): number => values.dotCount },
        },
        {
          provide: EndsOnBorderRulesCharacteristicService,
          useValue: { compute: (): boolean => values.endsOnBorderRules },
        },
        {
          provide: FreeEndCountCharacteristicService,
          useValue: { compute: (): number => values.freeEndCount },
        },
        {
          provide: ReversesAtItsTightestTurnCharacteristicService,
          useValue: {
            compute: (): boolean => values.reversesAtItsTightestTurn,
          },
        },
        {
          provide: TileCrossingCountCharacteristicService,
          useValue: { compute: (): number => values.tileCrossingCount },
        },
      ],
    }).compile();

    service = await module.resolve(StrandUtilitiesService);
  });

  beforeEach(() => {
    Object.assign(values, base);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("hasStrandEnds", () => {
    it.each([
      { bettiNumber0Count: 1, expected: true, freeEndCount: 2, strands: 1 },
      { bettiNumber0Count: 2, expected: true, freeEndCount: 4, strands: 2 },
      { bettiNumber0Count: 4, expected: true, freeEndCount: 8, strands: 4 },
      { bettiNumber0Count: 2, expected: false, freeEndCount: 4, strands: 1 },
      { bettiNumber0Count: 1, expected: false, freeEndCount: 3, strands: 1 },
      { bettiNumber0Count: 2, expected: false, freeEndCount: 2, strands: 2 },
    ])(
      "reports $expected for $bettiNumber0Count components and $freeEndCount free ends as $strands strands",
      ({ bettiNumber0Count, expected, freeEndCount, strands }) => {
        Object.assign(values, { bettiNumber0Count, freeEndCount });

        expect(service.hasStrandEnds(context, strands)).toBe(expected);
      },
    );
  });

  describe("isFullInkWithoutDots", () => {
    it.each([
      { change: {}, expected: true, reason: "full ink and no dots" },
      { change: { density: 0.9 }, expected: false, reason: "a blank point" },
      { change: { dotCount: 1 }, expected: false, reason: "a bare dot" },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.isFullInkWithoutDots(context)).toBe(expected);
    });
  });

  describe("isWrappingReversal", () => {
    const wrapping = { tileCrossingCount: 1 };

    it.each([
      {
        change: {},
        expected: true,
        reason:
          "a reversing strand crossing the tile edge off the border rules",
      },
      {
        change: { tileCrossingCount: 3 },
        expected: true,
        reason: "several tile crossings",
      },
      {
        change: { tileCrossingCount: 0 },
        expected: false,
        reason: "no tile crossing",
      },
      {
        change: { reversesAtItsTightestTurn: false },
        expected: false,
        reason: "no reversal at the tightest turn",
      },
      {
        change: { endsOnBorderRules: true },
        expected: false,
        reason: "ends on the border rules",
      },
      { change: { density: 0.5 }, expected: false, reason: "a blank point" },
      { change: { dotCount: 2 }, expected: false, reason: "bare dots" },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, wrapping, change);

      expect(service.isWrappingReversal(context)).toBe(expected);
    });
  });
});
