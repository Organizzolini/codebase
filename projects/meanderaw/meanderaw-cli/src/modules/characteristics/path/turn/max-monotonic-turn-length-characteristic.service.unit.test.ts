import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { GraphModule } from "../../../graph/graph.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { ConnectivityService } from "../../connectivity/connectivity.service";
import { PathUtilitiesService } from "../path-utilities.service";

import { MaxMonotonicTurnLengthCharacteristicService } from "./max-monotonic-turn-length-characteristic.service";

describe(MaxMonotonicTurnLengthCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: MaxMonotonicTurnLengthCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, GraphModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        ConnectivityService,
        MaxMonotonicTurnLengthCharacteristicService,
        PathUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(MaxMonotonicTurnLengthCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    { code: "02x02y65a9", expected: 4, shape: "a closed unit square loop" },
    { code: "02x02y6588", expected: 2, shape: "a hairpin U-turn" },
    {
      code: "03x02y2500a1",
      expected: 1,
      shape: "a step that turns one way and then the other",
    },
    {
      code: "02x02y56a9",
      expected: 2,
      shape: "a square wave closing across the tile boundary",
    },
    {
      code: "03x02y675888",
      expected: 1,
      shape: "a fork whose two arms each bend down",
    },
    {
      code: "03x03y635c29a31",
      expected: 4,
      shape: "a spiral turning left four times",
    },
    {
      code: "03x02y650ab1",
      expected: 3,
      shape:
        "a loop hanging from a junction, which ends the strand at both sides",
    },
    {
      code: "01x03y303",
      expected: 0,
      shape: "two rules closing onto themselves across the tile boundary",
    },
    { code: "01x03y000", expected: 0, shape: "three isolated dots" },
  ])(
    "finds a longest run of $expected same-handed turns along $shape",
    ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    },
  );
});
