import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { GraphModule } from "../../../graph/graph.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { ConnectivityService } from "../../connectivity/connectivity.service";

import { TileCrossingCountCharacteristicService } from "./tile-crossing-count-characteristic.service";

describe(TileCrossingCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: TileCrossingCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, GraphModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        ConnectivityService,
        TileCrossingCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(TileCrossingCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    { code: "02x02y65a9", expected: 0, shape: "a closed loop inside the tile" },
    {
      code: "02x02y56a9",
      expected: 1,
      shape: "a zigzag whose only loop closes across the tile boundary",
    },
    {
      code: "03x01y102",
      expected: 1,
      shape: "two stubs joined only across the tile boundary",
    },
    {
      code: "01x03y303",
      expected: 2,
      shape:
        "two rules that each close onto themselves across the tile boundary",
    },
  ])(
    "counts $expected edges crossing the tile boundary in $shape",
    ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    },
  );
});
