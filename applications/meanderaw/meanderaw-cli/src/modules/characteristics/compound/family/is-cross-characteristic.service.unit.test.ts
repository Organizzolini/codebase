import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";

import { FamilyCharacteristicsModule } from "./family-characteristics.module";
import { IsCrossCharacteristicService } from "./is-cross-characteristic.service";
import { IsMeshCharacteristicService } from "./is-mesh-characteristic.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(IsCrossCharacteristicService, () => {
  describe("with the real characteristic services", () => {
    let contextService: CharacteristicContextService;
    let service: IsCrossCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, FamilyCharacteristicsModule, MatrixModule],
        providers: [CharacteristicContextService],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(IsCrossCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it.each([
      { code: "01x06y0004f8", expected: true },
      { code: "01x06y004cf8", expected: true },
      { code: "01x03y7fb", expected: false },
      { code: "02x02y4488", expected: false },
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
    const base = { crossCount: 1, isMesh: false };
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
            provide: IsMeshCharacteristicService,
            useValue: { compute: (): boolean => values.isMesh },
          },
        ],
      }).compile();

      service = await module.resolve(IsCrossCharacteristicService);
    });

    beforeEach(() => {
      Object.assign(values, base);
    });

    it.each([
      { change: {}, expected: true, reason: "a cross outside a mesh" },
      { change: { crossCount: 0 }, expected: false, reason: "no cross" },
      { change: { isMesh: true }, expected: false, reason: "a mesh" },
    ])("reports $expected for $reason", ({ change, expected }) => {
      Object.assign(values, change);

      expect(service.compute(context)).toBe(expected);
    });
  });
});
