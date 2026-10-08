import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { NorthWestCornerCountCharacteristicService } from "./north-west-corner-count-characteristic.service";

describe(NorthWestCornerCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: NorthWestCornerCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        NorthWestCornerCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(NorthWestCornerCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts corners whose ink leaves by north and west only", () => {
    expect(service.compute(contextService.create("03x01y909"))).toBe(2);
  });

  it("counts nothing for the other three corner orientations", () => {
    expect(service.compute(contextService.create("03x01ya65"))).toBe(0);
  });

  it("ignores forks and crosses that carry both arms", () => {
    expect(service.compute(contextService.create("04x01yb3fd"))).toBe(0);
  });
});
