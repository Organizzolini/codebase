import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { RectangleUtilitiesService } from "./rectangle-utilities.service";
import { VerticalRectangleCountCharacteristicService } from "./vertical-rectangle-count-characteristic.service";

describe(VerticalRectangleCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: VerticalRectangleCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        RectangleUtilitiesService,
        SubmatrixUtilitiesService,
        VerticalRectangleCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(VerticalRectangleCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts the smallest rectangle taller than it is wide", () => {
    expect(service.compute(contextService.create("03x03y650cc0a90"))).toBe(1);
  });

  it("counts a larger rectangle taller than it is wide", () => {
    expect(
      service.compute(contextService.create("04x04y6350c0c0c0c0a390")),
    ).toBe(1);
  });

  it("counts a vertical rectangle that crosses the tile's seam", () => {
    expect(service.compute(contextService.create("03x03y506c0c90a"))).toBe(1);
  });

  it("counts nothing for squares or rectangles wider than they are tall", () => {
    expect(service.compute(contextService.create("03x02y650a90"))).toBe(0);
    expect(service.compute(contextService.create("04x02y6350a390"))).toBe(0);
  });

  it("ignores a ring that is divided or branched", () => {
    expect(service.compute(contextService.create("03x03y650ed0a90"))).toBe(0);
    expect(service.compute(contextService.create("03x03y650ce1a90"))).toBe(0);
  });
});
