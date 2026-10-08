import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { NorthForkCountCharacteristicService } from "./north-fork-count-characteristic.service";

describe(NorthForkCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: NorthForkCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        NorthForkCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(NorthForkCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts forks whose ink leaves by north, east, and west only", () => {
    expect(service.compute(contextService.create("05x01yb0b30"))).toBe(2);
  });

  it("counts nothing for the other three fork orientations or a cross", () => {
    expect(service.compute(contextService.create("04x01y7edf"))).toBe(0);
  });
});
