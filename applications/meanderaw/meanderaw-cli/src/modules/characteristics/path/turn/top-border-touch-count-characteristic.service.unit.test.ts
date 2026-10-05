import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { GraphModule } from "../../../graph/graph.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { ConnectivityService } from "../../connectivity/connectivity.service";
import { PathUtilitiesService } from "../path-utilities.service";

import { TopBorderTouchCountCharacteristicService } from "./top-border-touch-count-characteristic.service";

describe(TopBorderTouchCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: TopBorderTouchCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, GraphModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        ConnectivityService,
        PathUtilitiesService,
        TopBorderTouchCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(TopBorderTouchCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    { code: "02x02y65a9", expected: 1, shape: "a closed unit square loop" },
    { code: "02x02y6588", expected: 1, shape: "a U hanging from the top row" },
    {
      code: "02x02y44a9",
      expected: 2,
      shape: "an inverted U standing on the bottom row",
    },
    {
      code: "02x02y56a9",
      expected: 1,
      shape: "a square wave closing across the tile boundary",
    },
    {
      code: "03x02y675888",
      expected: 1,
      shape: "a fork whose two arms each bend down",
    },
    {
      code: "01x03y303",
      expected: 1,
      shape: "two rules closing onto themselves across the tile boundary",
    },
    { code: "03x01y231", expected: 1, shape: "a single-row path" },
    { code: "01x03y000", expected: 0, shape: "three isolated dots" },
  ])(
    "counts $expected touches of the top border in $shape",
    ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    },
  );
});
