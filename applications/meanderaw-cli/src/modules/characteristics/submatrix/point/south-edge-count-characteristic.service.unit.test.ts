import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { SouthEdgeCountCharacteristicService } from "./south-edge-count-characteristic.service";

describe(SouthEdgeCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: SouthEdgeCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        SouthEdgeCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(SouthEdgeCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts every point with a south arm, whether it carries one, two, three, or four arms", () => {
    expect(service.compute(contextService.create("06x01y4cdf8b"))).toBe(4);
  });

  it("ignores points whose arms run only north, east, or west", () => {
    expect(service.compute(contextService.create("04x01yb832"))).toBe(0);
  });

  it("counts across every row of a closed rectangle", () => {
    expect(service.compute(contextService.create("04x02y6335a339"))).toBe(2);
  });
});
