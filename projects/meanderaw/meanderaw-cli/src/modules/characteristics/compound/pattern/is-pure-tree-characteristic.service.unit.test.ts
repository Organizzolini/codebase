import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";

import { IsArcadeCharacteristicService } from "./is-arcade-characteristic.service";
import { IsCombCharacteristicService } from "./is-comb-characteristic.service";
import { IsPureTreeCharacteristicService } from "./is-pure-tree-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsPureTreeCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsPureTreeCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsPureTreeCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "02x05y255ec8e192", expected: true },
      { code: "02x05y44ad5ad2a1", expected: true },
      { code: "02x05y658c2d1e29", expected: true },
      { code: "03x03y444edc8a9", expected: false },
      { code: "02x03y44ed88", expected: false },
      { code: "02x04y44ad6d88", expected: false },
      { code: "02x03y44ad29", expected: false },
      { code: "03x03y0654ccb9a", expected: false },
    ])("reports $expected for $code", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const context: CharacteristicContext = {
      code: { columns: 1, digits: "0", repeats: 1, rows: 1 },
      columns: 1,
      matrix: [],
      rows: 1,
    };
    const base = {
      bettiNumber0Count: 1,
      bettiNumber1Count: 0,
      crossCount: 0,
      dotCount: 0,
      forkCount: 2,
      isArcade: false,
      isComb: false,
    };
    const values = { ...base };
    let service: IsPureTreeCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsPureTreeCharacteristicService,
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
            provide: ForkCountCharacteristicService,
            useValue: { compute: (): number => values.forkCount },
          },
          {
            provide: IsArcadeCharacteristicService,
            useValue: { compute: (): boolean => values.isArcade },
          },
          {
            provide: IsCombCharacteristicService,
            useValue: { compute: (): boolean => values.isComb },
          },
        ],
      }).compile();

      service = await module.resolve(IsPureTreeCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "one connected acyclic tree with two forks",
      },
      { change: { forkCount: 5 }, expected: true, reason: "five forks" },
      { change: { forkCount: 1 }, expected: false, reason: "a single fork" },
      {
        change: { bettiNumber0Count: 2 },
        expected: false,
        reason: "two components",
      },
      { change: { bettiNumber1Count: 1 }, expected: false, reason: "a cycle" },
      { change: { crossCount: 1 }, expected: false, reason: "a cross" },
      { change: { dotCount: 1 }, expected: false, reason: "a bare dot" },
      { change: { isComb: true }, expected: false, reason: "a comb" },
      { change: { isArcade: true }, expected: false, reason: "an arcade" },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.compute(context)).toBe(expected);
    });
  });
});
