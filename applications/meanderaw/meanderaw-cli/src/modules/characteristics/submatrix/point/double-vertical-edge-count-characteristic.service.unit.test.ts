import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { DoubleVerticalEdgeCountCharacteristicService } from "./double-vertical-edge-count-characteristic.service";

describe(DoubleVerticalEdgeCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: DoubleVerticalEdgeCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        SubmatrixUtilitiesService,
        DoubleVerticalEdgeCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(
      DoubleVerticalEdgeCountCharacteristicService,
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts points whose ink runs only north and south", () => {
    expect(service.compute(contextService.create("01x03ycc0"))).toBe(2);
  });

  it("ignores forks and crosses that also run north and south", () => {
    expect(service.compute(contextService.create("04x01yc0de"))).toBe(1);
  });

  it("ignores horizontal points, corners, and bare points", () => {
    expect(service.compute(contextService.create("04x01y3a50"))).toBe(0);
  });
});
