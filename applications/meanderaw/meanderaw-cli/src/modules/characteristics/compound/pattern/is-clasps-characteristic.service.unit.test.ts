import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { EndsAreLatticeNeighborsCharacteristicService } from "../../path/end/ends-are-lattice-neighbors-characteristic.service";
import { MaxMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { ReversesAtItsTightestTurnCharacteristicService } from "../../path/turn/reverses-at-its-tightest-turn-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { LongestHorizontalRunLengthCharacteristicService } from "../../submatrix/run/longest-horizontal-run-length-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import { IsClaspsCharacteristicService } from "./is-clasps-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsClaspsCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsClaspsCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsClaspsCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "04x03y6354c48c8a39", expected: true },
      { code: "05x04y63354c61cccc29c8a339", expected: true },
      { code: "08x03y46356354c84cc48ca3988a39", expected: true },
      { code: "04x03y25654a9c8239", expected: false },
      { code: "01x09y333333333", expected: false },
      { code: "02x05y213356a921", expected: false },
    ])("reports $expected for $code", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const contextOf = (rows: number): CharacteristicContext => ({
      code: { columns: 3, digits: "0".repeat(3 * rows), repeats: 1, rows },
      columns: 3,
      matrix: [],
      rows,
    });
    const base = {
      crossCount: 0,
      endsAreLatticeNeighbors: false,
      forkCount: 0,
      longestHorizontalRunLength: 3,
      maxMonotonicTurnLength: 3,
      reversesAtItsTightestTurn: true,
    };
    const values = { ...base };
    let service: IsClaspsCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsClaspsCharacteristicService,
          CompoundUtilitiesService,
          {
            provide: CrossCountCharacteristicService,
            useValue: { compute: (): number => values.crossCount },
          },
          {
            provide: EndsAreLatticeNeighborsCharacteristicService,
            useValue: {
              compute: (): boolean => values.endsAreLatticeNeighbors,
            },
          },
          {
            provide: ForkCountCharacteristicService,
            useValue: { compute: (): number => values.forkCount },
          },
          {
            provide: LongestHorizontalRunLengthCharacteristicService,
            useValue: {
              compute: (): number => values.longestHorizontalRunLength,
            },
          },
          {
            provide: MaxMonotonicTurnLengthCharacteristicService,
            useValue: { compute: (): number => values.maxMonotonicTurnLength },
          },
          {
            provide: ReversesAtItsTightestTurnCharacteristicService,
            useValue: {
              compute: (): boolean => values.reversesAtItsTightestTurn,
            },
          },
        ],
      }).compile();

      service = await module.resolve(IsClaspsCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "a junction-free reversing hook with runs of rows - 1",
        rows: 4,
      },
      {
        change: { forkCount: 1 },
        expected: false,
        reason: "a fork",
        rows: 4,
      },
      {
        change: { crossCount: 1 },
        expected: false,
        reason: "a cross",
        rows: 4,
      },
      {
        change: { reversesAtItsTightestTurn: false },
        expected: false,
        reason: "no reversal at the tightest turn",
        rows: 4,
      },
      {
        change: { endsAreLatticeNeighbors: true },
        expected: false,
        reason: "neighboring ends",
        rows: 4,
      },
      {
        change: { longestHorizontalRunLength: 2 },
        expected: false,
        reason: "a horizontal run of rows - 2",
        rows: 4,
      },
      {
        change: { longestHorizontalRunLength: 4 },
        expected: false,
        reason: "a horizontal run of rows",
        rows: 4,
      },
      {
        change: { maxMonotonicTurnLength: 2 },
        expected: false,
        reason: "winding of rows - 2",
        rows: 4,
      },
      {
        change: { maxMonotonicTurnLength: 4 },
        expected: false,
        reason: "winding of rows",
        rows: 4,
      },
      {
        change: { longestHorizontalRunLength: 2, maxMonotonicTurnLength: 2 },
        expected: true,
        reason: "a three-row hook",
        rows: 3,
      },
      {
        change: { longestHorizontalRunLength: 1, maxMonotonicTurnLength: 1 },
        expected: false,
        reason: "a two-row hook",
        rows: 2,
      },
    ])("reports $expected for $reason", ({ change, expected, rows }) => {
      Object.assign(values, change);

      expect(service.compute(contextOf(rows))).toBe(expected);
    });
  });
});
