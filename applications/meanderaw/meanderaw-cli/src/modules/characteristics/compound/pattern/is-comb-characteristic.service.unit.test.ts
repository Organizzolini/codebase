import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { TotalTurnCountCharacteristicService } from "../../path/turn/total-turn-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";

import { IsCombCharacteristicService } from "./is-comb-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsCombCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsCombCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsCombCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "02x05y252d2d2d29", expected: true, shape: "a four-tooth comb" },
      { code: "02x05y61e1e1e1a1", expected: true, shape: "a mirrored comb" },
      {
        code: "02x06y252d2d2d2d29",
        expected: true,
        shape: "a five-tooth comb",
      },
      { code: "01x02y4b", expected: false, shape: "a single fork" },
      { code: "01x09y337b37b33", expected: false, shape: "a crossed grid" },
      {
        code: "02x06y213356a93321",
        expected: false,
        shape: "a looped meander",
      },
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
      forkCount: 2,
      totalTurnCount: 2,
    };
    const values = { ...base };
    let service: IsCombCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsCombCharacteristicService,
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
            provide: ForkCountCharacteristicService,
            useValue: { compute: (): number => values.forkCount },
          },
          {
            provide: TotalTurnCountCharacteristicService,
            useValue: { compute: (): number => values.totalTurnCount },
          },
        ],
      }).compile();

      service = await module.resolve(IsCombCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "one acyclic tree with two forks and two turns",
      },
      { change: { forkCount: 5 }, expected: true, reason: "many forks" },
      { change: { totalTurnCount: 0 }, expected: true, reason: "no turns" },
      {
        change: { bettiNumber0Count: 0 },
        expected: false,
        reason: "no component",
      },
      {
        change: { bettiNumber0Count: 2 },
        expected: false,
        reason: "two components",
      },
      { change: { bettiNumber1Count: 1 }, expected: false, reason: "a cycle" },
      { change: { crossCount: 1 }, expected: false, reason: "a cross" },
      { change: { forkCount: 1 }, expected: false, reason: "a single fork" },
      { change: { totalTurnCount: 3 }, expected: false, reason: "three turns" },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.compute(context)).toBe(expected);
    });
  });
});
