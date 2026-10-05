import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { EastForkCountCharacteristicService } from "./east-fork-count-characteristic.service";
import { ForkCountCharacteristicService } from "./fork-count-characteristic.service";
import { NorthForkCountCharacteristicService } from "./north-fork-count-characteristic.service";
import { SouthForkCountCharacteristicService } from "./south-fork-count-characteristic.service";
import { WestForkCountCharacteristicService } from "./west-fork-count-characteristic.service";

import type { CharacteristicContext } from "../../characteristics.types";

describe(ForkCountCharacteristicService, () => {
  describe("with the real directional fork services", () => {
    let contextService: CharacteristicContextService;
    let service: ForkCountCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [CodeModule, MatrixModule],
        providers: [
          CharacteristicContextService,
          SubmatrixUtilitiesService,
          ForkCountCharacteristicService,
          NorthForkCountCharacteristicService,
          SouthForkCountCharacteristicService,
          EastForkCountCharacteristicService,
          WestForkCountCharacteristicService,
        ],
      }).compile();

      contextService = await module.resolve(CharacteristicContextService);
      service = await module.resolve(ForkCountCharacteristicService);
    });

    it("is defined", () => {
      expect(service).toBeDefined();
    });

    it("counts every fork orientation", () => {
      expect(service.compute(contextService.create("05x01yb7ed0"))).toBe(4);
    });

    it("ignores straight edges, corners, crosses, and bare points", () => {
      expect(service.compute(contextService.create("05x01y3caf0"))).toBe(0);
    });
  });

  describe("with mocked directional fork services", () => {
    const context: CharacteristicContext = {
      code: { columns: 1, digits: "0", repeats: 1, rows: 1 },
      columns: 1,
      matrix: [[{ east: false, north: false, south: false, west: false }]],
      rows: 1,
    };
    let service: ForkCountCharacteristicService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ForkCountCharacteristicService,
          {
            provide: NorthForkCountCharacteristicService,
            useValue: { compute: (): number => 1 },
          },
          {
            provide: SouthForkCountCharacteristicService,
            useValue: { compute: (): number => 2 },
          },
          {
            provide: EastForkCountCharacteristicService,
            useValue: { compute: (): number => 4 },
          },
          {
            provide: WestForkCountCharacteristicService,
            useValue: { compute: (): number => 8 },
          },
        ],
      }).compile();

      service = await module.resolve(ForkCountCharacteristicService);
    });

    it("sums the four directional fork counts", () => {
      expect(service.compute(context)).toBe(15);
    });
  });
});
