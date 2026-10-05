import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { IsClosedLoopCharacteristicService } from "../structure/is-closed-loop-characteristic.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { IsSnakeCharacteristicService } from "./is-snake-characteristic.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsSnakeCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsSnakeCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsSnakeCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "02x03y56cca9", expected: true, shape: "a loop two wide" },
      { code: "02x03y65cca9", expected: true, shape: "a shifted loop" },
      { code: "02x02y65a9", expected: false, shape: "a loop as wide as deep" },
      { code: "04x03y356369a5a339", expected: false, shape: "a wide loop" },
      { code: "02x03y52a529", expected: false, shape: "an open arc" },
    ])("reports $expected for $shape ($code)", ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    });
  });

  describe("with mocked characteristic services", () => {
    const base = { columns: 3, isClosedLoop: true, rows: 4 };
    const values = { ...base };
    let service: IsSnakeCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IsSnakeCharacteristicService,
          {
            provide: IsClosedLoopCharacteristicService,
            useValue: { compute: (): boolean => values.isClosedLoop },
          },
        ],
      }).compile();

      service = await module.resolve(IsSnakeCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      {
        change: {},
        expected: true,
        reason: "a closed loop at pitch rows - 1",
      },
      {
        change: { columns: 1, rows: 2 },
        expected: true,
        reason: "a closed loop one wide over two rows",
      },
      {
        change: { isClosedLoop: false },
        expected: false,
        reason: "no closed loop",
      },
      { change: { columns: 4 }, expected: false, reason: "pitch rows" },
      { change: { columns: 2 }, expected: false, reason: "pitch rows - 2" },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);
      const { columns, rows } = values;
      const context: CharacteristicContext = {
        code: { columns, digits: "0".repeat(rows * columns), repeats: 1, rows },
        columns,
        matrix: [],
        rows,
      };

      expect(service.compute(context)).toBe(expected);
    });
  });
});
