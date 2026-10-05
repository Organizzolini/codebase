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
import { CompoundUtilitiesService } from "../compound-utilities.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { IsParallelCharacteristicService } from "./is-parallel-characteristic.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsParallelCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsParallelCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsParallelCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "02x02y1221", expected: true },
      { code: "04x02y444488a9", expected: true },
      { code: "04x02y25442988", expected: true },
      { code: "03x02y4448a9", expected: false },
      { code: "02x01y21", expected: false },
      { code: "01x02y48", expected: false },
    ])("reports $expected for $code", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const context: CharacteristicContext = {
      code: { columns: 4, digits: "0000", repeats: 1, rows: 1 },
      columns: 4,
      matrix: [],
      rows: 1,
    };
    const base = {
      bettiNumber0Count: 3,
      bettiNumber1Count: 0,
      crossCount: 0,
      forkCount: 0,
      freeEndCount: 6,
    };
    const values = { ...base };
    let service: IsParallelCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CompoundUtilitiesService,
          IsParallelCharacteristicService,
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
            provide: FreeEndCountCharacteristicService,
            useValue: { compute: (): number => values.freeEndCount },
          },
        ],
      }).compile();

      service = await module.resolve(IsParallelCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "three open strands at pitch four",
      },
      {
        change: { bettiNumber0Count: 2, freeEndCount: 4 },
        expected: false,
        reason: "two strands at pitch four",
      },
      {
        change: { freeEndCount: 4 },
        expected: false,
        reason: "too few free ends",
      },
      { change: { bettiNumber1Count: 1 }, expected: false, reason: "a cycle" },
      { change: { forkCount: 1 }, expected: false, reason: "a fork" },
      { change: { crossCount: 1 }, expected: false, reason: "a cross" },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.compute(context)).toBe(expected);
    });
  });
});
