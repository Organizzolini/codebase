import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { SouthWestCornerCountCharacteristicService } from "./south-west-corner-count-characteristic.service";

describe(SouthWestCornerCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: SouthWestCornerCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        SouthWestCornerCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(SouthWestCornerCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts corners whose ink leaves by south and west only", () => {
    expect(service.compute(contextService.create("03x01y505"))).toBe(2);
  });

  it("counts nothing for the other three corner orientations", () => {
    expect(service.compute(contextService.create("03x01ya96"))).toBe(0);
  });

  it("ignores forks and crosses that carry both arms", () => {
    expect(service.compute(contextService.create("03x01y7df"))).toBe(0);
  });
});
