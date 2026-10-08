// Fragments of hexadecimal meander Codes used as test fixtures, not words.
// cspell:ignore ccccffcccca ccffcca ccffcccca

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";

import { IsCrossCharacteristicService } from "./is-cross-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsCrossCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsCrossCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsCrossCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      {
        code: "02x05y56ccffcca9",
        expected: true,
        shape: "a small lattice of crossings",
      },
      { code: "02x06y56ccffcccca9", expected: true, shape: "a wider lattice" },
      {
        code: "02x07y56ccccffcccca9",
        expected: true,
        shape: "a widest lattice",
      },
      {
        code: "01x06y307f83",
        expected: false,
        shape: "a fork with loose ends",
      },
      {
        code: "02x05y56a9333333",
        expected: false,
        shape: "a crossing-free band",
      },
      { code: "02x05y33659a3321", expected: false, shape: "a looped meander" },
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
      crossCount: 1,
      dotCount: 0,
      forkCount: 0,
      freeEndCount: 0,
    };
    const values = { ...base };
    let service: IsCrossCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsCrossCharacteristicService,
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
        ],
      }).compile();

      service = await module.resolve(IsCrossCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      { change: {}, expected: true, reason: "one cross and nothing loose" },
      { change: { crossCount: 0 }, expected: false, reason: "no cross" },
      { change: { forkCount: 1 }, expected: false, reason: "a fork" },
      { change: { freeEndCount: 1 }, expected: false, reason: "a free end" },
      { change: { dotCount: 1 }, expected: false, reason: "a bare dot" },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.compute(context)).toBe(expected);
    });
  });
});
