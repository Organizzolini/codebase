import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { EndsOnBorderRulesCharacteristicService } from "../../path/end/ends-on-border-rules-characteristic.service";
import { TileCrossingCountCharacteristicService } from "../../path/tile-crossing/tile-crossing-count-characteristic.service";
import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { ReversesAtItsTightestTurnCharacteristicService } from "../../path/turn/reverses-at-its-tightest-turn-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { DensityCharacteristicService } from "../../submatrix/point/density-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { LongestHorizontalRunLengthCharacteristicService } from "../../submatrix/run/longest-horizontal-run-length-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

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
    bettiNumber1Count: 0,
    crossCount: 0,
    density: 1,
    dotCount: 0,
    endsOnBorderRules: false,
    forkCount: 0,
    freeEndCount: 2,
    longestHorizontalRunLength: 3,
    longestVerticalRunLength: 3,
    reversesAtItsTightestTurn: true,
    tileCrossingCount: 0,
  };
  const values = { ...base };
  let service: StrandUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CompoundUtilitiesService,
        StrandUtilitiesService,
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
          provide: ForkCountCharacteristicService,
          useValue: { compute: (): number => values.forkCount },
        },
        {
          provide: FreeEndCountCharacteristicService,
          useValue: { compute: (): number => values.freeEndCount },
        },
        {
          provide: LongestHorizontalRunLengthCharacteristicService,
          useValue: {
            compute: (): number => values.longestHorizontalRunLength,
          },
        },
        {
          provide: LongestVerticalRunLengthCharacteristicService,
          useValue: { compute: (): number => values.longestVerticalRunLength },
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

  describe("isTileBoundCoil", () => {
    it.each([
      {
        change: {},
        expected: true,
        reason: "junction-free acyclic full ink with runs of rows - 1",
      },
      { change: { forkCount: 1 }, expected: false, reason: "a fork" },
      { change: { crossCount: 1 }, expected: false, reason: "a cross" },
      { change: { bettiNumber1Count: 1 }, expected: false, reason: "a cycle" },
      {
        change: { tileCrossingCount: 1 },
        expected: false,
        reason: "a tile crossing",
      },
      { change: { density: 0.75 }, expected: false, reason: "a blank point" },
      { change: { dotCount: 1 }, expected: false, reason: "a bare dot" },
      {
        change: { longestHorizontalRunLength: 4 },
        expected: false,
        reason: "a horizontal run of rows",
      },
      {
        change: { longestVerticalRunLength: 2 },
        expected: false,
        reason: "a vertical run of rows - 2",
      },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.isTileBoundCoil(context)).toBe(expected);
    });
  });
});
