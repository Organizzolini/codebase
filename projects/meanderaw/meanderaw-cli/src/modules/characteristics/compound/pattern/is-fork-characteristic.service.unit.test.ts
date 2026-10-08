import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";

import { IsCombCharacteristicService } from "./is-comb-characteristic.service";
import { IsForkCharacteristicService } from "./is-fork-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsForkCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsForkCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsForkCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "02x03y44ad29", expected: true },
      { code: "02x03y44ad1a", expected: true },
      { code: "02x04y44ad4ca9", expected: true },
      { code: "03x03y444edc8a9", expected: false },
      { code: "01x02y4b", expected: false },
      { code: "01x02y48", expected: false },
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
      forkCount: 1,
      freeEndCount: 3,
      isComb: false,
    };
    const values = { ...base };
    let service: IsForkCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsForkCharacteristicService,
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
            provide: FreeEndCountCharacteristicService,
            useValue: { compute: (): number => values.freeEndCount },
          },
          {
            provide: IsCombCharacteristicService,
            useValue: { compute: (): boolean => values.isComb },
          },
        ],
      }).compile();

      service = await module.resolve(IsForkCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "one connected acyclic fork with three free ends",
      },
      {
        change: { bettiNumber0Count: 2 },
        expected: false,
        reason: "two components",
      },
      { change: { bettiNumber1Count: 1 }, expected: false, reason: "a cycle" },
      { change: { forkCount: 2 }, expected: false, reason: "two forks" },
      { change: { forkCount: 0 }, expected: false, reason: "no fork" },
      { change: { crossCount: 1 }, expected: false, reason: "a cross" },
      { change: { freeEndCount: 2 }, expected: false, reason: "two free ends" },
      { change: { dotCount: 1 }, expected: false, reason: "a bare dot" },
      { change: { isComb: true }, expected: false, reason: "a comb" },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.compute(context)).toBe(expected);
    });
  });
});
