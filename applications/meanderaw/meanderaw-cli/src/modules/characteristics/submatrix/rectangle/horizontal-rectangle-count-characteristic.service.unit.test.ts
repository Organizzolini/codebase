import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { HorizontalRectangleCountCharacteristicService } from "./horizontal-rectangle-count-characteristic.service";
import { RectangleUtilitiesService } from "./rectangle-utilities.service";

describe(HorizontalRectangleCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: HorizontalRectangleCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        HorizontalRectangleCountCharacteristicService,
        RectangleUtilitiesService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(
      HorizontalRectangleCountCharacteristicService,
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts the smallest rectangle wider than it is tall", () => {
    expect(service.compute(contextService.create("04x02y6350a390"))).toBe(1);
  });

  it("counts a larger rectangle wider than it is tall", () => {
    expect(
      service.compute(contextService.create("05x03y63350c00c0a3390")),
    ).toBe(1);
  });

  it("counts a rectangle that crosses the tile's seam", () => {
    expect(service.compute(contextService.create("04x02y3506390a"))).toBe(1);
  });

  it("counts nothing for squares or rectangles taller than they are wide", () => {
    expect(service.compute(contextService.create("03x02y650a90"))).toBe(0);
    expect(service.compute(contextService.create("03x03y650cc0a90"))).toBe(0);
  });

  it("ignores a ring that is divided or branched", () => {
    expect(service.compute(contextService.create("04x02y6750ab90"))).toBe(0);
    expect(service.compute(contextService.create("05x02y63710a3900"))).toBe(0);
  });
});
