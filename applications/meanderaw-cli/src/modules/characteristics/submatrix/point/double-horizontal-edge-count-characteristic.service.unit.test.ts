import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { DoubleHorizontalEdgeCountCharacteristicService } from "./double-horizontal-edge-count-characteristic.service";

describe(DoubleHorizontalEdgeCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: DoubleHorizontalEdgeCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        DoubleHorizontalEdgeCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(
      DoubleHorizontalEdgeCountCharacteristicService,
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts points whose ink runs only east and west", () => {
    expect(service.compute(contextService.create("04x01y3303"))).toBe(3);
  });

  it("ignores forks and crosses that also run east and west", () => {
    expect(service.compute(contextService.create("04x01yb7bf"))).toBe(0);
  });

  it("ignores vertical points, corners, and bare points", () => {
    expect(service.compute(contextService.create("04x01yca60"))).toBe(0);
  });
});
