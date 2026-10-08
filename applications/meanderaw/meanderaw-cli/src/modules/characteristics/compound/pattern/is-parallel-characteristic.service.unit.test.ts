import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { MaxMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { EdgeCountCharacteristicService } from "../../submatrix/point/edge-count-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import { IsParallelCharacteristicService } from "./is-parallel-characteristic.service";
import { PatternCharacteristicsModule } from "./pattern-characteristics.module";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsParallelCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsParallelCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, PatternCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsParallelCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "02x05y1233659a21", expected: true },
      { code: "02x05y1256a96588", expected: true },
      { code: "02x05y1256cca921", expected: true },
      { code: "02x01y21", expected: false },
      { code: "01x09y337b37b33", expected: false },
      { code: "01x11y37b7b7b7b7b", expected: false },
    ])("reports $expected for $code", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const makeContext = (
      rows: number,
      columns: number,
    ): CharacteristicContext => ({
      code: { columns, digits: "000000", repeats: 1, rows },
      columns,
      matrix: [],
      rows,
    });
    const base = {
      crossCount: 0,
      dotCount: 0,
      edgeCount: 4,
      forkCount: 0,
      maxMonotonicTurnLength: 2,
    };
    const values = { ...base };
    let service: IsParallelCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CompoundUtilitiesService,
          IsParallelCharacteristicService,
          {
            provide: CrossCountCharacteristicService,
            useValue: { compute: (): number => values.crossCount },
          },
          {
            provide: DotCountCharacteristicService,
            useValue: { compute: (): number => values.dotCount },
          },
          {
            provide: EdgeCountCharacteristicService,
            useValue: { compute: (): number => values.edgeCount },
          },
          {
            provide: ForkCountCharacteristicService,
            useValue: { compute: (): number => values.forkCount },
          },
          {
            provide: MaxMonotonicTurnLengthCharacteristicService,
            useValue: { compute: (): number => values.maxMonotonicTurnLength },
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
        columns: 3,
        expected: true,
        reason: "junction-free dot-free ink with a turn run of two",
        rows: 2,
      },
      {
        change: {},
        columns: 6,
        expected: true,
        reason: "the same reading on a taller band",
        rows: 4,
      },
      {
        change: { forkCount: 1 },
        columns: 3,
        expected: false,
        reason: "a fork",
        rows: 2,
      },
      {
        change: { crossCount: 1 },
        columns: 3,
        expected: false,
        reason: "a cross",
        rows: 2,
      },
      {
        change: { dotCount: 1 },
        columns: 3,
        expected: false,
        reason: "a bare dot",
        rows: 2,
      },
      {
        change: { edgeCount: 0 },
        columns: 3,
        expected: false,
        reason: "no edges",
        rows: 2,
      },
      {
        change: { edgeCount: 1 },
        columns: 3,
        expected: true,
        reason: "a single edge",
        rows: 2,
      },
      {
        change: { maxMonotonicTurnLength: 1 },
        columns: 3,
        expected: false,
        reason: "a turn run of one",
        rows: 2,
      },
      {
        change: { maxMonotonicTurnLength: 3 },
        columns: 3,
        expected: false,
        reason: "a turn run of three",
        rows: 2,
      },
    ])(
      "reports $expected for $reason",
      ({ change, columns, expected, rows }) => {
        Object.assign(values, change);

        expect(service.compute(makeContext(rows, columns))).toBe(expected);
      },
    );
  });
});
