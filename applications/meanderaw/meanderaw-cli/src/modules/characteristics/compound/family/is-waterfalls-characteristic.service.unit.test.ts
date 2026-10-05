import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { EndsAreLatticeNeighborsCharacteristicService } from "../../path/end/ends-are-lattice-neighbors-characteristic.service";
import { EndsOnBorderRulesCharacteristicService } from "../../path/end/ends-on-border-rules-characteristic.service";
import { TileCrossingCountCharacteristicService } from "../../path/tile-crossing/tile-crossing-count-characteristic.service";
import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { EmbeddedUCountCharacteristicService } from "../../submatrix/embedded/embedded-u-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { IsWaterfallsCharacteristicService } from "./is-waterfalls-characteristic.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsWaterfallsCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsWaterfallsCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsWaterfallsCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "02x03y255aa1", expected: true, shape: "a three-row waterfall" },
      { code: "03x02y23531a", expected: true, shape: "a two-row waterfall" },
      { code: "04x02y2335331a", expected: true, shape: "a wide waterfall" },
      { code: "02x03y52a529", expected: false, shape: "a boxed arc" },
      { code: "04x03y35634884a339", expected: false, shape: "a double chain" },
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
      bettiNumber0Count: 1,
      bettiNumber1Count: 0,
      crossCount: 0,
      dotCount: 0,
      embeddedUCount: 0,
      endsAreLatticeNeighbors: false,
      endsOnBorderRules: true,
      forkCount: 0,
      freeEndCount: 2,
      longestVerticalRunLength: 1,
      tileCrossingCount: 1,
    };
    const values = { ...base };
    let service: IsWaterfallsCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CompoundUtilitiesService,
          IsWaterfallsCharacteristicService,
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
            provide: EmbeddedUCountCharacteristicService,
            useValue: { compute: (): number => values.embeddedUCount },
          },
          {
            provide: EndsAreLatticeNeighborsCharacteristicService,
            useValue: {
              compute: (): boolean => values.endsAreLatticeNeighbors,
            },
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
            provide: LongestVerticalRunLengthCharacteristicService,
            useValue: {
              compute: (): number => values.longestVerticalRunLength,
            },
          },
          {
            provide: TileCrossingCountCharacteristicService,
            useValue: { compute: (): number => values.tileCrossingCount },
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
        expected: true,
        reason: "one open strand stepping down across the tile edge",
      },
      {
        change: { bettiNumber0Count: 3, freeEndCount: 6 },
        expected: true,
        reason: "three open strands",
      },
      { change: { forkCount: 1 }, expected: false, reason: "a fork" },
      { change: { crossCount: 1 }, expected: false, reason: "a cross" },
      { change: { dotCount: 1 }, expected: false, reason: "a bare dot" },
      { change: { bettiNumber1Count: 1 }, expected: false, reason: "a cycle" },
      {
        change: { freeEndCount: 3 },
        expected: false,
        reason: "an odd free end",
      },
      {
        change: { tileCrossingCount: 0 },
        expected: false,
        reason: "no tile crossing",
      },
      {
        change: { endsOnBorderRules: false },
        expected: false,
        reason: "ends off the border rules",
      },
      {
        change: { endsAreLatticeNeighbors: true },
        expected: false,
        reason: "neighboring ends",
      },
      {
        change: { embeddedUCount: 1 },
        expected: false,
        reason: "an embedded U",
      },
      {
        change: { longestVerticalRunLength: 0 },
        expected: false,
        reason: "no vertical run",
      },
      {
        change: { longestVerticalRunLength: 2 },
        expected: false,
        reason: "a vertical run of two",
      },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.compute(context)).toBe(expected);
    });
  });
});
