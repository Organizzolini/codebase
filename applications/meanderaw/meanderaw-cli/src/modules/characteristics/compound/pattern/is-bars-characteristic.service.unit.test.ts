import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { EastEdgeCountCharacteristicService } from "../../submatrix/point/east-edge-count-characteristic.service";
import { EdgeCountCharacteristicService } from "../../submatrix/point/edge-count-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";

import { IsBarsCharacteristicService } from "./is-bars-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsBarsCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsBarsCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsBarsCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "01x02y48", expected: true, shape: "two bars" },
      { code: "01x03y4c8", expected: true, shape: "three bars" },
      { code: "01x04y4cc8", expected: true, shape: "four bars" },
      { code: "02x06y56a9659a3321", expected: false, shape: "a tangled weave" },
      {
        code: "02x06y21659a56a921",
        expected: false,
        shape: "a staggered weave",
      },
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
      dotCount: 0,
      eastEdgeCount: 0,
      edgeCount: 4,
      longestVerticalRunLength: 2,
    };
    const values = { ...base };
    let service: IsBarsCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsBarsCharacteristicService,
          {
            provide: DotCountCharacteristicService,
            useValue: { compute: (): number => values.dotCount },
          },
          {
            provide: EastEdgeCountCharacteristicService,
            useValue: { compute: (): number => values.eastEdgeCount },
          },
          {
            provide: EdgeCountCharacteristicService,
            useValue: { compute: (): number => values.edgeCount },
          },
          {
            provide: LongestVerticalRunLengthCharacteristicService,
            useValue: {
              compute: (): number => values.longestVerticalRunLength,
            },
          },
        ],
      }).compile();

      service = await module.resolve(IsBarsCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      { change: {}, expected: true, reason: "full-depth vertical bars" },
      { change: { edgeCount: 1 }, expected: true, reason: "a single edge" },
      { change: { edgeCount: 0 }, expected: false, reason: "no edges" },
      { change: { eastEdgeCount: 1 }, expected: false, reason: "an east arm" },
      { change: { dotCount: 1 }, expected: false, reason: "a bare dot" },
      {
        change: { longestVerticalRunLength: 1 },
        expected: false,
        reason: "a run one short of the band",
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
