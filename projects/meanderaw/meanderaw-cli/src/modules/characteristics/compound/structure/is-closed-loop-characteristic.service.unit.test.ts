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

import { IsClosedLoopCharacteristicService } from "./is-closed-loop-characteristic.service";
import { StructureCharacteristicsModule } from "./structure-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsClosedLoopCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsClosedLoopCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, MatrixModule, StructureCharacteristicsModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsClosedLoopCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "02x03y56cca9", expected: true, shape: "an arcade loop" },
      { code: "02x02y65a9", expected: true, shape: "an O shape" },
      { code: "01x02y48", expected: false, shape: "an open bar" },
      { code: "02x02y77bb", expected: false, shape: "a mesh" },
    ])("reports $expected for $shape", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const context: CharacteristicContext = {
      code: { columns: 1, digits: "0", repeats: 1, rows: 1 },
      columns: 1,
      matrix: [[{ east: false, north: false, south: false, west: false }]],
      rows: 1,
    };
    const loop = {
      bettiNumber0Count: 1,
      bettiNumber1Count: 1,
      crossCount: 0,
      forkCount: 0,
      freeEndCount: 0,
    };
    const counts = { ...loop };
    let service: IsClosedLoopCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CompoundUtilitiesService,
          IsClosedLoopCharacteristicService,
          {
            provide: BettiNumber0CountCharacteristicService,
            useValue: { compute: (): number => counts.bettiNumber0Count },
          },
          {
            provide: BettiNumber1CountCharacteristicService,
            useValue: { compute: (): number => counts.bettiNumber1Count },
          },
          {
            provide: CrossCountCharacteristicService,
            useValue: { compute: (): number => counts.crossCount },
          },
          {
            provide: ForkCountCharacteristicService,
            useValue: { compute: (): number => counts.forkCount },
          },
          {
            provide: FreeEndCountCharacteristicService,
            useValue: { compute: (): number => counts.freeEndCount },
          },
        ],
      }).compile();

      service = await module.resolve(IsClosedLoopCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(counts, loop);
    });

    it.each([
      { change: {}, expected: true, reason: "one junction-free closed loop" },
      {
        change: { bettiNumber0Count: 2 },
        expected: false,
        reason: "two components",
      },
      {
        change: { bettiNumber1Count: 2 },
        expected: false,
        reason: "two cycles",
      },
      { change: { freeEndCount: 2 }, expected: false, reason: "two free ends" },
      { change: { forkCount: 2 }, expected: false, reason: "forks" },
      { change: { crossCount: 1 }, expected: false, reason: "a cross" },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(counts, change);

      expect(service.compute(context)).toBe(expected);
    });
  });
});
