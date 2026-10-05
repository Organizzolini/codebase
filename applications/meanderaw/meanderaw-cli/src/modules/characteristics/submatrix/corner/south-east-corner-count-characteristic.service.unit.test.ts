import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { SouthEastCornerCountCharacteristicService } from "./south-east-corner-count-characteristic.service";

describe(SouthEastCornerCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: SouthEastCornerCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        SouthEastCornerCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(SouthEastCornerCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts corners whose ink leaves by south and east only", () => {
    expect(service.compute(contextService.create("03x01y606"))).toBe(2);
  });

  it("counts nothing for the other three corner orientations", () => {
    expect(service.compute(contextService.create("03x01ya95"))).toBe(0);
  });

  it("ignores forks and crosses that carry both arms", () => {
    expect(service.compute(contextService.create("03x01y7ef"))).toBe(0);
  });
});
