import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { NorthEdgeCountCharacteristicService } from "./north-edge-count-characteristic.service";

describe(NorthEdgeCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: NorthEdgeCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        NorthEdgeCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(NorthEdgeCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts every point with a north arm, whether it carries one, two, three, or four arms", () => {
    expect(service.compute(contextService.create("06x01y8cef70"))).toBe(4);
  });

  it("ignores points whose arms run only south, east, or west", () => {
    expect(service.compute(contextService.create("04x01y7430"))).toBe(0);
  });

  it("counts across every row of a closed rectangle", () => {
    expect(service.compute(contextService.create("04x02y6335a339"))).toBe(2);
  });
});
