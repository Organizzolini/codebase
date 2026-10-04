import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { GraphModule } from "../../../graph/graph.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { ConnectivityService } from "../../connectivity/connectivity.service";

import { FreeEndCountCharacteristicService } from "./free-end-count-characteristic.service";

describe(FreeEndCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: FreeEndCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, GraphModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        ConnectivityService,
        FreeEndCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(FreeEndCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    { code: "02x02y65a9", expected: 0, shape: "a closed unit square loop" },
    { code: "03x01y231", expected: 2, shape: "an open path" },
    { code: "03x02y2712b1", expected: 4, shape: "a branching tree" },
    { code: "01x03y000", expected: 0, shape: "three isolated dots" },
    {
      code: "01x01y3",
      expected: 0,
      shape: "a single point whose ink leaves east and returns from the west",
    },
  ])("counts $expected terminating points in $shape", ({ code, expected }) => {
    expect(service.compute(contextService.create(code))).toBe(expected);
  });
});
