// Fragments of hexadecimal meander Codes used as test fixtures, not words.
// cspell:ignore fffb

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { TileCrossingCountCharacteristicService } from "../../path/tile-crossing/tile-crossing-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { CornerCountCharacteristicService } from "../../submatrix/corner/corner-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";

import { IsMeshCharacteristicService } from "./is-mesh-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsMeshCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsMeshCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsMeshCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "01x03y7fb", expected: true, shape: "a one-row grid" },
      { code: "01x04y7ffb", expected: true, shape: "a wider one-row grid" },
      { code: "01x05y7fffb", expected: true, shape: "a widest one-row grid" },
      { code: "01x02y7b", expected: false, shape: "two rows holding no cross" },
      { code: "02x05y12659a3321", expected: false, shape: "a looped meander" },
      { code: "02x05y44a965cc88", expected: false, shape: "a skewed weave" },
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
      cornerCount: 0,
      crossCount: 1,
      dotCount: 0,
      freeEndCount: 0,
      longestVerticalRunLength: 2,
      tileCrossingCount: 3,
    };
    const values = { ...base };
    let service: IsMeshCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsMeshCharacteristicService,
          {
            provide: CornerCountCharacteristicService,
            useValue: { compute: (): number => values.cornerCount },
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

      service = await module.resolve(IsMeshCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      { change: {}, expected: true, reason: "a full grid" },
      { change: { crossCount: 0 }, expected: false, reason: "no cross" },
      { change: { crossCount: 4 }, expected: true, reason: "several crosses" },
      { change: { cornerCount: 1 }, expected: false, reason: "a corner" },
      { change: { freeEndCount: 1 }, expected: false, reason: "a free end" },
      { change: { dotCount: 1 }, expected: false, reason: "a bare dot" },
      {
        change: { tileCrossingCount: 2 },
        expected: false,
        reason: "too few tile crossings",
      },
      {
        change: { tileCrossingCount: 4 },
        expected: false,
        reason: "too many tile crossings",
      },
      {
        change: { longestVerticalRunLength: 1 },
        expected: false,
        reason: "a run two short",
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
